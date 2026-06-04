import type { AppState, AppAction } from '../store/useStore';
import { appReducer } from '../store/useStore';
import type { PlanConstraint, Activity, Restaurant, Plan, PlanItem, CouponMatch } from '../types';
import { parseIntent, generateRecommendation, generateReply, chatWithTools, type ChatWithToolsMessage } from './llm';
import { composePlan, buildPartialPlan, type ComposeResult } from './planner';
import { searchActivities, searchRestaurants } from './search';
import { checkWeather, shouldTriggerAddon, addonOptions, type AddonOption } from './addon';
import { matchCoupons, findCheaperAlternatives } from '../data/coupons';
import { getTravelTime } from '../data/restaurants';
import { searchPinChang, pinChangToActivity, type PinChangSession } from '../data/pinchang';

// ---- Types ----

export interface ToolCallResult {
  stateChanges: AppAction[];
  replyContext?: {
    event: string;
    data: Record<string, unknown>;
  };
  continue: boolean;
}

interface ToolParam {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
}

interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParam;
  };
}

let msgIdCounter = 1000;
function nextMsgId() { return `agent-${++msgIdCounter}`; }

export function makeMsg(text: string, role: 'user' | 'agent'): { id: string; role: string; text: string; timestamp: number } {
  return { id: nextMsgId(), role, text, timestamp: Date.now() };
}

// ---- Tool Definitions (what the LLM sees) ----

