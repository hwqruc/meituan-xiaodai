import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';
import CategorySelector from './CategorySelector';
import MerchantCards from './MerchantCards';
import MerchantConfirm from './MerchantConfirm';
import ActionCard from './ActionCard';
import AddonOffer from './AddonOffer';
import PinChangCard, { type PinChangSessionData } from './PinChangCard';
import type { PendingMerchant } from '../store/useStore';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  loadingMsg?: string;
  onCategorySelect: (category: string, type: 'activity' | 'restaurant') => void;
  onMerchantSelect: (id: string, type: 'activity' | 'restaurant') => void;
  onActionSelect: (actionType: string) => void;
  onAddonResponse: (action: 'accept' | 'decline' | 'later') => void;
  onConfirmMerchant: () => void;
  onViewOtherMerchants: () => void;
  onOfferResponse: (action: 'add_another' | 'go_eat') => void;
  onModeSelect: (action: string) => void;
  onSharePlan: () => void;
  onExecuteAll: () => void;
  planConfirmed: boolean;
  pinChangSessions: PinChangSessionData[];
  onPinChangSelect: (session: PinChangSessionData) => void;
  activityCategories: string[];
  restaurantCategories: string[];
  currentActivities: any[];
  currentRestaurants: any[];
  pendingMerchant: PendingMerchant | null;
  plan: any;
  activeAddon: any;
  peopleCount: number;
  offerAnotherActivity: boolean;
  remainingMinutes: number;
}

function formatRemaining(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  }
  return `${minutes}分钟`;
}

export default function ChatView({
  messages,
  isLoading,
  loadingMsg,
  onCategorySelect,
  onMerchantSelect,
  onActionSelect,
  onAddonResponse,
  onConfirmMerchant,
  onViewOtherMerchants,
  onOfferResponse,
  onModeSelect,
  onSharePlan,
  onExecuteAll,
  planConfirmed,
  pinChangSessions,
  onPinChangSelect,
  activityCategories,
  restaurantCategories,
  currentActivities,
  currentRestaurants,
  pendingMerchant,
  plan,
  activeAddon,
  peopleCount,
  offerAnotherActivity,
  remainingMinutes,
}: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentActivities, currentRestaurants, activeAddon, offerAnotherActivity]);

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
      <div className="pt-3 pb-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 拼场 sessions */}
        {pinChangSessions.length > 0 && (
          <PinChangCard
            sessions={pinChangSessions}
            onSelect={onPinChangSelect}
            peopleCount={peopleCount}
          />
        )}

        {/* Mode selector buttons (一条龙 vs 先看看推荐) */}
        {(() => {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg?.cardType === 'mode_selector' && lastMsg.role === 'agent') {
            const options: Array<{ label: string; action: string; description: string }> =
              lastMsg.cardData?.options || [];
            return (
              <div className="pl-12 pr-4 mb-4">
                <div className="flex gap-2">
                  {options.map((opt) => (
                    <button
                      key={opt.action}
                      onClick={() => onModeSelect(opt.action)}
                      className="flex-1 py-3 px-4 rounded-xl border-2 border-meituan-dark
                                 hover:bg-meituan-dark hover:text-white transition-colors text-left"
                    >
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-text-hint mt-0.5">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* "Add another activity?" prompt */}
        {offerAnotherActivity && (
          <div className="pl-12 pr-4 mb-4">
            <div className="bg-[#FFF9E6] border border-[#FFD100] rounded-xl p-4">
              <p className="text-sm text-text-primary mb-3">
                离结束还有 <span className="font-semibold text-meituan-dark">{formatRemaining(remainingMinutes)}</span>，要不要再排一个活动？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onOfferResponse('add_another')}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-meituan to-meituan-dark
                             text-sm font-medium text-text-primary
                             hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  再来一个活动
                </button>
                <button
                  onClick={() => onOfferResponse('go_eat')}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm text-text-secondary
                             hover:bg-bg-gray transition-colors"
                >
                  先看看吃的
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category selector for activities */}
        {activityCategories.length > 0 && (
          <div className="pl-12 pr-4 mb-4">
            <CategorySelector
              categories={activityCategories}
              type="activity"
              onSelect={(cat) => onCategorySelect(cat, 'activity')}
            />
          </div>
        )}

        {/* Activity merchant cards */}
        {currentActivities.length > 0 && (
          <div className="pl-12 mb-4">
            <MerchantCards
              items={currentActivities}
              type="activity"
              onSelect={(id) => onMerchantSelect(id, 'activity')}
              peopleCount={peopleCount}
            />
          </div>
        )}

        {/* Category selector for restaurants */}
        {restaurantCategories.length > 0 && (
          <div className="pl-12 pr-4 mb-4">
            <CategorySelector
              categories={restaurantCategories}
              type="restaurant"
              onSelect={(cat) => onCategorySelect(cat, 'restaurant')}
            />
          </div>
        )}

        {/* Restaurant merchant cards */}
        {currentRestaurants.length > 0 && (
          <div className="pl-12 mb-4">
            <MerchantCards
              items={currentRestaurants}
              type="restaurant"
              onSelect={(id) => onMerchantSelect(id, 'restaurant')}
              peopleCount={peopleCount}
            />
          </div>
        )}

        {/* Merchant confirmation */}
        {pendingMerchant && (
          <div className="pl-12 pr-4 mb-4">
            <MerchantConfirm
              merchant={pendingMerchant}
              onConfirm={onConfirmMerchant}
              onViewOthers={onViewOtherMerchants}
            />
          </div>
        )}

        {/* Action cards */}
        {plan && plan.items && plan.items.length > 0 && !pendingMerchant && (
          <div className="pl-12 pr-4 mb-4 space-y-3">
            {plan.items
              .filter((item: any) => item.actions && item.actions.length > 0)
              .map((item: any, i: number) => (
                <ActionCard
                  key={i}
                  item={item}
                  onAction={onActionSelect}
                />
              ))}
          </div>
        )}

        {/* Addon offer */}
        {activeAddon && (
          <div className="pl-12 pr-4 mb-4">
            <AddonOffer
              addon={activeAddon}
              onResponse={onAddonResponse}
            />
          </div>
        )}

        {/* Plan share + one-click execute */}
        {planConfirmed && plan && plan.items && plan.items.length > 0 && (
          <div className="pl-12 pr-4 mb-4 space-y-2">
            <button
              onClick={onExecuteAll}
              className="w-full py-3 rounded-xl bg-meituan-dark text-white text-sm font-semibold
                         hover:bg-meituan-light transition-colors"
            >
              一键安排全部（购票·订座·取号·用券）
            </button>
            <button
              onClick={onSharePlan}
              className="w-full py-2.5 rounded-xl border-2 border-meituan-dark text-sm font-semibold
                         text-meituan-dark hover:bg-meituan-dark hover:text-white transition-colors"
            >
              分享方案给朋友/家人
            </button>
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2 px-4 mb-4">
            <div className="w-7 h-7 rounded-full bg-meituan flex items-center justify-center shrink-0 relative overflow-hidden">
              <span className="text-[10px] font-bold text-white">袋</span>
              <img
                src="/images/mascot.png"
                alt="袋"
                className="absolute inset-0 w-full h-full rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="bg-[#FFF9E6] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-meituan-dark animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-meituan-dark animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-meituan-dark animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {loadingMsg && (
                <span className="text-xs text-text-hint">{loadingMsg}</span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
