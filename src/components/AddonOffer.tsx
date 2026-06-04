import { Package, Check, X, Clock } from 'lucide-react';
import type { AddonOption } from '../tools/addon';

interface Props {
  addon: AddonOption;
  onResponse: (action: 'accept' | 'decline' | 'later') => void;
}

const typeLabel: Record<string, string> = {
  cold_drink: '闪送冰饮',
  flowers: '闪送花束',
  snack: '闪送零食',
};

export default function AddonOffer({ addon, onResponse }: Props) {
  return (
    <div className="bg-white border border-meituan rounded-xl overflow-hidden shadow-sm">
      {/* Banner */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#FFF9E6] to-white border-b border-meituan/20">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-text-primary" />
          <span className="text-sm font-semibold text-text-primary">
            {typeLabel[addon.type] || '闪送'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-meituan text-text-primary font-medium">
            推荐
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Image placeholder */}
        <div className="h-24 bg-gradient-to-br from-meituan/10 to-meituan/5 rounded-lg mb-3 flex items-center justify-center">
          <Package size={32} className="text-text-hint/40" />
        </div>

        <h4 className="text-sm font-semibold text-text-primary mb-1">{addon.name}</h4>
        <p className="text-xs text-text-hint mb-1">{addon.deliveryTime}</p>
        <p className="text-lg font-bold text-save-green mb-4">¥{addon.price}</p>

        {/* Three options */}
        <div className="space-y-2">
          <button
            onClick={() => onResponse('accept')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg
                       bg-gradient-to-r from-meituan to-meituan-dark
                       text-sm font-medium text-text-primary
                       hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Check size={16} />
            行，来一个
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onResponse('later')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                         border border-border text-xs text-text-secondary
                         hover:bg-bg-gray transition-colors"
            >
              <Clock size={14} />
              稍后决定
            </button>
            <button
              onClick={() => onResponse('decline')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                         border border-border text-xs text-text-secondary
                         hover:bg-bg-gray transition-colors"
            >
              <X size={14} />
              不用了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