export const TOOL_DEFS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'parseUserIntent',
      description: `【仅首次使用】解析用户第一句话，提取场景、人数、时间等结构化约束。
★重要：这个工具只能用一次！如果约束里已有场景（scenario），后续补充时间/人数/预算等信息请用 updateConstraints。`,
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '用户原始输入' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommendCategories',
      description: `根据用户画像推荐活动或餐厅分类。如果用户说了具体的活动类型（如"密室""剧本杀"），会自动搜出对应商户直接展示。
使用时机：解析完需求后、用户说"有什么好玩的/好吃的"、用户想换方向时。
mode参数：用户选"完整安排/一条龙"→传"full_plan"（自动选最优并继续）；用户选"先看看/推荐"→传"browse"（展示分类等用户选）`,
      parameters: {
        type: 'object',
        properties: {
          categoryType: { type: 'string', enum: ['activity', 'restaurant'], description: '推荐活动还是餐厅' },
          mode: { type: 'string', enum: ['full_plan', 'browse'], description: '完整安排还是浏览推荐' },
        },
        required: ['categoryType', 'mode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchCategory',
      description: `搜索某个具体分类下的商户列表。用户点了分类按钮或说想看某类商户时调用。`,
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '分类名，如"密室逃脱""火锅""手工DIY"' },
          merchantType: { type: 'string', enum: ['activity', 'restaurant'] },
        },
        required: ['category', 'merchantType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addMerchant',
      description: `确认用户选中的商户，加入行程。会根据当前时间线自动判断下一步：时间够→提议再加活动，刚好→推进到餐厅，不够→直接完成。
使用时机：用户确认选择某个具体商户时。`,
      parameters: {
        type: 'object',
        properties: {
          merchantId: { type: 'string', description: '商户ID' },
          merchantType: { type: 'string', enum: ['activity', 'restaurant'] },
        },
        required: ['merchantId', 'merchantType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rebuildPlan',
      description: `重建完整行程。用当前选中的所有活动和餐厅重新计算时间线、路程、优惠券、比价。
使用时机：约束变更后（时间/预算/人数变了）、用户说"够了/去吃饭/先这样/不用了"想推进到下一步时。`,
      parameters: {
        type: 'object',
        properties: {
          skipRestaurant: { type: 'boolean', description: '是否跳过餐厅直接完成' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateConstraints',
      description: `更新规划约束。只传用户要改的字段，其他保持不变。
使用时机：用户提供新信息（"3个人""下午3点""预算100""不吃辣"）时。`,
      parameters: {
        type: 'object',
        properties: {
          patch: {
            type: 'object',
            description: '只包含用户要改的字段',
            properties: {
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              budget: { type: 'number' },
              peopleCount: { type: 'number' },
              dietConstraints: { type: 'array', items: { type: 'string' } },
              occasion: { type: 'string' },
              activityHint: { type: 'string' },
            },
          },
        },
        required: ['patch'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resetSelections',
      description: `清空选择。scope="all"全清、scope="activities"只清活动、scope="restaurant"只清餐厅。
使用时机：用户说"重新来""全换""换餐厅""换活动方向"。`,
      parameters: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['all', 'activities', 'restaurant'] },
        },
        required: ['scope'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkAddons',
      description: `查天气并判断是否有闪送/鲜花/零食推荐。仅行程完成后调用。
使用时机：rebuildPlan 或 addMerchant 产生了完整行程之后。`,
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: '位置，如"朝阳区·望京"' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchPinChang',
      description: `搜索美团拼场——组队参加飞盘、徒步、密室、剧本杀、匹克球、骑行等。每个拼场显示已有几人、满几人、时间档位。
使用时机：用户搜完活动分类后，如果分类里有飞盘/徒步/密室/剧本杀/匹克球/羽毛球/骑行/攀岩，或用户是solo想找搭子，可以调这个推荐拼场。
★重要：拼场适合想社交、找搭子、solo出行的用户，也可以作为普通活动的替代方案★`,
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '活动分类，如"飞盘""密室""徒步"，不传则返回所有拼场' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finalizePlan',
      description: `完成规划，切换到行程时间线视图。
使用时机：行程完整（至少有1个活动）且用户已确认，或时间不够自动结束。`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

// ---- System Prompt ----

const AGENT_SYSTEM = `你是美团小袋，一个帮北京用户规划周末活动的搭子。你说话随和、口语化，像朋友聊天不是客服。你通过调用工具来完成工作——不要只描述你打算做什么，直接调用工具做。

## 人格
- 自然口语，1-3句话，带关键数字（价格、时间、数量）
- "约会日要好好安排～""带孩子出去放放电""帮你找到了几家，左右滑着看——"
- 别说什么"好的我先解析一下你的需求"——直接干活
- 别说什么"收到""明白""好的"作为开头——太机械了
- ★★禁止内心独白★★ 绝对不能说："让我看看""时间有了""人数也有了""信息齐了""检查一下""当前状态""我看到约束里"——这些是系统的内部推理，用户不需要听！直接说结果，不要播报你的分析过程
- 绝对不能声称已完成交易（下单、购票、订座、支付）

## 加入一个局（快速通道）

用户从首页"加入一个局"入口进来，说"我想加入拼场XXX"：
1. 不要调 parseUserIntent！用户已经选了具体的局
2. 直接调 searchPinChang 找到这个拼场
3. 问用户时间和人数（如果还没说）
4. 确认后直接用 addMerchant 加入，不需要走完整规划流程
5. 回复时强调："这个局目前X/Y人，你加入后就是X+1人了，人均更便宜"

## 三阶段流程

### 阶段一：收集信息（必须全部齐全才能进入下一阶段）

1. 用户首次描述需求 → ★必须调用 parseUserIntent★。
2. parseUserIntent 返回后看 tool result：
   - missingTime=true 或 missingPeople=true → ★追问缺失信息★，不要提分叉、不要提推荐。问完就停，等用户回答
   - continue=true（时间+人数都齐了）→ 还差预算可以不问直接进入阶段二
3. 用户回答追问 → ★调用 updateConstraints★（不是 parseUserIntent！）。updateConstraints 返回后重新检查：时间和人数都齐了吗？
   - 没齐 → 继续追问缺失项
   - 齐了 → 进入阶段二

★阶段一铁律：
- 没提过"完整安排/一条龙/先看看推荐"之前，绝对不能自己先提！
- 缺什么问什么，一次只追问缺失的信息
- 情侣(couples)默认2人，人数不缺失，不用问！
- 检查状态：约束里已有的信息别再问

### 阶段二：分叉选择（信息齐全后，只问一次）

4. 时间+人数齐全后 → 文字回复问：「想让我帮你完整安排一趟（活动+吃饭一条龙），还是先看看某类推荐？」★不要调工具★
5. ★用户回答分叉选择后★ → 不要再说话、不要再追问、不要再确认信息！直接调工具：
   - 完整安排/一条龙/安排 → recommendCategories(categoryType="activity", mode="full_plan")
   - 先看看/有什么好玩的/推荐/看看活动 → recommendCategories(categoryType="activity", mode="browse")
   - 先看吃的/推荐餐厅 → recommendCategories(categoryType="restaurant", mode="browse")
   ★模式说明：full_plan=自动选最优活动→自动推进到餐厅→自动成单，不打断用户。browse=展示分类让用户挑★
   ★注意：用户说"完整安排"不是新需求，是分叉回答！不要调 parseUserIntent！不要调 updateConstraints！直接调 recommendCategories！

### 阶段三：执行

**full_plan 模式 — 两步到位：**
6. 活动 auto-pick 返回 → 调 recommendCategories(categoryType="restaurant", mode="full_plan")
7. 餐厅返回 plan_ready → ★只回一条消息★：「安排好了！去行程界面看看，有需要修改的随时说～」不要再说别的！闪送和券会在行程界面展示

**browse 模式 — 用户主导：**
8. 用户选分类 → searchCategory
9. 用户确认商户 → addMerchant
10. addMerchant/rebuildPlan 返回 plan_ready → ★只回一条消息★，同上
11. 用户说"够了/吃饭/不用了" → rebuildPlan
12. 用户说重来/换方向 → resetSelections → recommendCategories
13. 闲聊/确认 → 只回文字

### ★回复节奏★
- plan_ready 后只回一条消息，告诉用户去行程界面看
- 行程完成后主动提醒：「搞定了！分享给朋友，他们也可以"我也去"加入，人多更便宜～」
- 这就是社交裂变——每一次分享都是一次潜在的新用户入场

## ★拼场推荐★
- 用户搜完活动分类后（searchCategory 返回），如果分类是飞盘/徒步/密室/剧本杀/匹克球/羽毛球/骑行/攀岩之一，主动建议：「要不要看看拼场？已经有X人报名了，拼场比单人便宜还能认识新朋友～」
- 然后调 searchPinChang(category) 展示拼场列表
- solo用户（一个人）特别适合拼场——自己玩密室要拼车，拼场正好
- 拼场卡片显示：活动名、时间档、价格、几人已报/满几人、难度、组织者
- 用户选拼场后，和普通商户一样走 addMerchant 流程

## ★活动优先原则★
- 除非用户只说了吃饭需求，否则永远先安排活动再安排餐厅
- 已选活动为空时，recommendCategories 的 categoryType 必须是 "activity"

## 关键约束
- 每次回复最多调 1 个工具
- ★parseUserIntent 只用一次★，后续全部用 updateConstraints
- 阶段一没完成之前，不进入阶段二`;

// ---- Build agent messages ----

// ---- Build agent messages ----

function timeWasDefault(startTime?: string): boolean {
  return !startTime || startTime === '';
}

function buildStateSummary(state: AppState): string {
  const c = state.constraint;
  return [
    `当前阶段: ${state.phase}`,
    `规划步骤: ${state.planningStep}`,
    `约束: 场景=${c.scenario || '?'} 人数=${c.peopleCount || '未知'} 时间=${c.startTime || '?'}-${c.endTime || '?'} 预算=${c.budget ? '¥'+c.budget+'/人' : '未设'} 偏好=[${(c.preferenceTags || []).join(',')}] 活动提示=${c.activityHint || '无'} 场合=${c.occasion || '无'}`,
    `天气: ${state.weather ? `${state.weather.condition} ${state.weather.temp}°C 降雨${state.weather.rainChance}%` : '未获取'}`,
    `已选活动(${state.selectedActivities.length}个): ${state.selectedActivities.map(a => a.name + '(' + a.id + ',¥' + a.groupPrice + ')').join('、') || '无'}`,
    `已选餐厅: ${state.selectedRestaurant ? state.selectedRestaurant.name + '(' + state.selectedRestaurant.id + ',¥' + state.selectedRestaurant.groupPrice + ')' : '无'}`,
    `有完整计划: ${state.plan && state.plan.items.length > 0 ? '是' : '否'}`,
    `当前显示的活动分类: [${state.activityCategories.join(',')}]`,
    `当前显示的餐厅分类: [${state.restaurantCategories.join(',')}]`,
    `当前展示的活动商户(${state.currentActivities.length}个): ${state.currentActivities.map(a => a.name + '(' + a.id + ')').join('、') || '无'}`,
    `当前展示的餐厅商户(${state.currentRestaurants.length}个): ${state.currentRestaurants.map(r => r.name + '(' + r.id + ')').join('、') || '无'}`,
    `待确认商户: ${state.pendingMerchant ? state.pendingMerchant.name + '(' + state.pendingMerchant.id + ',' + state.pendingMerchant.type + ')' : '无'}`,
  ].join('\n');
}

function buildAgentMessages(userMessage: string, state: AppState) {
  const summary = buildStateSummary(state);
  return [
    { role: 'system', content: AGENT_SYSTEM },
    { role: 'user', content: `当前状态:\n${summary}\n\n用户说: "${userMessage}"` },
  ];
}

// ---- Time helpers ----

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

// ---- Execute dispatcher ----

export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  state: AppState,
): Promise<ToolCallResult> {
  switch (name) {
    case 'parseUserIntent': return execParseUserIntent(params.text as string, state);
    case 'recommendCategories': return execRecommendCategories(state, params.categoryType as string, params.mode as string || 'browse');
    case 'searchCategory': return execSearchCategory(state, params.category as string, params.merchantType as string);
    case 'addMerchant': return execAddMerchant(state, params.merchantId as string, params.merchantType as string);
    case 'rebuildPlan': return execRebuildPlan(state, !!(params.skipRestaurant));
    case 'updateConstraints': return execUpdateConstraints(state, params.patch as Record<string, unknown>);
    case 'resetSelections': return execResetSelections(params.scope as string);
    case 'checkAddons': return execCheckAddons(state, (params.location as string) || '朝阳区·望京');
    case 'searchPinChang': return execSearchPinChang(state, params.category as string || '');
    case 'finalizePlan': return execFinalizePlan(state);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ---- Tool 1: parseUserIntent ----

async function execParseUserIntent(text: string, state: AppState): Promise<ToolCallResult> {
  const parsed = await parseIntent(text);

  const existing = state.constraint;

  // Detect misuse: parseUserIntent called as follow-up when constraint already has data.
  // The LLM should have used updateConstraints instead. Include a warning so it learns.
  const isFollowUpCall = !!(existing.scenario && existing.scenario !== 'solo');

  // Scenario: if already set from a previous parse, never overwrite.
  // parseUserIntent is meant for the FIRST message only — the LLM's
  // classification on the first message is the one we trust. Follow-up
  // calls to this tool are a misuse (should use updateConstraints), and
  // the fresh parse has no context so it's likely to misclassify.
  // No keyword checks — the LLM understands natural language better
  // than any regex can.
  const mergedScenario: string = existing.scenario || parsed.scenario || 'solo';

  const merged: Partial<PlanConstraint> = {
    scenario: mergedScenario as PlanConstraint['scenario'],
    peopleCount: parsed.peopleCount > 0 ? parsed.peopleCount : (existing.peopleCount || 0),
    kidAge: parsed.kidAge ?? existing.kidAge,
    preferenceTags: parsed.preferenceTags?.length ? parsed.preferenceTags : (existing.preferenceTags || []),
    dietConstraints: parsed.dietConstraints?.length ? parsed.dietConstraints : (existing.dietConstraints || []),
    activityHint: parsed.activityHint || existing.activityHint,
    startTime: parsed.startTime || existing.startTime || '',
    endTime: parsed.endTime || existing.endTime || '',
    budget: parsed.budget ?? existing.budget,
    occasion: parsed.occasion || existing.occasion,
    location: parsed.location || existing.location || '朝阳区·望京',
  };

  const actions: AppAction[] = [
    { type: 'SET_CONSTRAINT', constraint: merged },
  ];

  const missingTime = timeWasDefault(merged.startTime);
  const missingPeople = merged.peopleCount === 0;

  const ctx: Record<string, unknown> = {
    event: 'intent_parsed',
    scenario: merged.scenario,
    peopleCount: merged.peopleCount,
    preferenceTags: merged.preferenceTags,
    activityHint: merged.activityHint,
    budget: merged.budget,
    dietConstraints: merged.dietConstraints,
    startTime: merged.startTime,
    endTime: merged.endTime,
    timeWasDefault: missingTime,
    peopleCountUnknown: missingPeople,
    occasion: merged.occasion,
  };
  if (isFollowUpCall) {
    ctx._warning = 'parseUserIntent 被重复调用！约束已有场景数据，后续补充信息应该用 updateConstraints。本次已智能合并，下次请用 updateConstraints。';
  }

  return {
    stateChanges: actions,
    replyContext: { event: 'intent_parsed', data: ctx },
    continue: !missingTime && !missingPeople,
  };
}

// ---- Tool 2: recommendCategories ----

async function execRecommendCategories(
  state: AppState,
  categoryType: string,
  mode: string = 'browse',
): Promise<ToolCallResult> {
  // Safety net: activities ALWAYS come before restaurants unless at least
  // one activity is already selected.
  if (categoryType === 'restaurant' && state.selectedActivities.length === 0) {
    categoryType = 'activity';
  }
  const constraint = state.constraint as PlanConstraint;

  // Fetch weather for smarter recommendations (best-effort)
  let weather = state.weather;
  const actions: AppAction[] = [];
  if (!weather) {
    try {
      weather = await checkWeather(constraint.location || '朝阳区·望京');
      actions.push({ type: 'SET_WEATHER', weather });
    } catch { /* best-effort */ }
  }

  const categories = await generateRecommendation(
    constraint,
    categoryType as 'activities' | 'restaurants',
    weather,
  );

  // ============================================================
  // FULL_PLAN mode: auto-pick best match, add to plan, continue chain
  // ============================================================
  if (mode === 'full_plan' && categories.length > 0) {
    const topCat = categories[0];
    if (categoryType === 'activity') {
      // Step 1/2: Pick best activity, add to plan, return brief result.
      // Restaurant will be a separate call so the user sees progress step by step.
      const candidates = await searchActivities(topCat, constraint);
      const sorted = [...candidates].sort((a, b) => a.groupPrice - b.groupPrice);
      const budgetLimit = constraint.budget ?? Infinity;
      const withinBudget = sorted.filter(c => c.groupPrice <= budgetLimit);
      const best = withinBudget[0] || sorted[0];
      if (!best) {
        actions.push({ type: 'SET_ACTIVITY_CATEGORIES', categories });
        return { stateChanges: actions, replyContext: { event: 'categories_shown', data: { categories, categoryType } }, continue: false };
      }

      const newActivities = [...state.selectedActivities, best];
      actions.push({ type: 'ADD_SELECTED_ACTIVITY', activity: best });
      actions.push({ type: 'SET_CURRENT_ACTIVITIES', activities: [] });
      actions.push({ type: 'SET_PLANNING_STEP', step: 'activity_selected' });

      const result = await composePlan({ constraint, selectedActivities: newActivities });
      if (result.plan) actions.push({ type: 'SET_PLAN', plan: result.plan });

      // If time for restaurant → continue so LLM calls recommendCategories(restaurant, full_plan) next
      const shouldGoToRestaurant = !!result.restaurantCategories || result.remainingMinutes >= 45;
      if (result.restaurantCategories) {
        actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories: result.restaurantCategories });
      }

      return {
        stateChanges: actions,
        replyContext: {
          event: 'activity_added',
          data: {
            event: 'activity_added',
            scenario: constraint.scenario,
            peopleCount: constraint.peopleCount,
            lastAddedName: best.name,
            lastAddedPrice: best.groupPrice,
            activityNames: newActivities.map(a => a.name),
            remainingMinutes: result.remainingMinutes,
            currentTime: result.currentTime,
            category: topCat,
            autoPick: true,
            nextStep: shouldGoToRestaurant ? 'call recommendCategories(categoryType="restaurant", mode="full_plan")' : 'done',
          },
        },
        continue: shouldGoToRestaurant,
      };
    }

    // Full_plan restaurant (step 2/2): pick best restaurant, build complete plan
    const candidates = await searchRestaurants(topCat, constraint);
    const sorted = [...candidates].sort((a, b) => a.groupPrice - b.groupPrice);
    const budgetLimit2 = constraint.budget ?? Infinity;
    const withinBudget2 = sorted.filter(c => c.groupPrice <= budgetLimit2);
    const best = withinBudget2[0] || sorted[0];
    if (!best) {
      actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories });
      return { stateChanges: actions, replyContext: { event: 'categories_shown', data: { categories, categoryType: 'restaurant' } }, continue: false };
    }

    actions.push({ type: 'SET_SELECTED_RESTAURANT', restaurant: best });
    const fullResult = await composePlan({ constraint, selectedActivities: state.selectedActivities, selectedRestaurant: best });
    if (fullResult.plan) {
      const plan = fullResult.plan;
      actions.push({ type: 'SET_PLAN', plan });
      actions.push({ type: 'SET_PHASE', phase: 'confirmed' });
      actions.push({ type: 'SET_PLANNING_STEP', step: 'completed' });
      return {
        stateChanges: actions,
        replyContext: {
          event: 'plan_ready',
          data: {
            event: 'plan_ready',
            scenario: constraint.scenario,
            peopleCount: constraint.peopleCount,
            startTime: constraint.startTime,
            endTime: constraint.endTime,
            activityNames: state.selectedActivities.map(a => a.name),
            hasRestaurant: true,
            restaurantName: best.name,
            planTotalSaved: plan.totalSaved,
            planTotalOriginal: plan.totalOriginal,
            planTotalActual: plan.totalActual,
            queueWarning: fullResult.queueWarning,
            autoPick: true,
            nextStep: 'done — tell user to check timeline',
          },
        },
        continue: false,
      };
    }
    return { stateChanges: actions, continue: false };
  }

  // ============================================================
  // BROWSE mode: show categories for user to pick
  // ============================================================

  // Fast-path: activity hint present → search top categories directly
  if (categoryType === 'activity' && constraint.activityHint && categories.length > 0) {
    const top2 = categories.slice(0, 2);
    const candidates: Activity[] = [];
    for (const cat of top2) {
      const results = await searchActivities(cat, constraint);
      candidates.push(...results);
    }
    const sorted = [...candidates].sort((a, b) => a.groupPrice - b.groupPrice);
    actions.push(
      { type: 'SET_ACTIVITY_CATEGORIES', categories: [] },
      { type: 'SET_CURRENT_ACTIVITIES', activities: candidates },
    );
    return {
      stateChanges: actions,
      replyContext: {
        event: 'merchants_shown',
        data: {
          event: 'merchants_shown',
          scenario: constraint.scenario,
          peopleCount: constraint.peopleCount,
          preferenceTags: constraint.preferenceTags,
          activityHint: constraint.activityHint,
          budget: constraint.budget,
          startTime: constraint.startTime,
          endTime: constraint.endTime,
          merchantCount: candidates.length,
          categoryLabel: constraint.activityHint,
          cheapestName: sorted[0]?.name,
          cheapestPrice: sorted[0]?.groupPrice,
          weather: weather ? `${weather.condition} ${weather.temp}°C 降雨${weather.rainChance}%` : null,
        },
      },
      continue: false,
    };
  }

  // Normal path: show category buttons
  if (categoryType === 'activity') {
    actions.push({ type: 'SET_ACTIVITY_CATEGORIES', categories });
    actions.push({ type: 'SET_CURRENT_ACTIVITIES', activities: [] });
  } else {
    actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories });
    actions.push({ type: 'SET_CURRENT_RESTAURANTS', restaurants: [] });
  }

  return {
    stateChanges: actions,
    replyContext: {
      event: 'categories_shown',
      data: {
        event: 'categories_shown',
        scenario: constraint.scenario,
        peopleCount: constraint.peopleCount,
        preferenceTags: constraint.preferenceTags,
        budget: constraint.budget,
        dietConstraints: constraint.dietConstraints,
        startTime: constraint.startTime,
        endTime: constraint.endTime,
        categories,
        categoryType,
        weather: weather ? `${weather.condition} ${weather.temp}°C 降雨${weather.rainChance}%` : null,
      },
    },
    continue: false,
  };
}

// ---- Tool 3: searchCategory ----

async function execSearchCategory(
  state: AppState,
  category: string,
  merchantType: string,
): Promise<ToolCallResult> {
  const constraint = state.constraint as PlanConstraint;
  const actions: AppAction[] = [];

  if (merchantType === 'activity') {
    const candidates = await searchActivities(category, constraint);
    const sorted = [...candidates].sort((a, b) => a.groupPrice - b.groupPrice);
    actions.push({ type: 'SET_ACTIVITY_CATEGORIES', categories: [] });
    actions.push({ type: 'SET_CURRENT_ACTIVITIES', activities: candidates });
    return {
      stateChanges: actions,
      replyContext: {
        event: 'merchants_shown',
        data: {
          event: 'merchants_shown',
          scenario: constraint.scenario,
          peopleCount: constraint.peopleCount,
          preferenceTags: constraint.preferenceTags,
          budget: constraint.budget,
          startTime: constraint.startTime,
          endTime: constraint.endTime,
          merchantCount: candidates.length,
          categoryLabel: category,
          cheapestName: sorted[0]?.name,
          cheapestPrice: sorted[0]?.groupPrice,
        },
      },
      continue: false,
    };
  }

  const candidates = await searchRestaurants(category, constraint);
  const sorted = [...candidates].sort((a, b) => a.groupPrice - b.groupPrice);
  actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories: [] });
  actions.push({ type: 'SET_CURRENT_RESTAURANTS', restaurants: candidates });
  return {
    stateChanges: actions,
    replyContext: {
      event: 'merchants_shown',
      data: {
        event: 'merchants_shown',
        scenario: constraint.scenario,
        peopleCount: constraint.peopleCount,
        budget: constraint.budget,
        startTime: constraint.startTime,
        endTime: constraint.endTime,
        merchantCount: candidates.length,
        categoryLabel: category,
        cheapestName: sorted[0]?.name,
        cheapestPrice: sorted[0]?.groupPrice,
      },
    },
    continue: false,
  };
}

