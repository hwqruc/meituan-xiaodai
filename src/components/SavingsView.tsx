import { ReceiptText, Ticket, Gift, TrendingDown, Sparkles, ShoppingBag } from 'lucide-react';
import type { Plan } from '../types';

interface Props {
  plan: Plan | null;
  onClaimCoupon?: (couponId: string, couponName: string) => void;
}

export default function SavingsView({ plan, onClaimCoupon }: Props) {
  if (!plan || plan.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-hint p-8">
        <ReceiptText size={40} strokeWidth={1} />
        <p className="mt-3 text-sm">还没有账单</p>
        <p className="text-xs mt-1">完成规划后在这里查看省钱详情</p>
      </div>
    );
  }

  const ownedCoupons = plan.couponMatches.filter((c) => c.source === 'owned');
  const claimableCoupons = plan.couponMatches.filter((c) => c.source === 'claimable');
  const totalClaimableSave = claimableCoupons.reduce((s, c) => s + c.saved, 0);

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
      <div className="px-4 py-4">
        {/* Header */}
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ReceiptText size={16} className="text-meituan-dark" />
          账单与省钱
        </h3>

        {/* Hero savings card — Meituan style */}
        <div className="bg-gradient-to-br from-[#FFF9E6] via-[#FFF3CD] to-[#FFE082]
                        rounded-xl p-4 mb-4 border border-[#FFE082] relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-meituan/20" />
          <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-meituan/10" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-[#E6B800]" />
              <span className="text-[11px] text-[#B8860B] font-medium">美团小袋帮你省</span>
            </div>
            <p className="text-3xl font-bold text-[#E74C3C]">¥{plan.totalSaved}</p>
            <p className="text-[11px] text-text-hint mt-1">
              原价 ¥{plan.totalOriginal} · 预计 ¥{plan.totalActual}
            </p>
          </div>
        </div>

        {/* Line items — like a Meituan order receipt */}
        <div className="bg-white border border-border rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-2.5 bg-bg-gray border-b border-border">
            <span className="text-[12px] font-medium text-text-secondary flex items-center gap-1.5">
              <ShoppingBag size={13} />
              消费明细
            </span>
          </div>
          {plan.items.filter((i) => i.type !== 'transport' && i.price > 0).map((item, i) => (
            <div key={i} className="px-4 py-2.5 border-b border-border last:border-0 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text-primary truncate">{item.name}</p>
                <p className="text-[10px] text-text-hint">
                  {item.type === 'activity' ? '团购价' : '到店美食'} · {item.detail}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-semibold text-[#E74C3C]">¥{item.price}</p>
                {item.saved > 0 && (
                  <p className="text-[10px] text-text-hint line-through">¥{item.originalPrice}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Coupons used — "神券" style */}
        {ownedCoupons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[12px] font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <Ticket size={14} className="text-meituan-dark" />
              可用神券
            </h4>
            <div className="space-y-2">
              {ownedCoupons.map((cm) => (
                <div
                  key={cm.coupon.id}
                  className="bg-gradient-to-r from-[#FFF9E6] to-white border border-[#FFE082]
                             rounded-lg px-3 py-2.5 flex items-center gap-3"
                >
                  {/* Coupon icon */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-meituan to-meituan-dark
                                  flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[15px] font-bold text-white">¥{cm.saved}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium">{cm.coupon.name}</p>
                    <p className="text-[10px] text-text-hint">
                      满{cm.coupon.threshold}减{cm.coupon.reduceAmount} · 有效期至{cm.coupon.validUntil}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#E6B800]">-¥{cm.saved}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claimable coupons */}
        {claimableCoupons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[12px] font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <Gift size={14} className="text-meituan-dark" />
              可领神券 · 还能再省 ¥{totalClaimableSave}
            </h4>
            <div className="space-y-2">
              {claimableCoupons.map((cm) => (
                <div
                  key={cm.coupon.id}
                  className="bg-white border border-dashed border-meituan rounded-lg px-3 py-2.5
                             flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FFF9E6] border border-[#FFE082]
                                  flex items-center justify-center shrink-0">
                    <span className="text-[15px] font-bold text-[#E6B800]">¥{cm.saved}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary font-medium">{cm.coupon.name}</p>
                    <p className="text-[10px] text-text-hint">
                      满{cm.coupon.threshold}减{cm.coupon.reduceAmount}
                    </p>
                  </div>
                  <button
                    onClick={() => onClaimCoupon?.(cm.coupon.id, cm.coupon.name)}
                    className="px-3 py-1.5 rounded-full bg-gradient-to-r from-meituan to-meituan-dark
                               text-[11px] font-medium text-text-primary hover:opacity-90
                               transition-all active:scale-95"
                  >
                    去领取
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price comparison — 同品质比价 */}
        {plan.priceComparisons && plan.priceComparisons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[12px] font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              <TrendingDown size={14} className="text-meituan-dark" />
              同品质更低价
            </h4>
            <div className="space-y-2">
              {plan.priceComparisons.slice(0, 2).map((pc, i) => (
                <div
                  key={i}
                  className="bg-bg-gray rounded-lg px-3 py-2.5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[13px] text-text-primary">{pc.alternativeName}</p>
                    <p className="text-[10px] text-text-hint">
                      评分 {pc.alternativeRating} · 比当前省 ¥{pc.savedIfSwitch}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#E74C3C]">
                    ¥{pc.alternativePrice}/人
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
