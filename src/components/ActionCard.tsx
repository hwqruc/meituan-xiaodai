import { ShoppingCart, UserCheck, Clock } from 'lucide-react';
import type { PlanItem } from '../types';

interface Props {
  item: PlanItem;
  onAction: (actionType: string) => void;
}

const actionConfig: Record<string, { label: string; desc: string; color: string }> = {
  purchase_tickets: { label: '去美团下单', desc: '打开美团App，神券自动抵扣', color: 'bg-gradient-to-r from-red-500 to-orange-500' },
  book_table: { label: '去美团订座', desc: '打开餐厅预订页，选择时间', color: 'bg-gradient-to-r from-meituan to-meituan-dark' },
  take_queue: { label: '去排队取号', desc: '打开线上取号，到号提醒', color: 'bg-gradient-to-r from-meituan to-meituan-dark' },
  apply_coupon: { label: '查看神券', desc: '这张券你已有，下单自动抵扣', color: 'bg-gradient-to-r from-[#E6B800] to-[#C8960A]' },
  claim_coupon: { label: '去领神券', desc: '打开美团领券页，领完再下单', color: 'bg-gradient-to-r from-[#FFD100] to-[#E6B800]' },
  order_addon: { label: '去下单闪送', desc: '打开闪送页，选送达时间', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
};

export default function ActionCard({ item, onAction }: Props) {
  const typeLabel = item.type === 'activity' ? '到店玩乐' : '到店美食';

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-bg-gray to-white border-b border-border">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-meituan/20 text-[#B8860B] font-medium">
            {typeLabel}
          </span>
          {item.saved > 0 && (
            <span className="text-[10px] text-[#E6B800] font-medium bg-[#FFF9E6] px-1.5 py-0.5 rounded-full">
             可省 ¥{item.saved}
            </span>
          )}
        </div>
        <p className="text-[13px] font-semibold text-text-primary mt-1">{item.name}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-lg font-bold text-[#E74C3C]">¥{item.price}</span>
          {item.saved > 0 && (
            <span className="text-[11px] text-text-hint line-through">¥{item.originalPrice}</span>
          )}
        </div>
      </div>

      {/* Action buttons — each with Meituan-style gradient */}
      <div className="p-2 space-y-1.5">
        {item.actions.map((action, i) => {
          const config = actionConfig[action.type] || { label: action.label, desc: '', color: 'bg-meituan' };
          return (
            <button
              key={i}
              onClick={() => onAction(action.type)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                          text-white transition-all active:scale-[0.98] hover:opacity-90 ${config.color}`}
            >
              <ShoppingCart size={16} className="shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium">{config.label}</p>
                <p className="text-[10px] text-white/70">{config.desc}</p>
              </div>
              <span className="text-[10px] opacity-60">→</span>
            </button>
          );
        })}

        {/* Divider + two alternative options */}
        <div className="border-t border-border pt-2 mt-1.5 flex gap-2">
          <button
            onClick={() => onAction('self')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                       border border-border text-[11px] text-text-secondary
                       hover:bg-bg-gray transition-colors"
          >
            <UserCheck size={13} />
            我自己来
          </button>
          <button
            onClick={() => onAction('later')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                       border border-border text-[11px] text-text-secondary
                       hover:bg-bg-gray transition-colors"
          >
            <Clock size={13} />
            稍后
          </button>
        </div>
      </div>
    </div>
  );
}
