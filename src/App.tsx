import { useReducer, useCallback, useState } from 'react';
import { AppContext, appReducer, initialState } from './store/useStore';
import type { PendingMerchant } from './store/useStore';
import PhoneFrame from './components/PhoneFrame';
import Header from './components/Header';
import TabBar from './components/TabBar';
import HomeScreen from './components/HomeScreen';
import ChatView from './components/ChatView';
import TimelineView from './components/TimelineView';
import SavingsView from './components/SavingsView';
import ShareModal from './components/ShareModal';
import CheckoutModal from './components/CheckoutModal';
import ChatInput from './components/ChatInput';
import { runAgent } from './tools/agent';
import type { Message, Activity, Restaurant, PlanItem } from './types';


let msgId = 1;
function nextId() { return `msg-${++msgId}`; }

function makePendingMerchant(
  item: Activity | Restaurant,
  type: 'activity' | 'restaurant',
): PendingMerchant {
  const isAct = type === 'activity';
  return {
    id: item.id, type, name: item.name,
    price: item.price, groupPrice: item.groupPrice,
    rating: item.rating, imageUrl: item.imageUrl, tags: item.tags,
    detail: isAct
      ? `${(item as Activity).durationMin}分钟 · ${item.tags.slice(0, 3).join('·')}`
      : `排队约${(item as Restaurant).queueEstimate}分钟 · ${item.tags.slice(0, 3).join('·')}`,
  };
}

