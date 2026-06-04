import type { PlanConstraint, WeatherInfo } from '../types';

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const BASE_URL = import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatWithToolsMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface ChatWithToolsResult {
  content: string | null;
  toolCalls: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
}

async function chat(messages: ChatMessage[], temperature = 0.5): Promise<string> {
  console.log('[DeepSeek] Calling API...', { model: 'deepseek-chat', msgCount: messages.length });

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[DeepSeek] API error', res.status, err);
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  console.log('[DeepSeek] Response:', content);
  return content;
}

export async function chatWithTools(
  messages: ChatWithToolsMessage[],
  tools: Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }>,
  temperature = 0.5,
): Promise<ChatWithToolsResult> {
  console.log('[DeepSeek] chatWithTools...', { msgCount: messages.length, toolCount: tools.length });

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      tools,
      temperature,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[DeepSeek] chatWithTools error', res.status, err);
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const choice = data.choices[0];
  const msg = choice.message;

  console.log('[DeepSeek] chatWithTools response:', { hasContent: !!msg.content, toolCount: msg.tool_calls?.length || 0 });

  return {
    content: msg.content || null,
    toolCalls: (msg.tool_calls || []).map((tc: { id: string; function: { name: string; arguments: string } }) => ({
      id: tc.id,
      function: tc.function,
    })),
  };
}

// ============================================================
// generateReply: context → natural assistant response
// Every agent message flows through this — no hardcoded templates
// ============================================================

const REPLY_SYSTEM = `你是美团小袋，一个帮用户规划周末活动的助手。根据当前事件和上下文，生成自然的对话回复。

**重要：直接输出文本，不要JSON、不要引号包裹。**

事件类型与回复要点：

- intent_parsed: 刚理解完用户需求。总结你理解到了什么（什么场景、偏好、预算）。★时间没提要反问。★人数没提（peopleCount是0或null）也要反问"几个人一起？"。时间和人数都OK了才进入下一步。

- categories_shown: 刚推荐了活动/餐厅类别。一句话说明为什么推荐这些（关联用户偏好），自然过渡。

- merchants_shown: 刚搜到了商户列表。提一下找到多少家、最便宜的多少钱、什么价位区间。

- activity_added: 用户刚确认了一个活动。提名字和价格。如果剩余时间 >= 90分钟，问一句"时间还够，要不要再排一个？"如果时间紧（<90分钟）就直接过渡到下一步。

- plan_ready: 行程生成完毕。总结几个活动和总价，提一下路上的时间。提一下省钱（如有券可抵扣）。

回复风格：
- 1-3句话，简洁
- 口语化、有人味，像朋友聊天不是客服
- 包含关键数字（价格、时间、数量）
- 不机械说"收到""明白"
- 不声称已完成交易`;

interface ReplyInput {
  event: 'intent_parsed' | 'categories_shown' | 'merchants_shown' | 'activity_added' | 'plan_ready';
  scenario?: string;
  peopleCount?: number;
  preferenceTags?: string[];
  activityHint?: string;
  budget?: number;
  dietConstraints?: string[];
  startTime?: string;
  endTime?: string;
  timeWasDefault?: boolean;
  peopleCountUnknown?: boolean;
  occasion?: string;
  categories?: string[];
  categoryType?: string;
  merchantCount?: number;
  cheapestName?: string;
  cheapestPrice?: number;
  categoryLabel?: string;
  activityNames?: string[];
  lastAddedName?: string;
  lastAddedPrice?: number;
  remainingMinutes?: number;
  currentTime?: string;
  planTotalSaved?: number;
  planTotalOriginal?: number;
  planTotalActual?: number;
  ownedCouponCount?: number;
  hasRestaurant?: boolean;
  totalTransportMin?: number;
}

