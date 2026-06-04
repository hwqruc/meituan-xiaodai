// ---- Constraints from parsed intent ----
export interface PlanConstraint {
  scenario: 'family' | 'friends' | 'couples' | 'solo';
  peopleCount: number;
  kidAge?: number;
  preferenceTags: string[];
  dietConstraints: string[];
  activityHint?: string;
  startTime: string;    // "14:00"
  endTime: string;      // "18:00"
  budget?: number;      // per person
  occasion?: string;    // "纪念日", "生日"
  location: string;     // default: "朝阳区·望京"
}

// ---- Merchant / POI ----
export interface Activity {
  id: string;
  name: string;
  category: string;
  tags: string[];
  rating: number;
  location: string;
  district: string;
  distanceKm: number;
  imageUrl: string;       // placeholder path
  price: number;          // original per person
  groupPrice: number;     // 团购价 per person
  durationMin: number;
  kidFriendly: boolean;
  indoor: boolean;
  availableTickets: number;
}

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  tags: string[];
  rating: number;
  location: string;
  district: string;
  distanceKm: number;
  imageUrl: string;
  price: number;          // average per person
  groupPrice: number;     // 团购人均
  hasKidMenu: boolean;
  hasHealthyOption: boolean;
  hasPrivateRoom: boolean;
  queueEstimate: number;  // current queue length
  availableTables: boolean;
}

// ---- Coupons ----
export type CouponType = 'merchant_full_reduce' | 'platform_full_reduce' | 'member_no_threshold'
  | 'category_special' | 'delivery_free';

export interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  description: string;
  reduceAmount: number;
  threshold: number;       // 满多少可用, 0 = 无门槛
  applicableCategories: string[];
  applicablePoiIds?: string[];
  validUntil: string;      // ISO date
  owned: boolean;          // 用户是否拥有
  claimable: boolean;      // 是否可领取
}

export interface CouponMatch {
  coupon: Coupon;
  poiId: string;
  poiName: string;
  originalPrice: number;
  afterCoupon: number;
  saved: number;
  source: 'owned' | 'claimable';
}

// ---- Weather ----
export interface WeatherInfo {
  temp: number;
  condition: string;
  rainChance: number;
  icon: string;
}

// ---- Plan ----
export interface PlanItem {
  type: 'activity' | 'restaurant' | 'transport' | 'addon';
  time: string;
  poiId?: string;
  name: string;
  price: number;
  originalPrice: number;
  saved: number;
  couponMatched?: CouponMatch;
  imageUrl?: string;
  detail?: string;
  actions: PlanAction[];
}

export interface PlanAction {
  type: 'purchase_tickets' | 'take_queue' | 'book_table' | 'apply_coupon' | 'order_addon' | 'claim_coupon';
  label: string;
  status: 'pending' | 'done';
  detail: string;
}

export interface Plan {
  items: PlanItem[];
  totalOriginal: number;
  totalActual: number;
  totalSaved: number;
  couponMatches: CouponMatch[];
  priceComparisons: PriceComparison[];
  weather?: WeatherInfo;
}

export interface PriceComparison {
  currentPoiId: string;
  currentPrice: number;
  alternativePoiId: string;
  alternativeName: string;
  alternativePrice: number;
  alternativeRating: number;
  savedIfSwitch: number;
}

// ---- Conversation ----
export type MessageRole = 'user' | 'agent' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  cardType?: 'activity_selector' | 'restaurant_selector' | 'plan_summary' | 'action_card' | 'addon_offer' | 'mode_selector';
  cardData?: any;
  timestamp: number;
}

// ---- App state ----
export type AppPhase = 'home' | 'onboarding' | 'planning' | 'confirmed' | 'checkout';

export type TabId = 'chat' | 'timeline' | 'savings';

export type Persona = 'normal';
