import { Users, Clock, MapPin, Star, Award, Shield } from 'lucide-react';

export interface PinChangSessionData {
  id: string;
  name: string;
  category: string;
  timeSlot: string;
  date: string;
  price: number;
  currentCount: number;
  maxCount: number;
  location: string;
  difficulty: string;
  equipment: string;
  tags: string[];
  rating: number;
  durationMin: number;
  host: string;
  hostVerified: boolean;
}

interface Props {
  sessions: PinChangSessionData[];
  onSelect: (session: PinChangSessionData) => void;
  peopleCount: number;
}

const difficultyLabels: Record<string, string> = {
  beginner: '新手友好',
  intermediate: '有一定基础',
  advanced: '进阶玩家',
};

export default function PinChangCard({ sessions, onSelect, peopleCount }: Props) {
  if (sessions.length === 0) return null;

  return (
    <div className="pl-12 pr-4 mb-4">
      <p className="text-xs text-text-hint mb-2 flex items-center gap-1">
        <Users size={12} />
        美团拼场 · 找搭子一起玩
      </p>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1" style={{ scrollSnapType: 'x mandatory' }}>
        {sessions.map((s) => {
          const spots = s.maxCount - s.currentCount;
          const isFull = spots <= 0;
          const totalPrice = s.price * peopleCount;
          return (
            <button
              key={s.id}
              onClick={() => !isFull && onSelect(s)}
              disabled={isFull}
              className={`shrink-0 w-[220px] rounded-xl border-2 p-4 text-left transition-colors scroll-snap-align-start ${
                isFull
                  ? 'border-border bg-bg-gray opacity-50 cursor-not-allowed'
                  : 'border-[#FFD100] bg-[#FFF9E6] hover:border-meituan-dark'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Category + rating */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-meituan-dark text-white font-medium">
                  {s.category}
                </span>
                <span className="text-[11px] text-text-hint flex items-center gap-0.5">
                  <Star size={11} className="text-[#FFD100] fill-[#FFD100]" />
                  {s.rating}
                </span>
              </div>

              {/* Name */}
              <p className="text-sm font-semibold text-text-primary mb-2 line-clamp-2">{s.name}</p>

              {/* Time + location */}
              <div className="space-y-1 mb-3">
                <p className="text-xs text-text-hint flex items-center gap-1">
                  <Clock size={11} />
                  {s.timeSlot} · {s.date}
                </p>
                <p className="text-xs text-text-hint flex items-center gap-1">
                  <MapPin size={11} />
                  {s.location}
                </p>
              </div>

              {/* Participants */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-meituan-dark rounded-full transition-all"
                    style={{ width: `${(s.currentCount / s.maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-text-hint whitespace-nowrap">
                  {s.currentCount}/{s.maxCount}人
                </span>
              </div>

              {/* Difficulty + host */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-gray text-text-hint">
                  {difficultyLabels[s.difficulty] || s.difficulty}
                </span>
                <span className="text-[10px] text-text-hint flex items-center gap-0.5">
                  {s.hostVerified && <Shield size={10} className="text-save-green" />}
                  {s.host}
                </span>
              </div>

              {/* Equipment */}
              {s.equipment && (
                <p className="text-[10px] text-text-hint mb-3 leading-relaxed">{s.equipment}</p>
              )}

              {/* Price + CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-[#FFD100]/50">
                <div>
                  <span className="text-sm font-bold text-save-green">¥{s.price}</span>
                  <span className="text-[11px] text-text-hint">/人</span>
                  {peopleCount > 1 && (
                    <span className="text-[10px] text-text-hint ml-1">共¥{totalPrice}</span>
                  )}
                </div>
                {isFull ? (
                  <span className="text-[11px] text-text-hint">已满</span>
                ) : spots <= 3 ? (
                  <span className="text-[11px] text-meituan-dark font-semibold">仅剩{spots}位</span>
                ) : (
                  <Award size={14} className="text-meituan-dark" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