// ---- Tool 4: addMerchant ----

async function execAddMerchant(
  state: AppState,
  merchantId: string,
  merchantType: string,
): Promise<ToolCallResult> {
  const constraint = state.constraint as PlanConstraint;
  const actions: AppAction[] = [];
  actions.push({ type: 'SET_PENDING_MERCHANT', merchant: null });

  if (merchantType === 'activity') {
    const activity = state.currentActivities.find(a => a.id === merchantId);
    if (!activity) throw new Error(`Activity not found: ${merchantId}`);

    const newActivities = [...state.selectedActivities, activity];
    actions.push({ type: 'ADD_SELECTED_ACTIVITY', activity });
    actions.push({ type: 'SET_CURRENT_ACTIVITIES', activities: [] });
    actions.push({ type: 'SET_PLANNING_STEP', step: 'activity_selected' });

    // Time-intelligent next step via composePlan
    const result = await composePlan({
      constraint,
      selectedActivities: newActivities,
    });

    if (result.plan) actions.push({ type: 'SET_PLAN', plan: result.plan });

    // Determine next step
    const ctx: Record<string, unknown> = {
      event: 'activity_added',
      scenario: constraint.scenario,
      peopleCount: constraint.peopleCount,
      preferenceTags: constraint.preferenceTags,
      budget: constraint.budget,
      startTime: constraint.startTime,
      endTime: constraint.endTime,
      lastAddedName: activity.name,
      lastAddedPrice: activity.groupPrice,
      activityNames: newActivities.map(a => a.name),
      remainingMinutes: result.remainingMinutes,
      currentTime: result.currentTime,
    };

    if (result.offerAnotherActivity) {
      // Enough time for more → ask user
      return { stateChanges: actions, replyContext: { event: 'activity_added', data: ctx }, continue: false };
    }

    if (result.restaurantCategories) {
      // Time for restaurant → set categories, agent should loop to show them
      actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories: result.restaurantCategories });
      return { stateChanges: actions, replyContext: { event: 'activity_added', data: ctx }, continue: true };
    }

    // Time tight → finalize
    if (result.plan && result.plan.items.length > 0) {
      actions.push({ type: 'SET_PHASE', phase: 'confirmed' });
      actions.push({ type: 'SET_PLANNING_STEP', step: 'completed' });

      const plan = result.plan;
      const transportMin = planTotalTransportMin(plan);
      return {
        stateChanges: actions,
        replyContext: {
          event: 'plan_ready',
          data: {
            event: 'plan_ready',
            scenario: constraint.scenario,
            peopleCount: constraint.peopleCount,
            startTime: constraint.startTime,
            endTime: constraint.endTime,
            activityNames: newActivities.map(a => a.name),
            hasRestaurant: false,
            planTotalSaved: plan.totalSaved,
            planTotalOriginal: plan.totalOriginal,
            planTotalActual: plan.totalActual,
            ownedCouponCount: plan.couponMatches.filter(c => c.source === 'owned').length,
            totalTransportMin: transportMin,
          },
        },
        continue: false, // stop — addons shown in timeline
      };
    }

    return { stateChanges: actions, replyContext: { event: 'activity_added', data: ctx }, continue: false };
  }

  // Restaurant confirm
  const restaurant = state.currentRestaurants.find(r => r.id === merchantId);
  if (!restaurant) throw new Error(`Restaurant not found: ${merchantId}`);

  actions.push({ type: 'SET_SELECTED_RESTAURANT', restaurant });
  actions.push({ type: 'SET_CURRENT_RESTAURANTS', restaurants: [] });

  const result = await composePlan({
    constraint,
    selectedActivities: state.selectedActivities,
    selectedRestaurant: restaurant,
  });

  if (result.plan) {
    const plan = result.plan;
    actions.push({ type: 'SET_PLAN', plan });
    actions.push({ type: 'SET_PHASE', phase: 'confirmed' });
    actions.push({ type: 'SET_PLANNING_STEP', step: 'completed' });

    const transportMin = planTotalTransportMin(plan);
    return {
      stateChanges: actions,
      replyContext: {
        event: 'plan_ready',
        data: {
          event: 'plan_ready',
          scenario: constraint.scenario,
          peopleCount: constraint.peopleCount,
          startTime: constraint.startTime,
          endTime: constraint.endTime,
          activityNames: state.selectedActivities.map(a => a.name),
          hasRestaurant: true,
          planTotalSaved: plan.totalSaved,
          planTotalOriginal: plan.totalOriginal,
          planTotalActual: plan.totalActual,
          ownedCouponCount: plan.couponMatches.filter(c => c.source === 'owned').length,
          totalTransportMin: transportMin,
          queueWarning: result.queueWarning,
        },
      },
      continue: false, // stop — addons shown in timeline
    };
  }

  return { stateChanges: actions, continue: false };
}