export async function generateReply(event: string, ctx: ReplyInput): Promise<string> {
  if (!API_KEY) return fallbackReply(event, ctx);

  const contextLines = [
    `事件：${event}`,
    `场景：${ctx.scenario || '未知'}`,
    `人数：${ctx.peopleCount || 1}`,
    `偏好标签：${(ctx.preferenceTags || []).join('、') || '无'}`,
    `活动提示：${ctx.activityHint || '无'}`,
    `预算：${ctx.budget ? '¥' + ctx.budget + '/人' : '未指定'}`,
    `饮食约束：${(ctx.dietConstraints || []).join('、') || '无'}`,
    `时间窗：${ctx.startTime || '14:00'}-${ctx.endTime || '18:00'}`,
    `时间是默认的吗：${ctx.timeWasDefault ? '是（用户没提时间）' : '否（用户明确说了）'}`,
    `人数未知吗：${ctx.peopleCountUnknown ? '是（用户没提，需要反问）' : '否'}`,
  ];

  if (ctx.occasion) contextLines.push(`特殊场合：${ctx.occasion}`);
  if (ctx.categories) contextLines.push(`推荐类别：${ctx.categories.join('、')}（${ctx.categoryType || ''}）`);
  if (ctx.merchantCount) contextLines.push(`商户数量：${ctx.merchantCount}，类别：${ctx.categoryLabel || ''}，最便宜：${ctx.cheapestName || ''} ¥${ctx.cheapestPrice || 0}/人`);
  if (ctx.lastAddedName) {
    contextLines.push(`刚确认的活动：${ctx.lastAddedName}，¥${ctx.lastAddedPrice}/人`);
    contextLines.push(`已选活动：${(ctx.activityNames || []).join('、')}`);
  }
  if (ctx.remainingMinutes !== undefined) {
    contextLines.push(`剩余时间：${ctx.remainingMinutes}分钟，当前时间线：${ctx.currentTime || ''}`);
  }
  if (ctx.totalTransportMin !== undefined && ctx.totalTransportMin > 0) {
    contextLines.push(`总路程时间：约${ctx.totalTransportMin}分钟`);
  }
  if (ctx.planTotalSaved !== undefined) {
    contextLines.push(`总原价：¥${ctx.planTotalOriginal}，预计实付：¥${ctx.planTotalActual}，可省：¥${ctx.planTotalSaved}，已有券：${ctx.ownedCouponCount || 0}张`);
  }

  try {
    const text = await chat([
      { role: 'system', content: REPLY_SYSTEM },
      { role: 'user', content: contextLines.join('\n') },
    ], 0.8);
    return text.trim();
  } catch (e) {
    console.warn('[generateReply] API failed, using fallback:', e);
    return fallbackReply(event, ctx);
  }
}

function fallbackReply(event: string, ctx: ReplyInput): string {
  switch (event) {
    case 'intent_parsed': {
      const parts: string[] = [];
      if (ctx.scenario === 'friends') parts.push('和朋友一起最开心了');
      else if (ctx.scenario === 'couples') parts.push('约会日要好好安排');
      else if (ctx.scenario === 'family') parts.push('带娃出门是吧');
      else parts.push('好的');
      if (ctx.activityHint) parts.push(`想玩${ctx.activityHint}`);
      if (ctx.budget) parts.push(`人均预算 ¥${ctx.budget}左右`);

      const questions: string[] = [];
      if (ctx.peopleCountUnknown) questions.push('几个人一起？');
      if (ctx.timeWasDefault) questions.push('什么时间方便？比如下午2点到6点');

      if (questions.length > 0) {
        return parts.join('，') + '。' + questions.join(' ');
      }
      return parts.join('，') + '。帮你找找看——';
    }
    case 'categories_shown':
      return ctx.categoryType === 'activity'
        ? `推荐这几个方向，你看看——`
        : `看看想吃什么——`;
    case 'merchants_shown':
      return `帮你找了${ctx.merchantCount || '几'}家${ctx.categoryLabel || ''}，最便宜的「${ctx.cheapestName || ''}」¥${ctx.cheapestPrice || 0}/人。左右滑着看——`;
    case 'activity_added': {
      const base = `「${ctx.lastAddedName || ''}」列入行程了，¥${ctx.lastAddedPrice || 0}/人。`;
      if (ctx.remainingMinutes !== undefined && ctx.remainingMinutes >= 90) {
        return base + `时间还够，要不要再排一个活动？`;
      }
      return base + '接下来吃点什么？';
    }
    case 'plan_ready': {
      const transportPart = ctx.totalTransportMin ? `路上约${ctx.totalTransportMin}分钟，` : '';
      return ctx.planTotalSaved && ctx.planTotalSaved > 0
        ? `齐了！${transportPart}原价 ¥${ctx.planTotalOriginal}，用券后预计 ¥${ctx.planTotalActual}，可省 ¥${ctx.planTotalSaved}。每一项你来决定怎么操作——`
        : `安排好了！${transportPart}每一项你来决定怎么操作——`;
    }
    default:
      return '好的，帮你看看——';
  }
}

