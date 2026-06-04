import type { Plan, PlanItem, PlanConstraint, Activity, Restaurant, CouponMatch } from '../types';
import { matchCoupons, findCheaperAlternatives, type PriceComparison } from '../data/coupons';
import { getTravelTime } from '../data/restaurants';
import { searchActivities, searchRestaurants } from './search';
import { generateRecommendation } from './llm';

export interface ComposeInput {
  constraint: PlanConstraint;
  selectedActivities?: Activity[];
  selectedRestaurant?: Restaurant;
  selectedActivityCategory?: string;
  selectedRestaurantCategory?: string;
  skipRestaurant?: boolean;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export interface ComposeResult {
  plan: Plan;
  activityCandidates?: Activity[];
  restaurantCandidates?: Restaurant[];
  activityCategories?: string[];
  restaurantCategories?: string[];
  activityMsg?: string;
  restaurantMsg?: string;
  queueWarning?: string;
  needsActivityCategory: boolean;
  needsRestaurantCategory: boolean;
  offerAnotherActivity: boolean;
  remainingMinutes: number;
  currentTime: string;
}

const ACTIVITY_BUFFER = 15; // minutes between activities
const MIN_ACTIVITY_DURATION = 60; // minimum worthwhile activity
const MIN_RESTAURANT_WINDOW = 45; // minimum time needed for a meal

export async function composePlan(input: ComposeInput): Promise<ComposeResult> {
  const { constraint, selectedActivities = [], selectedRestaurant, skipRestaurant } = input;

  const items: PlanItem[] = [];
  const couponMatches: CouponMatch[] = [];
  let activityCandidates: Activity[] | undefined;
  let restaurantCandidates: Restaurant[] | undefined;
  let activityCategories: string[] | undefined;
  let restaurantCategories: string[] | undefined;
  let needsActivityCategory = false;
  let needsRestaurantCategory = false;

  const startMin = timeToMinutes(constraint.startTime);
  const endMin = timeToMinutes(constraint.endTime);
  const totalWindow = endMin - startMin;

  // Calculate where we are in the timeline
  let currentMin = startMin;
  for (let i = 0; i < selectedActivities.length; i++) {
    currentMin += selectedActivities[i].durationMin;
    const nextAct = selectedActivities[i + 1];
    if (nextAct) {
      currentMin += getTravelTime(selectedActivities[i].district, nextAct.district);
    }
  }
  const remainingMin = Math.max(0, endMin - currentMin);
  const currentTime = minutesToTime(currentMin);

  // ---- Step 0: skipRestaurant with activities ----
  if (skipRestaurant && selectedActivities.length > 0) {
    let runningMin = startMin;
    for (let i = 0; i < selectedActivities.length; i++) {
      const act = selectedActivities[i];
      const actTotal = act.groupPrice * constraint.peopleCount;
      const actCoupons = matchCoupons(act.id, act.category, actTotal);
      const actBest = actCoupons[0];
      couponMatches.push(...actCoupons);

      items.push({
        type: 'activity',
        time: minutesToTime(runningMin),
        poiId: act.id,
        name: act.name,
        price: actBest?.source === 'owned' ? actTotal - actBest.saved : actTotal,
        originalPrice: actTotal,
        saved: actBest?.source === 'owned' ? actBest.saved : 0,
        couponMatched: actBest,
        imageUrl: act.imageUrl,
        detail: `${act.durationMin}分钟 · ${act.tags.slice(0, 3).join('·')}`,
        actions: buildActions('activity', act.id, actBest),
      });
      runningMin += act.durationMin;

      const nextAct = selectedActivities[i + 1];
      if (nextAct) {
        const travelMin = getTravelTime(act.district, nextAct.district);
        items.push({
          type: 'transport',
          time: minutesToTime(runningMin),
          name: `前往 ${nextAct.name}`,
          price: 0,
          originalPrice: 0,
          saved: 0,
          detail: `约${travelMin}分钟`,
          actions: [],
        });
        runningMin += travelMin;
      }
    }

    const totalOrig = items.reduce((s, i) => s + i.originalPrice, 0);
    const totalAct = items.reduce((s, i) => s + i.price, 0);
    const totalSaved = totalOrig - totalAct;
    const claimable = couponMatches.filter((c) => c.source === 'claimable');

    return {
      plan: { items, totalOriginal: totalOrig, totalActual: totalAct, totalSaved, couponMatches: [...couponMatches, ...claimable], priceComparisons: [] },
      needsActivityCategory: false,
      needsRestaurantCategory: false,
      offerAnotherActivity: false,
      remainingMinutes: remainingMin,
      currentTime,
      activityMsg: '好的，先不吃饭～行程安排好了！',
    };
  }

  // ---- Step 1: No activity category chosen, no activities → recommend ----
  if (!input.selectedActivityCategory && selectedActivities.length === 0) {
    activityCategories = await generateRecommendation(constraint, 'activities');

    // Fast-path: user specified a clear activity type → skip category buttons, go straight to merchants
    if (constraint.activityHint && activityCategories.length > 0) {
      const top2 = activityCategories.slice(0, 2);
      const candidates: Activity[] = [];
      for (const cat of top2) {
        const results = await searchActivities(cat, constraint);
        candidates.push(...results);
      }
      return {
        plan: { items: [], totalOriginal: 0, totalActual: 0, totalSaved: 0, couponMatches: [], priceComparisons: [] },
        activityCandidates: candidates,
        activityMsg: `按你说的，帮你搜了${top2.join('和')}的选择——`,
        needsActivityCategory: false,
        needsRestaurantCategory: false,
        offerAnotherActivity: false,
        remainingMinutes: totalWindow,
        currentTime: constraint.startTime,
      };
    }

    return {
      plan: { items: [], totalOriginal: 0, totalActual: 0, totalSaved: 0, couponMatches: [], priceComparisons: [] },
      activityCategories,
      needsActivityCategory: true,
      needsRestaurantCategory: false,
      offerAnotherActivity: false,
      remainingMinutes: totalWindow,
      currentTime: constraint.startTime,
    };
  }

  // ---- Step 2: Category chosen, search activities ----
  if (input.selectedActivityCategory && !selectedRestaurant) {
    // Only search if we don't already have candidates being shown
    activityCandidates = await searchActivities(input.selectedActivityCategory, constraint);
    const label = input.selectedActivityCategory;
    const count = activityCandidates.length;
    const sorted = [...activityCandidates].sort((a, b) => a.groupPrice - b.groupPrice);
    const cheapest = sorted[0];

    return {
      plan: { items: [], totalOriginal: 0, totalActual: 0, totalSaved: 0, couponMatches: [], priceComparisons: [] },
      activityCandidates,
      activityMsg: `帮你找了${count}家${label}，最便宜的「${cheapest.name}」¥${cheapest.groupPrice}/人。按价格排好了，左右滑着看——`,
      needsActivityCategory: false,
      needsRestaurantCategory: false,
      offerAnotherActivity: false,
      remainingMinutes: remainingMin,
      currentTime,
    };
  }

  // ---- Step 3: Activities confirmed, time-intelligent next step ----
  if (selectedActivities.length > 0 && !input.selectedRestaurantCategory && !selectedRestaurant) {
    // Calculate time after last activity
    const lastActivity = selectedActivities[selectedActivities.length - 1];

    if (remainingMin >= 90) {
      // Enough time for another activity — offer choice
      const nextTime = minutesToTime(currentMin);
      return {
        plan: buildPartialPlan(selectedActivities, constraint, startMin),
        needsActivityCategory: false,
        needsRestaurantCategory: false,
        offerAnotherActivity: true,
        remainingMinutes: remainingMin,
        currentTime: nextTime,
        activityMsg: `「${lastActivity.name}」加上了，大概${nextTime}结束。到${constraint.endTime}还有${remainingMin}分钟，要不要再排一个活动？`,
      };
    }

    if (remainingMin >= MIN_RESTAURANT_WINDOW) {
      // Enough for restaurant but not another full activity — go to restaurant
      restaurantCategories = await generateRecommendation(constraint, 'restaurants');
      const partialPlan = buildPartialPlan(selectedActivities, constraint, startMin);
      const nextTime = minutesToTime(currentMin);
      return {
        plan: partialPlan,
        restaurantCategories,
        needsActivityCategory: false,
        needsRestaurantCategory: true,
        offerAnotherActivity: false,
        remainingMinutes: remainingMin,
        currentTime: nextTime,
        activityMsg: selectedActivities.length === 1
          ? `「${lastActivity.name}」加上了。接下来吃点什么？`
          : `${selectedActivities.length}个活动安排好了。接下来吃点什么？`,
        restaurantMsg: `大概 ${nextTime} 到餐厅`,
      };
    }

    // Tight on time — skip restaurant, finalize
    const finalPlan = buildPartialPlan(selectedActivities, constraint, startMin);
    const totalO = finalPlan.items.reduce((s, i) => s + i.originalPrice, 0);
    const totalA = finalPlan.items.reduce((s, i) => s + i.price, 0);
    const saved = totalO - totalA;

    return {
      plan: {
        ...finalPlan,
        totalOriginal: totalO,
        totalActual: totalA,
        totalSaved: saved,
        couponMatches: finalPlan.couponMatches,
        priceComparisons: [],
      },
      needsActivityCategory: false,
      needsRestaurantCategory: false,
      offerAnotherActivity: false,
      remainingMinutes: remainingMin,
      currentTime,
      activityMsg: `时间差不多了，今天就排${selectedActivities.length}个活动，先不吃饭了～`,
    };
  }

  // ---- Step 4: Restaurant category chosen, search restaurants ----
  if (selectedActivities.length > 0 && input.selectedRestaurantCategory && !selectedRestaurant) {
    restaurantCandidates = await searchRestaurants(input.selectedRestaurantCategory, constraint);
    const label = input.selectedRestaurantCategory;
    const count = restaurantCandidates.length;

    return {
      plan: buildPartialPlan(selectedActivities, constraint, startMin),
      restaurantCandidates,
      needsActivityCategory: false,
      needsRestaurantCategory: false,
      offerAnotherActivity: false,
      remainingMinutes: remainingMin,
      currentTime,
      activityMsg: `帮你找了${count}家${label}，看看哪家顺眼——`,
    };
  }

  // ---- Step 5: Full plan with activities + restaurant ----
  if (selectedActivities.length > 0 && selectedRestaurant) {
    items.length = 0;
    couponMatches.length = 0;
    let runningMin = startMin;

    // All activity items with transport between them
    for (let i = 0; i < selectedActivities.length; i++) {
      const act = selectedActivities[i];
      const actTotal = act.groupPrice * constraint.peopleCount;
      const actCoupons = matchCoupons(act.id, act.category, actTotal);
      const actBest = actCoupons[0];
      couponMatches.push(...actCoupons);

      items.push({
        type: 'activity',
        time: minutesToTime(runningMin),
        poiId: act.id,
        name: act.name,
        price: actBest?.source === 'owned' ? actTotal - actBest.saved : actTotal,
        originalPrice: actTotal,
        saved: actBest?.source === 'owned' ? actBest.saved : 0,
        couponMatched: actBest,
        imageUrl: act.imageUrl,
        detail: `${act.durationMin}分钟 · ${act.tags.slice(0, 3).join('·')}`,
        actions: buildActions('activity', act.id, actBest),
      });
      runningMin += act.durationMin;

      // Transport to next activity (or to restaurant if last)
      const nextAct = selectedActivities[i + 1];
      if (nextAct) {
        const travelMin = getTravelTime(act.district, nextAct.district);
        items.push({
          type: 'transport',
          time: minutesToTime(runningMin),
          name: `前往 ${nextAct.name}`,
          price: 0,
          originalPrice: 0,
          saved: 0,
          detail: `约${travelMin}分钟`,
          actions: [],
        });
        runningMin += travelMin;
      }
    }

    // Transport to restaurant (from last activity)
    const lastAct = selectedActivities[selectedActivities.length - 1];
    const travelTime = getTravelTime(lastAct.district, selectedRestaurant.district);
    items.push({
      type: 'transport',
      time: minutesToTime(runningMin),
      name: `前往 ${selectedRestaurant.name}`,
      price: 0,
      originalPrice: 0,
      saved: 0,
      detail: `约${travelTime}分钟`,
      actions: [],
    });
    runningMin += travelTime;

    // Restaurant item — with queue/table awareness
    const restTotal = selectedRestaurant.groupPrice * constraint.peopleCount;
    const restCoupons = matchCoupons(selectedRestaurant.id, selectedRestaurant.category, restTotal);
    const restBest = restCoupons[0];
    couponMatches.push(...restCoupons);

    const queueEst = selectedRestaurant.queueEstimate;
    const hasTables = selectedRestaurant.availableTables;
    const queueNote = !hasTables
      ? ` · 暂无空位，排队约${queueEst}分钟`
      : queueEst > 15
        ? ` · 建议提前${queueEst > 25 ? '取号' : '订座'}（排队约${queueEst}分钟）`
        : '';

    items.push({
      type: 'restaurant',
      time: minutesToTime(runningMin),
      poiId: selectedRestaurant.id,
      name: selectedRestaurant.name,
      price: restBest?.source === 'owned' ? restTotal - restBest.saved : restTotal,
      originalPrice: restTotal,
      saved: restBest?.source === 'owned' ? restBest.saved : 0,
      couponMatched: restBest,
      imageUrl: selectedRestaurant.imageUrl,
      detail: `人均 ¥${selectedRestaurant.groupPrice} · ${selectedRestaurant.tags.slice(0, 3).join('·')}${queueNote}`,
      actions: buildActions('restaurant', selectedRestaurant.id, restBest, queueEst, hasTables),
    });

    // Price comparisons
    const priceComparisons: PriceComparison[] = [];
    for (const act of selectedActivities) {
      const candidates = await searchActivities(act.category, constraint);
      const alts = candidates
        .filter((a) => a.id !== act.id)
        .map((a) => ({ id: a.id, name: a.name, price: a.groupPrice, rating: a.rating }));
      const comparisons = findCheaperAlternatives(act.id, act.groupPrice, act.rating, alts);
      priceComparisons.push(...comparisons.map((c) => ({
        ...c,
        currentName: act.name,
        savedIfSwitch: c.savedIfSwitch * constraint.peopleCount,
      })));
    }

    const totalOriginal = items.reduce((s, i) => s + i.originalPrice, 0);
    const savedFromCoupons = couponMatches
      .filter((c) => c.source === 'owned')
      .reduce((s, c) => s + c.saved, 0);
    const totalActual = totalOriginal - savedFromCoupons;
    const claimableCoupons = couponMatches.filter((c) => c.source === 'claimable');

    // Queue warning for the agent to relay
    const queueWarning = !hasTables
      ? `⚠️「${selectedRestaurant.name}」暂无空位，排队约${queueEst}分钟，建议提前网上取号`
      : queueEst > 20
        ? `💡「${selectedRestaurant.name}」排队约${queueEst}分钟，建议提前取号`
        : undefined;

    return {
      plan: {
        items,
        totalOriginal,
        totalActual,
        totalSaved: savedFromCoupons,
        couponMatches: [...couponMatches, ...claimableCoupons],
        priceComparisons,
      },
      needsActivityCategory: false,
      needsRestaurantCategory: false,
      offerAnotherActivity: false,
      remainingMinutes: remainingMin,
      currentTime,
      queueWarning,
    };
  }

  return {
    plan: { items, totalOriginal: 0, totalActual: 0, totalSaved: 0, couponMatches, priceComparisons: [] },
    needsActivityCategory: false,
    needsRestaurantCategory: false,
    offerAnotherActivity: false,
    remainingMinutes: remainingMin,
    currentTime,
  };
}

export function buildPartialPlan(
  activities: Activity[],
  constraint: PlanConstraint,
  startMin: number,
): Plan & { couponMatches: CouponMatch[] } {
  const items: PlanItem[] = [];
  const couponMatches: CouponMatch[] = [];
  let runningMin = startMin;

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const actTotal = act.groupPrice * constraint.peopleCount;
    const actCoupons = matchCoupons(act.id, act.category, actTotal);
    const actBest = actCoupons[0];
    couponMatches.push(...actCoupons);

    items.push({
      type: 'activity',
      time: minutesToTime(runningMin),
      poiId: act.id,
      name: act.name,
      price: actBest?.source === 'owned' ? actTotal - actBest.saved : actTotal,
      originalPrice: actTotal,
      saved: actBest?.source === 'owned' ? actBest.saved : 0,
      couponMatched: actBest,
      imageUrl: act.imageUrl,
      detail: `${act.durationMin}分钟 · ${act.tags.slice(0, 3).join('·')}`,
      actions: [],
    });
    runningMin += act.durationMin;

    // Add transport to next activity (if any)
    const nextAct = activities[i + 1];
    if (nextAct) {
      const travelMin = getTravelTime(act.district, nextAct.district);
      items.push({
        type: 'transport',
        time: minutesToTime(runningMin),
        name: `前往 ${nextAct.name}`,
        price: 0,
        originalPrice: 0,
        saved: 0,
        detail: `约${travelMin}分钟`,
        actions: [],
      });
      runningMin += travelMin;
    }
  }

