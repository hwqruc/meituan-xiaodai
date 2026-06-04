import { X, Ticket, ChefHat, Gift, Sparkles, Check } from 'lucide-react';
import type { Plan } from '../types';
import { useState } from 'react';

interface Props {
  plan: Plan;
  onClose: () => void;
  onConfirm: () => void;
}

const actionIcons: Record<string, typeof Ticket> = {
  purchase_tickets: Ticket,
  book_table: ChefHat,
  take_queue: ChefHat,
  apply_coupon: Sparkles,
  claim_coupon: Gift,
  order_addon: Gift,
};

export default function CheckoutModal({ plan, onClose, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const allActions = plan.items.flatMap(item =>
    item.actions.map(a => ({
      ...a,
      itemName: item.name,
      itemTime: item.time,
      itemPrice: item.price,
    }))
  );

  const pendingActions = allActions.filter(a => a.status === 'pending');
  const totalPrice = plan.totalActual;

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-semibold">
            {confirmed ? '全部搞定！' : '确认下单'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-bg-gray rounded-lg">
            <X size={20} className="text-text-hint" />
          </button>
        </div>

        <div className="p-5">
          {confirmed ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-save-green/10 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-save-green" />
              </div>
              <p className="text-lg font-semibold text-text-primary">全部安排好了！</p>
              <p className="text-sm text-text-hint mt-1">
                {allActions.length} 个操作已确认，美团的提醒会按时推送
              </p>
            </div>
          ) : (
            <>
              {/* Action list */}
              <div className="space-y-2 mb-4">
                {allActions.map((a, i) => {
                  const Icon = actionIcons[a.type] || Ticket;
                  const isPending = a.status !== 'done';
                  return (
                    <div key={i}
                         className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                           isPending ? 'border-border bg-white' : 'border-save-green/20 bg-save-green/5'
                         }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isPending ? 'bg-meituan-dark/10 text-meituan-dark' : 'bg-save-green/10 text-save-green'
                      }`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isPending ? 'font-medium' : 'text-text-hint'}`}>
                          {a.label}
                        </p>
                        <p className="text-xs text-text-hint">{a.itemName} · {a.itemTime}</p>
                      </div>
                      {!isPending && <Check size={16} className="text-save-green shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-bg-gray rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-hint">行程项</span>
                  <span>{plan.items.length} 项</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-hint">待处理操作</span>
                  <span className="text-meituan-dark font-medium">{pendingActions.length} 个</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-text-hint">预计实付</span>
                  <span className="text-save-green font-semibold text-lg">¥{totalPrice}</span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-meituan-dark text-white text-sm font-semibold
                           hover:bg-meituan-light transition-colors"
              >
                确认全部下单 · ¥{totalPrice}
              </button>
              <p className="text-xs text-text-hint text-center mt-2">
                购票、订座、取号、领券将一并处理
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