// ============================================================
// parseIntent: natural language → PlanConstraint (JSON)
// ============================================================

const PARSE_SYSTEM = `你是美团小袋，一个北京本地周末活动规划助手。用户用自然语言描述出行需求，你从中提取结构化信息。

**重要：你必须只输出一行合法的 JSON，不要输出任何其他文字、不要用 markdown 代码块、不要加解释。**

JSON 格式：
{
  "scenario": "family" | "friends" | "couples" | "solo",
  "peopleCount": 数字,
  "kidAge": 数字或null,
  "preferenceTags": ["标签1", "标签2"],
  "dietConstraints": ["约束1"],
  "activityHint": "明确活动类型" 或 null,
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "budget": 数字或null,
  "occasion": "纪念日/生日" 或 null,
  "location": "朝阳区·望京"
}

提取规则：
- scenario: ★最重要★ 提到以下关键词→对应场景，不要被其他词误导！
  family: 孩子/娃/小朋友/宝宝/带娃/亲子/家人/家庭/全家/爸妈/父母/陪爸妈/家长/亲戚/一家人/爷爷奶奶/姥姥姥爷
  friends: 朋友/闺蜜/哥们/聚一聚/聚会/女生/男生/兄弟/同事/同学
  couples: 约会/对象/恋爱/纪念日/浪漫/情侣/二人世界
  solo: 一个人/自己/独自/独处
- peopleCount: ★只提取明确数字★。用户说"我们3个""2个人""三个人""3人"→提取数字。说"一个人/自己/独自"→1。★情侣/约会场景→填2★（默认两个人）。除此之外全部填0！"和朋友""闺蜜""哥们""聚一聚""几个人""带孩子"这些都没有明确数字，全部填0（追问用户），绝对不准猜！不确定就填0
- kidAge: 孩子年龄必须提取！"娃5岁""5岁孩子""小朋友3岁"→对应数字。没有→null
- preferenceTags: 从自然语言中提取偏好，可选值：安静 治愈 解压 拍照 运动 户外 沉浸 手工 文艺 音乐 自然 教育 社交 出片 打卡 网红 颜值 精致 放松 亲子
  例子："想拍照"→["拍照","出片"]；"在家待不住了/憋坏了"（带孩子场景）→["户外","运动","亲子"]；"安静放松"→["安静","放松","治愈"]
- dietConstraints: 可选值：减肥/轻食 忌生冷 素食。没有→空数组
- activityHint: 只有用户明确说了具体活动类型才填，如"密室""剧本杀""电影""陶艺""手工""骑行""看展"。没说→null
- startTime: ★只提取用户明确说的时间★，如"下午2点"→"14:00"。用户只说"下午/上午/中午"没有具体时间→填""。用户没说任何时间→填""。endTime 同理，没说的填""
- budget: 用户说的人均预算数字，如"人均200""预算200""200以内"。没提→null
- occasion: 只有用户明确提了"纪念日""生日"才填，否则→null`;