  const totalO = items.reduce((s, i) => s + i.originalPrice, 0);
  const totalA = items.reduce((s, i) => s + i.price, 0);

  return {
    items,
    totalOriginal: totalO,
    totalActual: totalA,
    totalSaved: totalO - totalA,
    couponMatches,
    priceComparisons: [],
  };
}

function buildActions(
  type: 'activity' | 'restaurant',
  poiId: string,
  couponMatch?: CouponMatch,
  queueEstimate?: number,
  availableTables?: boolean,
) {
  const actions: PlanItem['actions'] = [];

  if (type === 'activity') {
    actions.push({ type: 'purchase_tickets', label: '购票', status: 'pending', detail: poiId });
  } else {
    // Queue-aware restaurant actions
    if (!availableTables) {
      actions.push({ type: 'take_queue', label: `排队取号（约${queueEstimate || '?'}分钟）`, status: 'pending', detail: poiId });
    } else {
      actions.push({ type: 'book_table', label: '订座', status: 'pending', detail: poiId });
    }
    if (queueEstimate !== undefined && queueEstimate > 20) {
      actions.push({ type: 'take_queue', label: `提前取号（排队约${queueEstimate}分钟）`, status: 'pending', detail: poiId });
    }
  }

  if (couponMatch) {
    if (couponMatch.source === 'owned') {
      actions.push({ type: 'apply_coupon', label: `用券省¥${couponMatch.saved}`, status: 'pending', detail: couponMatch.coupon.id });
    } else {
      actions.push({ type: 'claim_coupon', label: `领券省¥${couponMatch.saved}`, status: 'pending', detail: couponMatch.coupon.id });
    }
  }

  return actions;
}
