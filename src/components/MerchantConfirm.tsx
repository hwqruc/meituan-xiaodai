import { Star, MapPin, Check, Eye, Ticket } from 'lucide-react';
import type { PendingMerchant } from '../store/useStore';

interface Props {
  merchant: PendingMerchant;
  onConfirm: () => void;
  onViewOthers: () => void;
}

export default function MerchantConfirm({ merchant, onConfirm, onViewOthers }: Props) {
  const typeLabel = merchant.type === 'activity' ? '到店玩乐' : '到店美食';
  const discount = merchant.price > merchant.groupPrice
    ? Math.round((1 - merchant.groupPrice / merchant.price) * 100)
    : 0;

  return (
    <div className="bg-white border border-[#FFE082] rounded-xl overflow-hidden shadow-md">
      {/* Header — Meituan confirmation style */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#FFF9E6] to-white border-b border-[#FFE082]/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-meituan text-text-primary font-medium">
            {typeLabel}
          </span>
          <span className="text-[11px] text-text-hint">你要选这家吗？</span>
        </div>
        <h4 className="text-sm font-semibold text-text-primary mt-1.5">{merchant.name}</h4>
      </div>

      {/* Details */}
      <div className="p-4">
        {/* Image placeholder */}
        <div className="h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3
                        flex items-center justify-center relative overflow-hidden">
          {merchant.type === 'activity' ? (
            <Ticket size={40} className="text-slate-300" />
          ) : (
            <Star size={40} className="text-slate-300" />
          )}
          {/* 团购 角标 */}
          <div className="absolute top-2 left-2">
            <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white
                             text-[10px] px-2 py-0.5 rounded-md font-medium">
              团购
            </span>
          </div>
          {discount > 0 && (
            <div className="absolute top-2 right-2">
              <span className="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
                {discount}%off
              </span>
            </div>
          )}
        </div>

        {/* Rating + detail */}
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center gap-0.5 text-xs">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="font-medium text-text-primary">{merchant.rating}</span>
          </span>
          <span className="text-[11px] text-text-hint">{merchant.detail}</span>
        </div>

        {/* Tags */}
        <div className="flex gap-1 flex-wrap mb-3">
          {merchant.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-border/60
                                       bg-bg-gray/50 text-text-hint">
              {tag}
            </span>
          ))}
        </div>

        {/* Price — Meituan 团购价 style */}
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#E74C3C] leading-none">
              ¥{merchant.groupPrice}
            </span>
            {merchant.price > merchant.groupPrice && (
              <span className="text-xs text-text-hint line-through leading-none">
                ¥{merchant.price}
              </span>
            )}
            <span className="text-[11px] text-text-hint">/人</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg
                       bg-gradient-to-r from-meituan to-meituan-dark
                       text-sm font-medium text-text-primary
                       hover:opacity-90 transition-all active:scale-[0.98] shadow-sm"
          >
            <Check size={16} />
            选这家列入行程
          </button>
          <button
            onClick={onViewOthers}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg
                       border border-border text-sm text-text-secondary
                       hover:bg-bg-gray transition-all active:scale-[0.98]"
          >
            <Eye size={16} />
            看看别的
          </button>
        </div>
      </div>
    </div>
  );
}