// Safety net: detect when LLM made obvious mistakes on keywords
function validateAndCorrect(
  input: string,
  parsed: PlanConstraint & { _corrected?: boolean; _corrections?: string[] },
): PlanConstraint & { _corrected?: boolean; _corrections?: string[] } {
  const lower = input.toLowerCase();
  const corrections: string[] = [];
  let changed = false;

  // Detect if user explicitly said a number of people — if not, peopleCount must be 0
  // Exception: couples default to 2 (date implies two people)
  const hasExplicitCount = /(\d+)\s*[个人位]|[一两三四五六七八九十]\s*[个人]/.test(lower);
  if (!hasExplicitCount && parsed.peopleCount > 1 && !/一个人|自己|独自|一个人/.test(lower)
      && !(parsed.scenario === 'couples' && parsed.peopleCount === 2)) {
    corrections.push(`peopleCount: ${parsed.peopleCount} → 0 (no explicit number in input, must ask)`);
    parsed = { ...parsed, peopleCount: 0 };
    changed = true;
  }

  // Family keywords MUST result in family scenario
  if (/孩子|娃|小朋友|宝宝|带娃|亲子/.test(lower) && parsed.scenario !== 'family') {
    corrections.push(`scenario: ${parsed.scenario} → family`);
    parsed = { ...parsed, scenario: 'family' as const };
    changed = true;
  }

  // Child age MUST be extracted if mentioned
  const ageMatch = lower.match(/(\d+)\s*岁/);
  if (ageMatch && !parsed.kidAge) {
    const age = parseInt(ageMatch[1]);
    corrections.push(`kidAge: null → ${age}`);
    parsed = { ...parsed, kidAge: age };
    changed = true;
  }

  // couples defaults to 2 (date implies two people)
  if (parsed.scenario === 'couples' && parsed.peopleCount === 0) {
    corrections.push('peopleCount: 0 → 2 (couples defaults to 2)');
    parsed = { ...parsed, peopleCount: 2 };
    changed = true;
  }

  // family/friends can't be just 1 person — LLM clearly missed the context
  if ((parsed.scenario === 'family' || parsed.scenario === 'friends') && parsed.peopleCount === 1) {
    corrections.push(`peopleCount: 1 → 0 (${parsed.scenario} requires ≥2, asking user)`);
    parsed = { ...parsed, peopleCount: 0 };
    changed = true;
  }

  // friends scenario with 1 person is contradictory
  if (parsed.scenario === 'friends' && parsed.peopleCount === 1) {
    corrections.push(`peopleCount: 1 → 0 (friends requires ≥2, asking user)`);
    parsed = { ...parsed, peopleCount: 0 };
    changed = true;
  }

  // "在家待不住" in family context → kid has energy, infer active/outdoor
  if ((/待不住|憋坏了|闷|精力/.test(lower)) && parsed.scenario === 'family' && parsed.preferenceTags.length === 0) {
    corrections.push('preferenceTags: [] → [户外, 运动, 亲子]');
    parsed = { ...parsed, preferenceTags: ['户外', '运动', '亲子'] };
    changed = true;
  }

  if (changed) {
    parsed._corrected = true;
    parsed._corrections = corrections;
  }

  return parsed;
}

export async function parseIntent(input: string, _partial?: Partial<PlanConstraint>): Promise<PlanConstraint> {
  console.log('[parseIntent] Input:', input);
  console.log('[parseIntent] API_KEY exists:', !!API_KEY);

  if (!API_KEY) {
    console.warn('[parseIntent] No API key, using fallback');
    return fallbackParse(input);
  }

  try {
    const text = await chat([
      { role: 'system', content: PARSE_SYSTEM },
      { role: 'user', content: input },
    ]);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response: ' + text);

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[parseIntent] Parsed:', parsed);

    const corrected = validateAndCorrect(input, {
      scenario: parsed.scenario || 'solo',
      peopleCount: parsed.peopleCount || 1,
      kidAge: parsed.kidAge ?? undefined,
      preferenceTags: parsed.preferenceTags || [],
      dietConstraints: parsed.dietConstraints || [],
      activityHint: parsed.activityHint || undefined,
      startTime: parsed.startTime || '',
      endTime: parsed.endTime || '',
      budget: parsed.budget ?? undefined,
      occasion: parsed.occasion || undefined,
      location: parsed.location || '朝阳区·望京',
    });

    if (corrected._corrected) {
      console.log('[parseIntent] Corrected LLM mistakes:', corrected._corrections);
    }
    const { _corrected, _corrections, ...constraint } = corrected;
    return constraint;
  } catch (e) {
    console.warn('[parseIntent] API failed, using fallback:', e);
    return fallbackParse(input);
  }
}

// ============================================================
// generateRecommendation: constraint → category labels
// ★ KEY: preferenceTags MUST drive category selection
// ============================================================