const LOADING_MSGS = {
  parsing: '嗯，让我想想…',
  searching: '帮你找找合适的',
  coupons: '顺便翻翻你的券包，看能不能省点',
  restaurants: '再看看有什么好吃的',
  composing: '快好了，在帮你算账单',
};

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS.parsing);
  const [offerAnotherActivity, setOfferAnotherActivity] = useState(false);
  const [lastComposeResult, setLastComposeResult] = useState<{
    remainingMinutes: number;
    currentTime: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const addMessage = useCallback((text: string, role: 'user' | 'agent', cardType?: string, cardData?: Record<string, unknown>) => {
    const msg: Message = { id: nextId(), role, text, timestamp: Date.now(), cardType: cardType as Message['cardType'], cardData };
    dispatch({ type: 'ADD_MESSAGE', message: msg });
    return msg;
  }, []);

  const showLoading = useCallback((msg: string) => {
    setLoadingMsg(msg);
    dispatch({ type: 'SET_LOADING', loading: true });
  }, []);

  const hideLoading = useCallback(() => {
    dispatch({ type: 'SET_LOADING', loading: false });
  }, []);

  // ============================================================
  // Phase 0: Home → hand off to agent (LLM-driven)
  // ============================================================
  const handleHomeSubmit = useCallback(async (text: string) => {
    addMessage(text, 'user');
    dispatch({ type: 'SET_PHASE', phase: 'planning' });
    dispatch({ type: 'SET_PLANNING_STEP', step: 'init' });
    // Clear any residual planning data from a previous session
    dispatch({ type: 'SET_ACTIVITY_CATEGORIES', categories: [] });
    dispatch({ type: 'SET_RESTAURANT_CATEGORIES', categories: [] });
    dispatch({ type: 'SET_CURRENT_ACTIVITIES', activities: [] });
    dispatch({ type: 'SET_CURRENT_RESTAURANTS', restaurants: [] });
    dispatch({ type: 'CLEAR_SELECTED_ACTIVITIES' });
    dispatch({ type: 'SET_SELECTED_RESTAURANT', restaurant: null });
    dispatch({ type: 'SET_PLAN', plan: null });

    try {
      await runAgent(text, state, { addMessage, showLoading, hideLoading, dispatch });
    } catch {
      hideLoading();
      addMessage('哎呀，卡了一下。再试一次？', 'agent');
    }
  }, [addMessage, showLoading, hideLoading, dispatch, state]);

  // ============================================================
  // Category selected → delegate to agent
  // ============================================================
  const handleCategorySelect = useCallback(async (category: string, _type: 'activity' | 'restaurant') => {
    addMessage(category, 'user');
    try {
      await runAgent(category, state, { addMessage, showLoading, hideLoading, dispatch });
    } catch {
      hideLoading();
      addMessage('嗯…没太明白，能换个说法吗？', 'agent');
    }
  }, [addMessage, showLoading, hideLoading, dispatch, state]);

  // ============================================================
  // Merchant clicked → preview (confirm / cancel)
  // ============================================================
  const handleMerchantSelect = useCallback((id: string, type: 'activity' | 'restaurant') => {
    if (type === 'activity') {
      const selected = state.currentActivities.find((a) => a.id === id);
      if (!selected) return;
      dispatch({ type: 'SET_PENDING_MERCHANT', merchant: makePendingMerchant(selected, 'activity') });
    } else {
      const selected = state.currentRestaurants.find((r: Restaurant) => r.id === id);
      if (!selected) return;
      dispatch({ type: 'SET_PENDING_MERCHANT', merchant: makePendingMerchant(selected, 'restaurant') });
    }
  }, [state.currentActivities, state.currentRestaurants]);

  // ============================================================
  // Confirm merchant → delegate to agent
  // ============================================================
  const handleConfirmMerchant = useCallback(async () => {
    const pm = state.pendingMerchant;
    if (!pm) return;

    const label = pm.type === 'activity' ? '这家不错，就它吧' : '这家看着不错，就它';
    addMessage(label, 'user');

    try {
      // Agent sees pendingMerchant in state → calls addMerchant with the right ID
      await runAgent(`确认选择 ${pm.name}`, state, { addMessage, showLoading, hideLoading, dispatch });
    } catch {
      hideLoading();
      addMessage('嗯…卡了一下，再试试？', 'agent');
    }
  }, [addMessage, showLoading, hideLoading, dispatch, state]);

  // ============================================================
  // "Add another activity?" response → delegate to agent
  // ============================================================
  const handleOfferResponse = useCallback(async (action: 'add_another' | 'go_eat') => {
    setOfferAnotherActivity(false);

    const text = action === 'add_another' ? '再来一个' : '先看看吃的';
    addMessage(text, 'user');
    try {
      await runAgent(text, state, { addMessage, showLoading, hideLoading, dispatch });
    } catch {
      hideLoading();
      addMessage('嗯…没太明白，能换个说法吗？', 'agent');
    }
  }, [addMessage, showLoading, hideLoading, dispatch, state]);

  // ============================================================
  // View others
  // ============================================================
  const handleViewOtherMerchants = useCallback(() => {
    const pm = state.pendingMerchant;
    if (!pm) return;
    addMessage('再看看别的', 'user');
    addMessage('没问题，继续看～', 'agent');
    dispatch({ type: 'SET_PENDING_MERCHANT', merchant: null });
  }, [addMessage, state.pendingMerchant]);

  // ============================================================
  // Unified handler — LLM function calling agent drives the flow
  // ============================================================
  const handlePlanningChat = useCallback(async (text: string) => {
    addMessage(text, 'user');
    try {
      await runAgent(text, state, { addMessage, showLoading, hideLoading, dispatch });
    } catch {
      hideLoading();
      addMessage('嗯…没太明白，能换个说法吗？', 'agent');
    }
  }, [addMessage, showLoading, hideLoading, dispatch, state]);

  // ============================================================
  // Action card responses
  // ============================================================
  const handleActionSelect = useCallback((actionType: string) => {
    if (actionType === 'self') {
      addMessage('我自己来就行', 'user');
      addMessage('好，入口在美团App里，随时去就行。', 'agent');
    } else if (actionType === 'later') {
      addMessage('这个先等等', 'user');
      addMessage('嗯，不急，想处理的时候回来点。', 'agent');
    } else if (actionType === 'purchase_tickets') {
      addMessage('去美团下单', 'user');
      addMessage('帮你打开了美团App的团购页面，券会自动抵扣～', 'agent');
    } else if (actionType === 'book_table') {
      addMessage('去美团订座', 'user');
      addMessage('帮你打开了餐厅的订座页面，选个时间就行～', 'agent');
    } else if (actionType === 'take_queue') {
      addMessage('去排队取号', 'user');
      addMessage('帮你打开了线上取号页面，到号会提醒你～', 'agent');
    } else if (actionType === 'apply_coupon') {
      addMessage('查看神券', 'user');
      addMessage('这张券在你券包里，下单的时候会自动抵扣～', 'agent');
    } else if (actionType === 'claim_coupon') {
      addMessage('去领神券', 'user');
      addMessage('帮你打开了领券页面，领完下单更划算～', 'agent');
    } else if (actionType === 'order_addon') {
      addMessage('去下单闪送', 'user');
      addMessage('帮你打开了闪送下单页，选个送达时间就行～', 'agent');
    } else {
      addMessage('好的', 'user');
      addMessage('帮你打开了美团页面～', 'agent');
    }
  }, [addMessage]);

  const handleClaimCoupon = useCallback((couponId: string, couponName: string) => {
    if (!state.plan) return;
    const plan = state.plan;

    const matchIndex = plan.couponMatches.findIndex(
      (c) => c.coupon.id === couponId && c.source === 'claimable',
    );
    if (matchIndex === -1) return;

    const match = plan.couponMatches[matchIndex];

    // Move this coupon from claimable → owned
    const newMatches = [...plan.couponMatches];
    newMatches[matchIndex] = { ...match, source: 'owned' as const };

    const newTotalSaved = plan.totalSaved + match.saved;
    const newTotalActual = plan.totalActual - match.saved;

    // Update the related PlanItem to reflect the coupon
    const newItems = plan.items.map((item) => {
      if (item.poiId === match.poiId && item.type !== 'transport') {
        return {
          ...item,
          saved: item.saved + match.saved,
          couponMatched: { ...match, source: 'owned' as const },
          actions: item.actions.map((a) =>
            a.type === 'claim_coupon'
              ? { ...a, type: 'apply_coupon' as const, label: `用券省¥${match.saved}`, status: 'done' as const }
              : a,
          ),
        };
      }
      return item;
    });

    dispatch({
      type: 'SET_PLAN',
      plan: {
        ...plan,
        items: newItems,
        totalSaved: newTotalSaved,
        totalActual: newTotalActual,
        couponMatches: newMatches,
      },
    });
    dispatch({ type: 'SET_TAB', tab: 'chat' });
    addMessage(`领到了！「${couponName}」减 ¥${match.saved}，现在预计实付 ¥${newTotalActual}～`, 'agent');
    // Follow-up: suggest next step
    setTimeout(() => {
      addMessage('还需要调整什么吗？或者去看看行程单和账单～', 'agent');
    }, 500);
  }, [addMessage, state.plan]);

  const handleAddonResponse = useCallback((action: 'accept' | 'decline' | 'later') => {
    if (action === 'accept') {
      addMessage('行，来一个', 'user');
      addMessage(`好的，「${state.activeAddon?.name}」列入行程了，预计${state.activeAddon?.deliveryTime}送达。记得提前下单哦～`, 'agent');
      // Add addon to plan
      if (state.plan && state.activeAddon) {
        const addon: PlanItem = {
          type: 'addon',
          time: state.plan.items[state.plan.items.length - 1]?.time ?? '',
          name: state.activeAddon.name,
          price: state.activeAddon.price,
          originalPrice: state.activeAddon.price,
          saved: 0,
          detail: state.activeAddon.deliveryTime,
          actions: [{ type: 'order_addon', label: '去下单闪送', status: 'pending', detail: state.activeAddon.type }],
        };
        dispatch({
          type: 'SET_PLAN',
          plan: {
            ...state.plan,
            items: [...state.plan.items, addon],
            totalActual: state.plan.totalActual + state.activeAddon.price,
          },
        });
      }
    } else if (action === 'later') {
      addMessage('先等等，不急', 'user');
      addMessage('没问题，出发前随时可以在行程里加。', 'agent');
    } else {
      addMessage('不用了', 'user');
      addMessage('OK，有需要随时说。', 'agent');
    }
    dispatch({ type: 'SET_ACTIVE_ADDON', addon: null });
  }, [addMessage, state.activeAddon, state.plan]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setOfferAnotherActivity(false);
    setLastComposeResult(null);
  }, []);

  const handleTabChange = useCallback((tab: typeof state.tab) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const isDuringPlanning = state.phase === 'planning' || state.phase === 'confirmed';

  return (
    <AppContext value={{ state, dispatch }}>
      <PhoneFrame>
        {state.phase === 'home' && (
          <>
            <Header />
            <HomeScreen
              onSubmit={handleHomeSubmit}
              onJoinSession={(session) => {
                const text = `我想加入拼场「${session.name}」，${session.timeSlot}，${session.location}，${session.currentCount}/${session.maxCount}人，¥${session.price}/人`;
                handleHomeSubmit(text);
              }}
              isLoading={state.isLoading}
            />
          </>
        )}

        {isDuringPlanning && (
          <>
            <Header />
            {state.tab === 'chat' && (
              <>
                <ChatView
                  messages={state.messages}
                  isLoading={state.isLoading}
                  loadingMsg={loadingMsg}
                  onCategorySelect={handleCategorySelect}
                  onMerchantSelect={handleMerchantSelect}
                  onActionSelect={handleActionSelect}
                  onAddonResponse={handleAddonResponse}
                  onConfirmMerchant={handleConfirmMerchant}
                  onViewOtherMerchants={handleViewOtherMerchants}
                  onOfferResponse={handleOfferResponse}
                  onModeSelect={(action: string) => {
                    const text = action === 'full_plan' ? '完整安排一趟' : '先看看有什么好玩的';
                    handlePlanningChat(text);
                  }}
                  onSharePlan={() => setShowShareModal(true)}
                  onExecuteAll={() => setShowCheckoutModal(true)}
                  planConfirmed={state.phase === 'confirmed'}
                  pinChangSessions={state.pinChangSessions}
                  onPinChangSelect={(session) => {
                    addMessage(`拼场：${session.name}（${session.timeSlot}，¥${session.price}/人）`, 'user');
                    dispatch({ type: 'SET_PINCHANG_SESSIONS', sessions: [] });
                    handlePlanningChat(`选拼场 ${session.name}`);
                  }}
                  activityCategories={state.activityCategories}
                  restaurantCategories={state.restaurantCategories}
                  currentActivities={state.currentActivities}
                  currentRestaurants={state.currentRestaurants}
                  pendingMerchant={state.pendingMerchant}
                  plan={state.plan}
                  activeAddon={state.activeAddon}
                  peopleCount={state.constraint.peopleCount || 2}
                  offerAnotherActivity={offerAnotherActivity}
                  remainingMinutes={lastComposeResult?.remainingMinutes ?? 0}
                />
                <ChatInput
                  placeholder="有什么想法直接说，比如：密室太贵了有没有便宜点的"
                  disabled={state.isLoading}
                  onSubmit={handlePlanningChat}
                />
              </>
            )}
            {state.tab === 'timeline' && (
              <TimelineView
                plan={state.plan}
                weather={state.weather}
                constraint={{
                  scenario: state.constraint.scenario,
                  occasion: state.constraint.occasion,
                  kidAge: state.constraint.kidAge,
                }}
                onReplaceItem={(item) => {
                  dispatch({ type: 'SET_TAB', tab: 'chat' });
                  const label = item.type === 'activity' ? `换一个活动，不要${item.name}` : `换一个餐厅，不要${item.name}`;
                  handlePlanningChat(label);
                }}
                onAddonOrder={(type) => {
                  const names: Record<string, string> = { cold_drink: '冰饮', flowers: '鲜花', snack: '零食包' };
                  addMessage(`去美团下单${names[type] || '闪送'}`, 'user');
                  addMessage(`帮你打开了闪送下单页，${names[type] || '配送'}会在指定时间送达～`, 'agent');
                }}
              />
            )}
            {state.tab === 'savings' && <SavingsView plan={state.plan} onClaimCoupon={handleClaimCoupon} />}
            <TabBar
              activeTab={state.tab}
              onTabChange={handleTabChange}
              hasPlan={state.plan !== null && state.plan.items.length > 0}
            />
            {state.phase === 'confirmed' && state.tab === 'chat' && (
              <div className="px-4 pb-2 bg-white">
                <button
                  onClick={handleReset}
                  className="w-full py-2 rounded-lg border border-border text-xs text-text-hint
                             hover:text-text-secondary hover:bg-bg-gray transition-colors"
                >
                  重新规划
                </button>
              </div>
            )}
          </>
        )}
      </PhoneFrame>

      {/* Share modal */}
      {showShareModal && state.plan && (
        <ShareModal
          plan={state.plan}
          peopleCount={state.constraint.peopleCount || 2}
          onClose={() => setShowShareModal(false)}
          onJoinClick={() => {
            // Someone joined the plan via share — increase people count + recalculate
            const newCount = (state.constraint.peopleCount || 2) + 1;
            dispatch({ type: 'SET_CONSTRAINT', constraint: { peopleCount: newCount } });
            // Recalculate plan savings with more people
            if (state.plan) {
              const scale = newCount / (state.constraint.peopleCount || 2);
              const newTotalOriginal = Math.round(state.plan.totalOriginal * scale);
              const newTotalActual = Math.round(state.plan.totalActual * scale);
              dispatch({
                type: 'SET_PLAN',
                plan: {
                  ...state.plan,
                  totalOriginal: newTotalOriginal,
                  totalActual: newTotalActual,
                },
              });
            }
          }}
        />
      )}

      {/* Checkout modal */}
      {showCheckoutModal && state.plan && (
        <CheckoutModal
          plan={state.plan}
          onClose={() => setShowCheckoutModal(false)}
          onConfirm={() => {
            if (!state.plan) return;
            const newItems = state.plan.items.map((item) => ({
              ...item,
              actions: item.actions.map((a) => ({ ...a, status: 'done' as const })),
            }));
            const newMatches = state.plan.couponMatches.map((c) =>
              c.source === 'claimable' ? { ...c, source: 'owned' as const } : c,
            );
            const extraSaved = state.plan.couponMatches
              .filter((c) => c.source === 'claimable')
              .reduce((s, c) => s + c.saved, 0);
            dispatch({
              type: 'SET_PLAN',
              plan: {
                ...state.plan,
                items: newItems,
                totalSaved: state.plan.totalSaved + extraSaved,
                totalActual: state.plan.totalActual - extraSaved,
                couponMatches: newMatches,
              },
            });
          }}
        />
      )}

    </AppContext>
  );
}
