import type { Coupon, CouponMatch } from '../types';

export const userCoupons: Coupon[] = [
  {
    id: 'coup-001',
    name: '休闲娱乐满200减30',
    type: 'merchant_full_reduce',
    description: '休闲娱乐品类满200减30',
    reduceAmount: 30,
    threshold: 200,
    applicableCategories: ['密室逃脱', '剧本杀', '手工DIY', '运动竞技'],
    validUntil: '2026-05-31',
    owned: true,
    claimable: false,
  },
  {
    id: 'coup-002',
    name: '天天神券满150减12',
    type: 'platform_full_reduce',
    description: '通用满150减12',
    reduceAmount: 12,
    threshold: 150,
    applicableCategories: [],
    validUntil: '2026-05-25',
    owned: true,
    claimable: false,
  },
  {
    id: 'coup-003',
    name: '轻食沙拉满80减10',
    type: 'category_special',
    description: '轻食沙拉品类满80减10',
    reduceAmount: 10,
    threshold: 80,
    applicableCategories: ['轻食沙拉'],
    validUntil: '2026-06-15',
    owned: true,
    claimable: false,
  },
  {
    id: 'coup-004',
    name: '亲子活动满100减15',
    type: 'merchant_full_reduce',
    description: '亲子活动品类满100减15',
    reduceAmount: 15,
    threshold: 100,
    applicableCategories: ['手工DIY', '户外公园', '科技馆'],
    validUntil: '2026-05-28',
    owned: true,
    claimable: false,
  },
  {
    id: 'coup-005',
    name: '会员无门槛8元券',
    type: 'member_no_threshold',
    description: '每日可领，无门槛减8元',
    reduceAmount: 8,
    threshold: 0,
    applicableCategories: [],
    validUntil: '2026-05-21',
    owned: false,
    claimable: true,
  },
];

export const claimableCoupons: Coupon[] = [
  {
    id: 'coup-006',
    name: '望京商圈专享满100减15',
    type: 'category_special',
    description: '望京商圈指定商户满100减15',
    reduceAmount: 15,
    threshold: 100,
    applicableCategories: ['密室逃脱', '手工DIY', '轻食沙拉', '日料'],
    validUntil: '2026-06-30',
    owned: false,
    claimable: true,
  },
  {
    id: 'coup-007',
    name: '火锅满200减25',
    type: 'merchant_full_reduce',
    description: '火锅品类满200减25',
    reduceAmount: 25,
    threshold: 200,
    applicableCategories: ['火锅'],
    validUntil: '2026-06-10',
    owned: false,
    claimable: true,
  },
];

export const allCoupons: Coupon[] = [...userCoupons, ...claimableCoupons];

export function matchCoupons(poiId: string, poiCategory: string, totalPrice: number): CouponMatch[] {
  const matches: CouponMatch[] = [];

  for (const coupon of allCoupons) {
    // Check expiration
    if (new Date(coupon.validUntil) < new Date()) continue;

    // Check category applicability
    const applies =
      coupon.applicableCategories.length === 0 ||
      coupon.applicableCategories.includes(poiCategory);
    if (!applies) continue;

    // Check specific POI restriction
    if (coupon.applicablePoiIds && !coupon.applicablePoiIds.includes(poiId)) continue;

    // Check threshold
    if (totalPrice < coupon.threshold) continue;

    const afterCoupon = totalPrice - coupon.reduceAmount;
    matches.push({
      coupon,
      poiId,
      poiName: '',
      originalPrice: totalPrice,
      afterCoupon,
      saved: coupon.reduceAmount,
      source: coupon.owned ? 'owned' : 'claimable',
    });
  }

  // Sort: owned first, then by saved amount desc
  matches.sort((a, b) => {
    if (a.source === 'owned' && b.source === 'claimable') return -1;
    if (a.source === 'claimable' && b.source === 'owned') return 1;
    return b.saved - a.saved;
  });

  return matches;
}

// Layer 3: Same-quality price comparison
export interface PriceComparison {
  currentPoiId: string;
  currentName: string;
  currentPrice: number;
  currentRating: number;
  alternativePoiId: string;
  alternativeName: string;
  alternativePrice: number;
  alternativeRating: number;
  savedIfSwitch: number;
}

export function findCheaperAlternatives(
  currentId: string,
  currentPrice: number,
  currentRating: number,
  candidates: { id: string; name: string; price: number; rating: number }[],
): PriceComparison[] {
  return candidates
    .filter((c) => c.id !== currentId)
    .filter((c) => Math.abs(c.rating - currentRating) <= 0.3)
    .filter((c) => c.price < currentPrice)
    .map((c) => ({
      currentPoiId: currentId,
      currentName: '',
      currentPrice,
      currentRating,
      alternativePoiId: c.id,
      alternativeName: c.name,
      alternativePrice: c.price,
      alternativeRating: c.rating,
      savedIfSwitch: currentPrice - c.price,
    }))
    .sort((a, b) => b.savedIfSwitch - a.savedIfSwitch);
}