// ---- Tool 5: rebuildPlan ----

async function execRebuildPlan(
  state: AppState,
  skipRestaurant: boolean,
): Promise<ToolCallResult> {
  const constraint = state.constraint as PlanConstraint;
  const result = await composePlan({
    constraint,
    selectedActivities: state.selectedActivities,
    selectedRestaurant: state.selectedRestaurant || undefined,
    skipRestaurant: skipRestaurant && state.selectedActivities.length > 0,
  });

  const actions: AppAction[] = [];
  if (result.plan) actions.push({ type: 'SET_PLAN', plan: result.plan });

  // Show restaurant categories if needed
  if (result.restaurantCategories) {
    actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories: result.restaurantCategories });
  }

  if (result.activityCategories) {
    actions.push({ type: 'SET_ACTIVITY_CATEGORIES', categories: result.activityCategories });
  }

  // If plan has items, we're ready to finalize
  if (result.plan && result.plan.items.length > 0) {
    const plan = result.plan;
    const transportMin = planTotalTransportMin(plan);
    return {
      stateChanges: actions,
      replyContext: {
        event: 'plan_ready',
        data: {
          event: 'plan_ready',
          scenario: constraint.scenario,
          peopleCount: constraint.peopleCount,
          startTime: constraint.startTime,
          endTime: constraint.endTime,
          activityNames: state.selectedActivities.map(a => a.name),
          hasRestaurant: !!state.selectedRestaurant,
          planTotalSaved: plan.totalSaved,
          planTotalOriginal: plan.totalOriginal,
          planTotalActual: plan.totalActual,
          ownedCouponCount: plan.couponMatches.filter(c => c.source === 'owned').length,
          totalTransportMin: transportMin,
          queueWarning: result.queueWarning,
        },
      },
      continue: false, // stop — addons shown in timeline + finalize
    };
  }

  return { stateChanges: actions, continue: false };
}