const CATEGORY_SYSTEM = `你是美团小袋。根据用户画像推荐活动或餐厅类别。只输出 JSON 数组，3个元素。

★最重要★ 用户消息里的 type 字段决定你推荐什么：
- type="activities" → 只从活动类别中选！绝对不要输出餐厅类别！
- type="restaurants" → 只从餐厅类别中选！绝对不要输出活动类别！

## 活动类别（仅 type=activities 时使用）：
手工DIY, 户外公园, 科技馆, 密室逃脱, 剧本杀, 运动竞技, 独立影院, 户外散步, 书店, 户外运动, Livehouse, 桌游馆, 画室, KTV, 宠物咖啡馆, 汤泉

### 活动推荐规则（按 preferenceTags 优先级）：

拍照/出片/打卡/网红/颜值 → 手工DIY, 画室, 宠物咖啡馆, 独立影院, 户外散步, 书店
（密室和剧本杀是暗室不能拍照，绝对不要推荐！）

安静/治愈/放松/文艺 → 手工DIY, 画室, 宠物咖啡馆, 汤泉, 书店, 独立影院, 户外散步

运动/户外/自然 → 户外运动, 户外公园, 户外散步, 运动竞技

沉浸/解压 → 密室逃脱, 剧本杀, 运动竞技, KTV, 桌游馆

社交/音乐 → KTV, Livehouse, 剧本杀, 桌游馆, 密室逃脱

教育/亲子 → 科技馆, 户外公园, 手工DIY, 宠物咖啡馆

### 活动推荐（按 scenario，无偏好标签时参考）：
family → 手工DIY, 户外公园, 科技馆, 宠物咖啡馆
friends → 密室逃脱, 剧本杀, 运动竞技, 桌游馆, KTV
couples → 手工DIY, 画室, 独立影院, 户外散步, 宠物咖啡馆
solo → 书店, 手工DIY, 画室, 户外运动

### 天气影响（仅活动）：
下雨 rainChance>50% → 优先室内，避免户外公园、户外散步、户外运动
天气好 rainChance<30% → 可以正常推荐户外
高温 temp>30°C → 户外适当降低优先级

---

## 餐厅类别（仅 type=restaurants 时使用）：
轻食沙拉, 日料, 西北菜, 火锅, 北京菜, 烧烤, 音乐餐吧, 创意融合菜, 西餐, 粤菜, 东南亚菜, 川菜, 湘菜

### 餐厅推荐规则：
减肥/轻食 → 轻食沙拉, 日料, 东南亚菜
family → 西北菜, 火锅, 北京菜, 粤菜
couples → 创意融合菜, 日料, 西餐, 东南亚菜
friends → 烧烤, 火锅, 川菜, 湘菜, 音乐餐吧
solo → 日料, 轻食沙拉, 西餐, 粤菜

---

只输出 JSON 数组，不要其他文字`;

export async function generateRecommendation(
  constraint: PlanConstraint,
  type: 'activities' | 'restaurants',
  weather?: WeatherInfo | null,
): Promise<string[]> {
  console.log('[generateRecommendation] type:', type, 'constraint:', constraint, 'weather:', weather);

  if (!API_KEY) {
    console.warn('[generateRecommendation] No API key, using fallback');
    return fallbackCategories(constraint, type, weather);
  }

  const userMsg = JSON.stringify({
    type,
    scenario: constraint.scenario,
    kidAge: constraint.kidAge,
    preferenceTags: constraint.preferenceTags,
    dietConstraints: constraint.dietConstraints,
    activityHint: constraint.activityHint,
    budget: constraint.budget,
    weather: weather ? { temp: weather.temp, condition: weather.condition, rainChance: weather.rainChance } : null,
  });

  try {
    const text = await chat([
      { role: 'system', content: CATEGORY_SYSTEM },
      { role: 'user', content: `根据以下用户画像推荐${type === 'activities' ? '活动' : '餐厅'}类别：${userMsg}` },
    ]);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response: ' + text);

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[generateRecommendation] Result:', parsed);
    if (Array.isArray(parsed)) return parsed.slice(0, 5);
    throw new Error('Not an array');
  } catch (e) {
    console.warn('[generateRecommendation] API failed, using fallback:', e);
    return fallbackCategories(constraint, type);
  }
}

// ============================================================
// Fallback: keyword-based (API unreachable)
// ============================================================

