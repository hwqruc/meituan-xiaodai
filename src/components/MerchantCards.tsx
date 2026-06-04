import { useState, useRef } from 'react';
import { Star, MapPin, Clock, Ticket, ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Activity, Restaurant } from '../types';
import { matchCoupons } from '../data/coupons';

interface Props {
  items: Activity[] | Restaurant[];
  type: 'activity' | 'restaurant';
  onSelect: (id: string) => void;
  peopleCount?: number;
}

type SortKey = 'price' | 'rating';

// Fake "已售" data for Meituan feel
const soldCounts: Record<string, string> = {
  'act-001': '1.2万', 'act-002': '3.8万', 'act-003': '8600',
  'act-004': '2.1万', 'act-005': '7900', 'act-006': '4500',
  'act-007': '9800', 'act-008': '5.2万', 'act-009': '1.5万',
  'act-010': '6200', 'act-011': '3400', 'act-012': '1.1万',
  'rest-001': '2.8万', 'rest-002': '1.6万', 'rest-003': '8.2万',
  'rest-004': '12万', 'rest-005': '3.4万', 'rest-006': '5.1万',
  'rest-007': '1.9万', 'rest-008': '2.3万', 'rest-009': '7800',
  'rest-010': '6.7万',
};

export default function MerchantCards({ items, type, onSelect, peopleCount = 2 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('price');

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'price') return a.groupPrice - b.groupPrice;
    return b.rating - a.rating;
  });

  const typeLabel = type === 'activity' ? '到店玩乐' : '到店美食';

  return (
    <div>
      {/* Header bar — Meituan style */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary">
            {typeLabel}
          </span>
          <span className="text-[11px] text-text-hint">
            共{sorted.length}家
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort toggle — Meituan filter pill style */}
          <div className="flex rounded-full border border-border overflow-hidden">
            <button
              onClick={() => setSortBy('price')}
              className={`text-[11px] px-2.5 py-1 transition-colors ${
                sortBy === 'price'
                  ? 'bg-meituan text-text-primary font-medium'
                  : 'bg-white text-text-hint'
              }`}
            >
              价格最低
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`text-[11px] px-2.5 py-1 transition-colors ${
                sortBy === 'rating'
                  ? 'bg-meituan text-text-primary font-medium'
                  : 'bg-white text-text-hint'
              }`}
            >
              评分最高
            </button>
          </div>
          {sorted.length > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="w-5 h-5 rounded-full bg-white border border-border flex items-center
                           justify-center disabled:opacity-30"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="w-5 h-5 rounded-full bg-white border border-border flex items-center
                           justify-center disabled:opacity-30"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards — Meituan merchant card style */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-1"
      >
        {sorted.map((item) => {
          const totalPrice = item.groupPrice * peopleCount;
          const coupons = matchCoupons(item.id, item.category, totalPrice);
          const bestCoupon = coupons.find((c) => c.source === 'owned');
          const sold = soldCounts[item.id] || '5000';

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="shrink-0 w-[230px] snap-start bg-white rounded-xl overflow-hidden
                         shadow-sm border border-border/60 hover:shadow-md
                         transition-all active:scale-[0.98] text-left"
            >
              {/* Hero image area — Meituan 4:3 ratio */}
              <div className="relative h-[132px] bg-gradient-to-br from-slate-100 to-slate-200">
                {/* Placeholder for real image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {isActivity(item) ? (
                    <Ticket size={40} className="text-slate-300" />
                  ) : (
                    <ChefHat size={40} className="text-slate-300" />
                  )}
                </div>

                {/* 团购 tag — top-left */}
                <div className="absolute top-2 left-2">
                  <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white
                                   text-[10px] px-2 py-0.5 rounded-md font-medium">
                    团购
                  </span>
                </div>

                {/* Availability / Queue badge — top-right */}
                <div className="absolute top-2 right-2">
                  {isActivity(item) ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm ${
                      item.availableTickets < 5
                        ? 'bg-red-500/90 text-white'
                        : 'bg-black/50 text-white'
                    }`}>
                      余{item.availableTickets}张
                    </span>
                  ) : (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm ${
                      item.queueEstimate > 20
                        ? 'bg-orange-500/90 text-white'
                        : 'bg-black/50 text-white'
                    }`}>
                      排队{item.queueEstimate}分钟
                    </span>
                  )}
                </div>

                {/* 已售 badge — bottom-left */}
                <div className="absolute bottom-2 left-2">
                  <span className="text-[10px] text-white/80 bg-black/30 px-1.5 py-0.5 rounded">
                    已售{sold}
                  </span>
                </div>
              </div>

              {/* Info section */}
              <div className="p-2.5">
                {/* Name */}
                <h4 className="text-[13px] font-semibold text-text-primary leading-tight mb-1.5 truncate">
                  {item.name}
                </h4>

                {/* Rating + distance + tags */}
                <div className="flex items-center gap-1.5 text-[11px] text-text-hint mb-2">
                  <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                    <Star size={11} className="fill-amber-400" />
                    {item.rating}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {item.distanceKm}km
                  </span>
                  {isActivity(item) && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} />
                        {item.durationMin}min
                      </span>
                    </>
                  )}
                </div>

                {/* Tags row */}
                <div className="flex gap-1 flex-wrap mb-2.5">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-text-hint bg-bg-gray/50">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Price row — THE Meituan signature element */}
                <div className="flex items-end justify-between">
                  <div className="flex items-baseline gap-1.5">
                    {/* 团购价 in red */}
                    <span className="text-xl font-bold text-[#E74C3C] leading-none">
                      ¥{item.groupPrice}
                    </span>
                    {/* 原价 crossed out */}
                    {item.price > item.groupPrice && (
                      <span className="text-[11px] text-text-hint line-through leading-none">
                        ¥{item.price}
                      </span>
                    )}
                    <span className="text-[10px] text-text-hint">/人</span>
                  </div>

                  {/* Discount badge */}
                  {item.price > item.groupPrice && (
                    <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">
                      {Math.round((1 - item.groupPrice / item.price) * 100)}%off
                    </span>
                  )}
                </div>

                {/* Coupon match bar — Meituan yellow strip */}
                {bestCoupon && (
                  <div className="mt-2 flex items-center gap-1.5 bg-gradient-to-r from-[#FFF9E6] to-[#FFF3CD]
                                  border border-[#FFE082] rounded-lg px-2 py-1.5">
                    <span className="text-[11px] w-4 h-4 rounded bg-meituan flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-white">券</span>
                    </span>
                    <span className="text-[11px] text-text-secondary flex-1">
                      {bestCoupon.coupon.name}
                    </span>
                    <span className="text-[11px] font-semibold text-[#E6B800]">
                      省¥{bestCoupon.saved}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-text-hint mt-1.5 text-center">
        左右滑动浏览 · 点击卡片选商户
      </p>
    </div>
  );
}

function isActivity(item: Activity | Restaurant): item is Activity {
  return 'durationMin' in item;
}
