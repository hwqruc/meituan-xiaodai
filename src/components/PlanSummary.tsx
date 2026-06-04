import { Clock, Sparkles, Ticket } from 'lucide-react';
import type { Plan } from '../types';

interface Props {
  plan: Plan;
}

export default function PlanSummary({ plan }: Props) {
  const ownedCoupons = plan.couponMatches.filter((c) => c.source === 'owned');
  const claimableCoupons = plan.couponMatches.filter((c) => c.source === 'claimable');

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header banner — Meituan style */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#FFF9E6] via-[#FFF3CD] to-white
                      border-b border-[#FFE082] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket size={16} className="text-[#E6B800]" />
          <h3 className="text-[13px] font-semibold text-text-primary">
            行程已生成
          </h3>
        </div>
        {plan.totalSaved > 0 && (
          <span className="text-xs text-[#E6B800] font-medium bg-[#FFF9E6] px-2 py-0.5 rounded-full
                           border border-[#FFE082]">
            可省 ¥{plan.totalSaved}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        <div className="relative">
          {plan.items.map((item, i) => {
            const isTransport = item.type === 'transport';
            return (
              <div key={i} className="flex gap-3 pb-3 last:pb-0">
                {/* Timeline node */}
                <div className="flex flex-col items-center">
                  {!isTransport ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-meituan mt-1.5 shrink-0 ring-2 ring-meituan/20" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-border mt-2 shrink-0" />
                  )}
                  {i < plan.items.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${isTransport ? 'bg-border border-dashed' : 'bg-meituan/20'}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-hint mb-0.5">
                    <Clock size={10} />
                    <span>{item.time}</span>
                    {item.detail && !isTransport && (
                      <span className="truncate">· {item.detail}</span>
                    )}
                  </div>
                  <p className={`text-[13px] ${isTransport ? 'text-text-hint' : 'text-text-primary font-medium'}`}>
                    {item.name}
                  </p>
                  {!isTransport && item.price > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* 团购价 — red highlight */}
                      <span className="text-sm font-bold text-[#E74C3C]">
                        ¥{item.price}
                      </span>
                      {item.saved > 0 && (
                        <>
                          <span className="text-[11px] text-text-hint line-through">
                            ¥{item.originalPrice}
                          </span>
                          <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">
                            省¥{item.saved}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {/* Coupon matched */}
                  {item.couponMatched && item.saved > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[10px] w-4 h-4 rounded bg-meituan flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-white">券</span>
                      </span>
                      <span className="text-[11px] text-[#B8860B]">
                        {item.couponMatched.coupon.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar — Meituan order summary style */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-bg-gray to-white border-t border-border">
        <div className="flex items-center justify-between mb-1 text-[11px]">
          <span className="text-text-hint">原价</span>
          <span className="text-text-hint line-through">¥{plan.totalOriginal}</span>
        </div>
        {ownedCoupons.length > 0 && (
          <div className="flex items-center justify-between mb-1 text-[11px]">
            <span className="text-[#B8860B] flex items-center gap-1">
              <Sparkles size={11} />
              神券抵扣
            </span>
            <span className="text-[#E6B800] font-medium">-¥{plan.totalSaved}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
          <span className="text-[12px] font-semibold text-text-primary">预计实付</span>
          <span className="text-lg font-bold text-[#E74C3C]">¥{plan.totalActual}</span>
        </div>
      </div>

      {/* Claimable coupon hint */}
      {claimableCoupons.length > 0 && (
        <div className="px-4 py-2 bg-[#FFF9E6] border-t border-[#FFE082]">
          <p className="text-[11px] text-[#B8860B] text-center">
            还有 {claimableCoupons.length} 张券可领，能再省 ¥
            {claimableCoupons.reduce((s, c) => s + c.saved, 0)}
          </p>
        </div>
      )}
    </div>
  );
}