function fallbackParse(input: string): PlanConstraint {
  const lower = input.toLowerCase();
  const constraint: PlanConstraint = {
    scenario: 'solo',
    peopleCount: 0,
    preferenceTags: [],
    dietConstraints: [],
    startTime: '',
    endTime: '',
    location: '朝阳区·望京',
  };

  // Scenario detection (no default peopleCount — only explicit numbers)
  if (/孩子|小朋友|宝宝|娃|带娃/.test(lower)) {
    constraint.scenario = 'family';
  } else if (/朋友|兄弟|闺蜜|哥们|聚一聚|聚会|几个|女生|男生/.test(lower)) {
    constraint.scenario = 'friends';
  } else if (/约会|对象|女朋友|男朋友|纪念日|庆祝|浪漫/.test(lower)) {
    constraint.scenario = 'couples';
    constraint.peopleCount = 2; // dates default to 2
  } else if (/一个人|自己|独自/.test(lower)) {
    constraint.peopleCount = 1;
  }

  // People count — only set if explicit number
  const peopleMatch = lower.match(/(\d+)\s*[个人位]/);
  if (peopleMatch) constraint.peopleCount = parseInt(peopleMatch[1]);
  const cnPeopleMatch = lower.match(/([一两三四五六七八九十])\s*[个人]/);
  if (!peopleMatch && cnPeopleMatch) {
    const map: Record<string, number> = {一:1,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
    constraint.peopleCount = map[cnPeopleMatch[1]] || 0;
  }

  // Kid age
  const kidMatch = lower.match(/(\d+)\s*岁/);
  if (kidMatch) constraint.kidAge = parseInt(kidMatch[1]);

  // Diet
  if (/减肥|轻食|沙拉|健康餐|瘦/.test(lower)) constraint.dietConstraints.push('减肥/轻食');
  if (/不吃凉的|忌生冷|不能吃凉/.test(lower)) constraint.dietConstraints.push('忌生冷');
  if (/素食/.test(lower)) constraint.dietConstraints.push('素食');

  // Preferences — key improvement: more patterns
  if (/拍照|出片|打卡|网红|颜值|好看|拍/.test(lower)) {
    constraint.preferenceTags.push('拍照', '出片');
  }
  if (/安静|放松|治愈|慢|解压|不吵|舒服/.test(lower)) {
    constraint.preferenceTags.push('安静', '治愈', '放松');
  }
  if (/运动|出汗|户外|动一动|骑行|跑步/.test(lower)) {
    constraint.preferenceTags.push('运动', '户外');
  }
  if (/密室|剧本杀|桌游/.test(lower)) {
    constraint.preferenceTags.push('沉浸', '社交');
    constraint.activityHint = '密室/剧本杀';
  }
  if (/电影|看电影/.test(lower)) constraint.activityHint = '电影';
  if (/画画|陶艺|手工|DIY|做陶瓷|做手工/.test(lower)) {
    constraint.preferenceTags.push('手工', '治愈');
    constraint.activityHint = '手工DIY';
  }
  if (/文艺|展览|博物馆|美术馆|画展/.test(lower)) {
    constraint.preferenceTags.push('文艺');
  }
  if (/不远|近一点|附近|不要太远|近的/.test(lower)) {
    // distance preference — will be handled by distance sorting
  }
  if (/便宜|省钱|性价比|不贵/.test(lower) && constraint.budget === undefined) {
    constraint.budget = 100;
  }

  // Time
  const timeMatch = lower.match(/(\d{1,2})[点:](\d{0,2})/);
  if (timeMatch) {
    constraint.startTime = `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`;
  }

  // Budget
  const budgetMatch = lower.match(/预算\s*(\d+)|(\d+)\s*预算|人均\s*(\d+)|(\d+)\s*人均|(\d+)\s*以内/);
  if (budgetMatch) {
    const b = budgetMatch.find((g, i) => i > 0 && g);
    constraint.budget = parseInt(b!);
  }

  if (/纪念日/.test(lower)) constraint.occasion = '纪念日';
  if (/生日/.test(lower)) constraint.occasion = '生日';

  return constraint;
}

function fallbackCategories(constraint: PlanConstraint, type: 'activities' | 'restaurants', _weather?: WeatherInfo | null): string[] {
  const { scenario, kidAge, preferenceTags, dietConstraints, activityHint } = constraint;
  const isRainy = _weather && _weather.rainChance > 50;

  if (type === 'activities') {
    // Start with preference-driven categories
    const cats: string[] = [];

    const hasPhoto = preferenceTags.some((t) => ['拍照', '出片', '打卡', '网红', '颜值'].includes(t));
    const hasQuiet = preferenceTags.some((t) => ['安静', '治愈', '放松', '文艺'].includes(t));
    const hasSport = preferenceTags.some((t) => ['运动', '户外', '自然'].includes(t));
    const hasImmersion = preferenceTags.some((t) => ['沉浸', '解压', '社交'].includes(t));

    // Preference-driven selection FIRST
    if (hasPhoto) {
      cats.push('手工DIY', '画室', '宠物咖啡馆', '独立影院', '户外散步', '书店');
    }
    if (hasQuiet && !hasPhoto) {
      cats.push('手工DIY', '画室', '宠物咖啡馆', '汤泉', '书店', '独立影院');
    }
    if (hasSport) {
      // Rainy → prefer indoor sports
      if (isRainy) {
        cats.push('运动竞技', '户外运动');
      } else {
        cats.push('户外运动', '户外公园', '运动竞技');
      }
    }
    if (hasImmersion) {
      cats.push('密室逃脱', '剧本杀', 'KTV', '桌游馆');
    }

    // If no strong preference, fall back to scenario (weather-aware)
    if (cats.length === 0) {
      if (scenario === 'family' || (kidAge && kidAge <= 10)) {
        if (isRainy) {
          cats.push('手工DIY', '科技馆', '宠物咖啡馆', '运动竞技');
        } else {
          cats.push('手工DIY', '户外公园', '科技馆', '宠物咖啡馆');
        }
      } else if (scenario === 'couples') {
        if (isRainy) {
          cats.push('手工DIY', '画室', '独立影院', '宠物咖啡馆', '汤泉');
        } else {
          cats.push('手工DIY', '画室', '独立影院', '户外散步', '宠物咖啡馆');
        }
      } else if (scenario === 'friends') {
        cats.push('密室逃脱', '剧本杀', '运动竞技', '桌游馆', 'KTV');
      } else {
        if (isRainy) {
          cats.push('书店', '手工DIY', '画室', '运动竞技');
        } else {
          cats.push('书店', '手工DIY', '画室', '户外运动');
        }
      }
    }

    // Activity hint overrides
    if (activityHint) {
      if (activityHint.includes('密室') || activityHint.includes('剧本')) {
        return ['密室逃脱', '剧本杀', '运动竞技'];
      }
      if (activityHint.includes('电影')) return ['独立影院', '户外散步', '书店'];
      if (activityHint.includes('手工') || activityHint.includes('陶艺')) return ['手工DIY', '画室', '独立影院', '户外散步'];
      if (activityHint.includes('画画') || activityHint.includes('油画') || activityHint.includes('绘画')) return ['画室', '手工DIY', '独立影院'];
      if (activityHint.includes('唱歌') || activityHint.includes('KTV')) return ['KTV', 'Livehouse'];
      if (activityHint.includes('桌游')) return ['桌游馆', '密室逃脱', '剧本杀'];
      if (activityHint.includes('猫') || activityHint.includes('狗') || activityHint.includes('宠物')) return ['宠物咖啡馆', '户外散步'];
    }

    // Deduplicate and trim
    const unique = [...new Set(cats)];
    if (preferenceTags.includes('音乐') && !unique.includes('Livehouse')) unique.push('Livehouse');
    if (preferenceTags.includes('社交') && !unique.includes('KTV')) unique.push('KTV');

    return unique.slice(0, 4);
  }

  // Restaurants
  const cats: string[] = [];
  if (dietConstraints.includes('减肥/轻食')) {
    cats.push('轻食沙拉', '日料', '东南亚菜');
  } else if (scenario === 'family' || (kidAge && kidAge <= 10)) {
    cats.push('西北菜', '火锅', '北京菜', '粤菜');
  } else if (scenario === 'couples') {
    cats.push('创意融合菜', '日料', '西餐', '东南亚菜');
  } else if (scenario === 'friends') {
    cats.push('烧烤', '火锅', '川菜', '湘菜', '音乐餐吧');
  } else {
    cats.push('日料', '轻食沙拉', '西餐', '粤菜');
  }
  return cats;
}
