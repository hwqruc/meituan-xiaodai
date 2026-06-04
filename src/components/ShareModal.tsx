import { X, Copy, Check, Clock, MapPin, Users, UserPlus } from 'lucide-react';
import type { Plan } from '../types';
import { useState } from 'react';

interface Props {
  plan: Plan;
  peopleCount?: number;
  onClose: () => void;
  onJoinClick?: () => void;
}

export default function ShareModal({ plan, peopleCount = 2, onClose, onJoinClick }: Props) {
  const [copied, setCopied] = useState(false);
  const [joined, setJoined] = useState(false);

  const lines = [
    '🎯 周末出行方案',
    '',
    ...plan.items.map(item => {
      const icon = item.type === 'activity' ? '🎮' : item.type === 'restaurant' ? '🍽️' : item.type === 'transport' ? '🚗' : '📦';
      let line = `${icon} ${item.time} ${item.name}`;
      if (item.price > 0) line += ` · ¥${item.price}`;
      if (item.detail) line += `\n   ${item.detail}`;
      return line;
    }),
    '',
    `💰 原价 ¥${plan.totalOriginal} → 实付 ¥${plan.totalActual}`,
    plan.totalSaved > 0 ? `🤑 省了 ¥${plan.totalSaved}` : '',
  ].filter(Boolean);
  const shareText = lines.join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Users size={18} className="text-meituan-dark" />
              {peopleCount}人局
            </h2>
            <p className="text-xs text-text-hint mt-0.5">
              {joined ? `你已加入，现在是${peopleCount + 1}人局了！` : '朋友打开即可查看行程'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg-gray rounded-lg">
            <X size={20} className="text-text-hint" />
          </button>
        </div>

        {/* Preview card */}
        <div className="p-5">
          <div className="bg-[#FFF9E6] border border-[#FFD100] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-meituan-dark" />
              <span className="text-sm font-semibold text-text-primary">周末出行方案</span>
            </div>

            {plan.items.map((item, i) => (
              <div key={i} className="flex gap-3 mb-3 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    item.type === 'activity' ? 'bg-[#FFD100]' :
                    item.type === 'restaurant' ? 'bg-[#4CAF50]' :
                    item.type === 'transport' ? 'bg-border' : 'bg-[#9C27B0]'
                  }`} />
                  {i < plan.items.length - 1 && <div className="w-0.5 flex-1 bg-border my-0.5" />}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-hint"><Clock size={10} className="inline" /> {item.time}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-bg-gray text-text-hint">
                      {item.type === 'activity' ? '活动' : item.type === 'restaurant' ? '餐厅' : item.type === 'transport' ? '路程' : '闪送'}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-0.5">{item.name}</p>
                  {item.price > 0 && (
                    <p className="text-sm font-semibold text-save-green mt-0.5">¥{item.price}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-4 pt-3 border-t border-[#FFD100]/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-hint">原价</span>
                <span className="text-text-hint line-through">¥{plan.totalOriginal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-hint">实付</span>
                <span className="font-semibold text-save-green">¥{plan.totalActual}</span>
              </div>
              {plan.totalSaved > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-hint">已省</span>
                  <span className="text-save-green font-semibold">¥{plan.totalSaved}</span>
                </div>
              )}
            </div>
          </div>

          {/* Join + Copy buttons */}
          <div className="mt-4 space-y-2">
            {onJoinClick && !joined && (
              <button
                onClick={() => { setJoined(true); onJoinClick(); }}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
                           bg-[#E8F5E9] text-save-green border-2 border-save-green
                           hover:bg-save-green hover:text-white transition-colors"
              >
                <UserPlus size={16} />
                我也去！加入这个局
              </button>
            )}
            {joined && (
              <div className="w-full py-3 rounded-xl text-sm font-semibold text-center
                              bg-save-green/10 text-save-green border-2 border-save-green">
                <Check size={16} className="inline mr-1" />
                已加入！现在是 {peopleCount + 1} 人局，人均省 ¥{Math.round(plan.totalSaved / peopleCount * (peopleCount + 1) - plan.totalSaved)}
              </div>
            )}
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-save-green/10 text-save-green border-2 border-save-green'
                  : 'bg-meituan-dark text-white hover:bg-meituan-light'
              }`}
            >
              {copied ? <><Check size={16} /> 已复制</> : <><Copy size={16} /> 复制发送给朋友/家人</>}
            </button>
          </div>
          <p className="text-xs text-text-hint text-center mt-2">
            {joined ? '已通知发起人，行程已自动更新人数' : '复制后粘贴到微信即可分享，朋友可以查看+加入'}
          </p>
        </div>
      </div>
    </div>
  );
}