// ---- Tool 6: updateConstraints ----

function execUpdateConstraints(
  state: AppState,
  patch: Record<string, unknown>,
): ToolCallResult {
  // Validate and clean the patch
  const clean: Record<string, unknown> = {};
  const allowed = ['startTime', 'endTime', 'budget', 'peopleCount', 'dietConstraints', 'occasion', 'activityHint'];
  for (const key of allowed) {
    if (key in patch) (clean as Record<string, unknown>)[key] = patch[key];
  }

  if (Object.keys(clean).length === 0) {
    return { stateChanges: [], continue: false };
  }

  // Check if constraint is now complete after this update
  const existing = state.constraint;
  const mergedStartTime = (clean.startTime as string) || existing.startTime || '';
  const mergedPeopleCount = (clean.peopleCount as number) ?? existing.peopleCount ?? 0;
  const isNowComplete = !timeWasDefault(mergedStartTime) && mergedPeopleCount > 0;

  return {
    stateChanges: [{ type: 'SET_CONSTRAINT', constraint: clean as Partial<PlanConstraint> }],
    replyContext: isNowComplete ? {
      event: 'constraint_complete',
      data: { hint: '信息已齐全！不要再追问时间或人数。下一步：问分叉（完整安排 vs 先看看推荐）或直接调 recommendCategories(activity)' },
    } : undefined,
    continue: isNowComplete,
  };
}

