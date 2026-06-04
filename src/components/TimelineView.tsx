import { Clock, MapPin, Ticket, ChefHat, Car, Sparkles, Package, RefreshCw, Coffee, Gift, Cookie } from 'lucide-react';
import type { Plan, PlanItem, WeatherInfo } from '../types';
import { shouldTriggerAddon, addonOptions } from '../tools/addon';

interface Props {
  plan: Plan | null;
  onReplaceItem?: (item: PlanItem) => void;
  weather?: WeatherInfo | null;
  constraint?: { scenario?: string; occasion?: string; kidAge?: number } | null;
  onAddonOrder?: (type: string) => void;
}

export default function TimelineView({ plan, onReplaceItem, weather, constraint, onAddonOrder }: Props) {
  if (!plan || plan.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-hint p-8">
        <Clock size={40} strokeWidth={1} />
        <p className="mt-3 text-sm">还没有安排行程</p>
        <p className="text-xs mt-1">回到对话开始规划吧</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'activity': return <Ticket size={16} />;
      case 'restaurant': return <ChefHat size={16} />;
      case 'transport': return <Car size={16} />;
      case 'addon': return <Package size={16} />;
      default: return <MapPin size={16} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'activity': return 'bg-[#FFF3CD] text-[#856404]';
      case 'restaurant': return 'bg-[#D4EDDA] text-[#155724]';
      case 'transport': return 'bg-[#E2E3E5] text-text-hint';
      case 'addon': return 'bg-[#E8DAEF] text-[#6C3483]';
      default: return 'bg-bg-gray text-text-secondary';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Clock size={16} />
          行程时间线
        </h3>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

          {plan.items.map((item, i) => (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Node */}
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getBgColor(item.type)}`}
              >
                {getIcon(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs text-text-hint mb-0.5">{item.time}</p>
                <p className="text-sm font-medium text-text-primary">{item.name}</p>
                {item.detail && (
                  <p className="text-xs text-text-hint mt-0.5">{item.detail}</p>
                )}

                {/* Price */}
                {item.price > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-semibold text-save-green">
                      ¥{item.price}
                    </span>
                    {item.saved > 0 && (
                      <>
                        <span className="text-xs text-text-hint line-through">¥{item.originalPrice}</span>
                        <span className="text-[11px] text-save-green bg-save-green/10 px-1.5 py-0.5 rounded">
                          省¥{item.saved}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Replace button for activities & restaurants */}
                {(item.type === 'activity' || item.type === 'restaurant') && onReplaceItem && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onReplaceItem(item); }}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-text-hint
                               hover:text-meituan-dark transition-colors"
                  >
                    <RefreshCw size={11} />
                    换一个
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Addon recommendation */}
        {(() => {
          if (!weather || !constraint) return null;
          const activityItem = plan.items.find(i => i.type === 'activity');
          if (!activityItem) return null;
          const tags = plan.items
            .filter(i => i.type === 'activity')
            .flatMap(i => {
              const detail = i.detail || '';
              return detail.includes('户外') ? ['户外'] : [];
            });
          const check = shouldTriggerAddon(
            tags, weather.temp, constraint.occasion,
            constraint.kidAge, 120, constraint.scenario,
          );
          if (!check.trigger || !check.type) return null;
          const option = addonOptions[check.type];
          if (!option) return null;
          const icons: Record<string, typeof Coffee> = { cold_drink: Coffee, flowers: Gift, snack: Cookie };
          const Icon = icons[check.type] || Package;
          return (
            <div className="mt-4 p-4 rounded-xl border-2 border-meituan-dark bg-[#FFF9E6]">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className="text-meituan-dark" />
                <span className="text-sm font-semibold text-text-primary">{option.name}</span>
                <span className="text-xs text-save-green font-semibold">¥{option.price}</span>
              </div>
              <p className="text-xs text-text-hint mb-3">{check.message || option.deliveryTime}</p>
              {onAddonOrder && (
                <button
                  onClick={() => onAddonOrder(check.type!)}
                  className="w-full py-2 rounded-lg bg-meituan-dark text-white text-xs font-semibold
                             hover:bg-meituan-light transition-colors"
                >
                  下单{option.name} · ¥{option.price}
                </button>
              )}
            </div>
          );
        })()}

        {/* Claimable coupons alert */}
        {plan.couponMatches && plan.couponMatches.filter(c => c.source === 'claimable').length > 0 && (() => {
          const claimable = plan.couponMatches.filter(c => c.source === 'claimable');
          const totalSavings = claimable.reduce((s, c) => s + c.saved, 0);
          return (
            <div className="mt-3 p-3 rounded-xl bg-save-green/5 border border-save-green/20">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-save-green" />
                <span className="text-sm font-semibold text-text-primary">
                  有{claimable.length}张券可领，再省¥{totalSavings}
                </span>
              </div>
              <p className="text-xs text-text-hint mt-1">去「省钱」tab 一键领取</p>
            </div>
          );
        })()}

        {/* Summary */}
        <div className="mt-4 p-4 bg-bg-gray rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-hint">原价</span>
            <span className="text-text-hint line-through">¥{plan.totalOriginal}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-text-hint">券后实付</span>
            <span className="text-save-green font-semibold text-lg">¥{plan.totalActual}</span>
          </div>
          {plan.totalSaved > 0 && (
            <div className="flex items-center justify-between text-sm mt-1 pt-2 border-t border-border">
              <span className="flex items-center gap-1 text-text-hint">
                <Sparkles size={14} />
                累计省钱
              </span>
              <span className="text-save-green font-semibold">¥{plan.totalSaved}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