// ---- Tool 7: resetSelections ----

function execResetSelections(scope: string): ToolCallResult {
  const actions: AppAction[] = [];

  switch (scope) {
    case 'all':
      actions.push({ type: 'CLEAR_SELECTED_ACTIVITIES' });
      actions.push({ type: 'SET_SELECTED_RESTAURANT', restaurant: null });
      actions.push({ type: 'SET_PLAN', plan: null });
      actions.push({ type: 'SET_CURRENT_ACTIVITIES', activities: [] });
      actions.push({ type: 'SET_CURRENT_RESTAURANTS', restaurants: [] });
      actions.push({ type: 'SET_ACTIVITY_CATEGORIES', categories: [] });
      actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories: [] });
      actions.push({ type: 'SET_PLANNING_STEP', step: 'picking_activity' });
      break;

    case 'activities':
      // Cascade: clear restaurant too when clearing activities
      actions.push({ type: 'CLEAR_SELECTED_ACTIVITIES' });
      actions.push({ type: 'SET_SELECTED_RESTAURANT', restaurant: null });
      actions.push({ type: 'SET_PLAN', plan: null });
      actions.push({ type: 'SET_CURRENT_ACTIVITIES', activities: [] });
      actions.push({ type: 'SET_ACTIVITY_CATEGORIES', categories: [] });
      actions.push({ type: 'SET_PLANNING_STEP', step: 'picking_activity' });
      break;

    case 'restaurant':
      actions.push({ type: 'SET_SELECTED_RESTAURANT', restaurant: null });
      actions.push({ type: 'SET_CURRENT_RESTAURANTS', restaurants: [] });
      actions.push({ type: 'SET_RESTAURANT_CATEGORIES', categories: [] });
      actions.push({ type: 'SET_PLAN', plan: null });
      break;
  }

  return { stateChanges: actions, continue: true }; // continue to recommend categories next
}

// ---- Tool 8: checkAddons ----

async function execCheckAddons(
  state: AppState,
  location: string,
): Promise<ToolCallResult> {
  const actions: AppAction[] = [];
  const constraint = state.constraint as PlanConstraint;

  try {
    const weather = state.weather || await checkWeather(location);
    if (!state.weather) actions.push({ type: 'SET_WEATHER', weather });
    for (const act of state.selectedActivities) {
      const check = shouldTriggerAddon(
        act.tags, weather.temp, constraint.occasion,
        constraint.kidAge, act.durationMin,
        constraint.scenario,
      );
      if (check.trigger && check.type) {
        const option = addonOptions[check.type];
        actions.push({ type: 'SET_ACTIVE_ADDON', addon: option as unknown as (AddonOption & { type: string }) });
        // Note: the addon message will be generated by the LLM in its reply
        break; // only first matching addon
      }
    }
  } catch { /* best-effort */ }

  // Include coupon prompt if there are claimable coupons
  const plan = state.plan;
  const claimableCoupons = plan?.couponMatches?.filter(c => c.source === 'claimable') || [];
  const replyCtx: Record<string, unknown> = {};
  if (actions.length > 0) {
    replyCtx.addon = actions.find(a => a.type === 'SET_ACTIVE_ADDON') ? true : false;
  }
  if (claimableCoupons.length > 0) {
    replyCtx.couponPrompt = true;
    replyCtx.claimableCount = claimableCoupons.length;
    replyCtx.claimableSaved = claimableCoupons.reduce((s, c) => s + c.saved, 0);
  }

  return {
    stateChanges: actions,
    replyContext: Object.keys(replyCtx).length > 0 ? { event: 'addons_checked', data: replyCtx } : undefined,
    continue: false,
  };
}

// ---- Tool 8.5: searchPinChang ----

function execSearchPinChang(state: AppState, category: string): ToolCallResult {
  const sessions = searchPinChang(state.constraint, category || undefined);

  if (sessions.length === 0) {
    return {
      stateChanges: [],
      replyContext: {
        event: 'pinchang_results',
        data: { sessions: [], category, message: '这个分类暂时没有拼场，换个方向试试？' },
      },
      continue: false,
    };
  }

  // Store sessions in state so UI can render them as cards
  const sessionData = sessions.slice(0, 5).map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    timeSlot: s.timeSlot,
    date: s.date,
    price: s.groupPrice,
    currentCount: s.currentCount,
    maxCount: s.maxCount,
    location: s.location,
    difficulty: s.difficulty,
    equipment: s.equipment,
    tags: s.tags,
    rating: s.rating,
    durationMin: s.durationMin,
    host: s.host,
    hostVerified: s.hostVerified,
  }));

  return {
    stateChanges: [
      { type: 'SET_PINCHANG_SESSIONS', sessions: sessionData },
    ],
    replyContext: {
      event: 'pinchang_results',
      data: {
        category: category || '全部',
        sessions: sessionData,
        totalCount: sessions.length,
      },
    },
    continue: false,
  };
}

// ---- Tool 9: finalizePlan ----

function execFinalizePlan(state: AppState): ToolCallResult {
  // Guard: must have activities and plan
  if (state.selectedActivities.length === 0) {
    throw new Error('Cannot finalize: no activities selected');
  }
  if (!state.plan || state.plan.items.length === 0) {
    throw new Error('Cannot finalize: no plan built yet');
  }

  return {
    stateChanges: [
      { type: 'SET_PHASE', phase: 'confirmed' },
      { type: 'SET_PLANNING_STEP', step: 'completed' },
    ],
    continue: false,
  };
}

// ---- Agent Loop ----

export interface AgentCallbacks {
  addMessage: (text: string, role: 'user' | 'agent', cardType?: string, cardData?: Record<string, unknown>) => void;
  showLoading: (msg: string) => void;
  hideLoading: () => void;
  dispatch: (action: AppAction) => void;
}

const LOADING_MSGS = {
  parsing: '嗯，让我想想…',
  thinking: '正在帮你安排——',
  searching: '帮你找找看——',
  composing: '快好了，在帮你整理——',
};

export async function runAgent(
  userMessage: string,
  initialState: AppState,
  callbacks: AgentCallbacks,
): Promise<void> {
  const { addMessage, showLoading, hideLoading, dispatch } = callbacks;

  // Track state locally so the loop sees updates immediately
  let currentState = initialState;

  // Build conversation: system prompt + current state + user input
  const conversation: ChatWithToolsMessage[] = [
    { role: 'system', content: AGENT_SYSTEM },
    { role: 'user', content: `当前状态:\n${buildStateSummary(currentState)}\n\n用户说: "${userMessage}"` },
  ];

  showLoading(LOADING_MSGS.parsing);

  try {
    for (let i = 0; i < 5; i++) {
      const isLast = i === 4;

      // Update loading message for subsequent LLM calls
      if (i > 0) showLoading(LOADING_MSGS.thinking);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await chatWithTools(conversation, TOOL_DEFS as any, 0.5);

      const hasToolCalls = response.toolCalls.length > 0;

      // Push assistant message to conversation
      // If there's a tool call, suppress pre-tool text — LLM responds after seeing tool result
      const assistantMsg: ChatWithToolsMessage = {
        role: 'assistant',
        content: hasToolCalls ? null : response.content,
      };
      if (hasToolCalls) {
        assistantMsg.tool_calls = response.toolCalls.map(
          (tc: { id: string; function: { name: string; arguments: string } }) => ({
            id: tc.id,
            type: 'function' as const,
            function: tc.function,
          }),
        );
      }
      conversation.push(assistantMsg);

      // No tool calls → show text and done (unless stalling on step 1)
      if (!hasToolCalls) {
        hideLoading();
        if (response.content) {
          // Detect mode-selector fork question → render as clickable buttons
          const isModeQuestion = /(?:完整安排|一条龙).*(?:看看|推荐)|(?:看看|推荐).*(?:完整安排|一条龙)/.test(response.content);
          if (isModeQuestion) {
            addMessage(response.content, 'agent', 'mode_selector', {
              options: [
                { label: '完整安排一趟', action: 'full_plan', description: '活动+吃饭一条龙' },
                { label: '先看看活动推荐', action: 'browse', description: '我自己挑' },
              ],
            });
          } else {
            addMessage(response.content, 'agent');
          }
        }
        // Safety net 1: init step with no parsed constraint → LLM chatted instead of working
        if (i === 0 && currentState.planningStep === 'init' && !currentState.constraint.scenario) {
          showLoading(LOADING_MSGS.parsing);
          conversation.push({
            role: 'user',
            content: '【系统指令】你还没有调用 parseUserIntent 解析用户需求。不要继续闲聊，立即调用 parseUserIntent 工具。不要再输出文字，直接调用。',
          });
          continue;
        }
        // Safety net 2: fork answer without tool call → force calling recommendCategories
        if (/完整安排|一条龙|先看看|看看推荐|看看活动|先看吃的/.test(userMessage) && i === 0) {
          const isFullPlan = /完整安排|一条龙/.test(userMessage);
          showLoading(LOADING_MSGS.thinking);
          conversation.push({
            role: 'user',
            content: isFullPlan
              ? '【系统指令】用户选了"完整安排"，你必须立即调用 recommendCategories(categoryType="activity", mode="full_plan")！不要回文字，直接调工具！'
              : '【系统指令】用户选了"先看看"，你必须立即调用 recommendCategories(categoryType="activity", mode="browse")！不要回文字，直接调工具！',
          });
          continue;
        }
        break;
      }

      // Execute first (and only) tool call
      const toolCall = response.toolCalls[0];
      console.log('[runAgent] Tool call:', toolCall.function.name, toolCall.function.arguments);

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      showLoading(LOADING_MSGS.composing);
      const result = await executeTool(toolCall.function.name, args, currentState);
      // Keep loading visible — don't hideLoading here, next iteration will update the message

      // Apply state changes both locally and to React
      for (const action of result.stateChanges) {
        currentState = appReducer(currentState, action);
        dispatch(action);
      }

      // Build tool result message for LLM
      const toolResultData: Record<string, unknown> = {
        success: true,
        updatedState: buildStateSummary(currentState),
        shouldContinue: result.continue,
      };
      if (result.replyContext) {
        toolResultData.replyContext = result.replyContext;
      }
      // Auto-inject coupon prompt into every tool result
      const plan = currentState.plan;
      if (plan) {
        const claimable = plan.couponMatches.filter(c => c.source === 'claimable');
        if (claimable.length > 0) {
          toolResultData.couponPrompt = {
            count: claimable.length,
            totalSaved: claimable.reduce((s, c) => s + c.saved, 0),
            names: claimable.map(c => c.coupon.name),
            hint: `有${claimable.length}张券可领，共省¥${claimable.reduce((s, c) => s + c.saved, 0)}！提醒用户去「省钱」tab领取`,
          };
        }
      }

      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResultData),
      });

      // Always loop so LLM can respond to the tool result.
      // LLM generates natural text on next iteration; breaks when it has no more tool calls.
      // Force-break on the last iteration to avoid infinite loops.
      if (isLast) break;
    }
  } catch (e) {
    console.error('[runAgent] Error:', e);
    hideLoading();
    addMessage('嗯…没太明白，能换个说法吗？', 'agent');
  }

  hideLoading();
}

// ---- Helpers ----

function planTotalTransportMin(plan: Plan): number {
  return plan.items
    .filter(i => i.type === 'transport')
    .reduce((sum, i) => {
      const m = parseInt((i.detail || '').replace(/[^0-9]/g, ''));
      return sum + (isNaN(m) ? 0 : m);
    }, 0);
}
