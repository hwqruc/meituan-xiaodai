import type { PlanConstraint } from '../types';

export interface PinChangSession {
  id: string;
  name: string;
  category: string;        // 飞盘, 徒步, 密室, etc.
  activityType: string;     // maps to Activity category
  description: string;
  timeSlot: string;         // "14:00-16:00"
  date: string;             // "周六" "周日" "每天"
  price: number;            // per person
  groupPrice: number;       // same as price for 拼场
  currentCount: number;     // already joined
  maxCount: number;         // max participants
  location: string;
  district: string;
  distanceKm: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string;        // "提供飞盘" "自备球鞋" etc.
  tags: string[];
  indoor: boolean;
  durationMin: number;
  rating: number;
  host: string;             // organizer name
  hostVerified: boolean;
}

const ALL_SESSIONS: PinChangSession[] = [
  // ===== 飞盘 =====
  {
    id: 'pc-frisbee-01',
    name: '朝阳公园极限飞盘局',
    category: '飞盘',
    activityType: '户外运动',
    description: '新手友好局，教练带热身+基础传盘练习+分组对抗，认识新朋友的好机会',
    timeSlot: '14:00-16:00',
    date: '周六/周日',
    price: 49,
    groupPrice: 49,
    currentCount: 8,
    maxCount: 16,
    location: '朝阳公园南门草坪',
    district: '朝阳区',
    distanceKm: 3.5,
    difficulty: 'beginner',
    equipment: '提供飞盘和分队服',
    tags: ['运动', '户外', '社交', '新手友好'],
    indoor: false,
    durationMin: 120,
    rating: 4.8,
    host: '飞盘老张',
    hostVerified: true,
  },
  {
    id: 'pc-frisbee-02',
    name: '奥森飞盘进阶赛',
    category: '飞盘',
    activityType: '户外运动',
    description: '进阶局，适合有基础的玩家，战术配合+高强度对抗',
    timeSlot: '16:00-18:00',
    date: '周六',
    price: 59,
    groupPrice: 59,
    currentCount: 12,
    maxCount: 20,
    location: '奥林匹克森林公园',
    district: '朝阳区',
    distanceKm: 8.0,
    difficulty: 'intermediate',
    equipment: '自备球鞋，提供飞盘',
    tags: ['运动', '户外', '竞技'],
    indoor: false,
    durationMin: 120,
    rating: 4.6,
    host: '飞盘俱乐部',
    hostVerified: true,
  },

  // ===== 徒步 =====
  {
    id: 'pc-hiking-01',
    name: '香山轻徒步·新手友好',
    category: '徒步',
    activityType: '户外散步',
    description: '香山公园步道轻徒步，全程约5km，适合新手和休闲党，山顶俯瞰北京城',
    timeSlot: '09:00-12:00',
    date: '周六/周日',
    price: 39,
    groupPrice: 39,
    currentCount: 15,
    maxCount: 25,
    location: '香山公园',
    district: '海淀区',
    distanceKm: 20,
    difficulty: 'beginner',
    equipment: '建议穿运动鞋，提供矿泉水',
    tags: ['户外', '自然', '运动', '新手友好'],
    indoor: false,
    durationMin: 180,
    rating: 4.9,
    host: '徒步北京',
    hostVerified: true,
  },
  {
    id: 'pc-hiking-02',
    name: '京西古道穿越',
    category: '徒步',
    activityType: '户外散步',
    description: '京西古道经典路线，全程10km，途经马蹄窝、古村落，适合有运动基础的朋友',
    timeSlot: '08:00-14:00',
    date: '周六',
    price: 89,
    groupPrice: 89,
    currentCount: 6,
    maxCount: 15,
    location: '门头沟京西古道',
    district: '门头沟区',
    distanceKm: 35,
    difficulty: 'intermediate',
    equipment: '必须穿登山鞋，提供登山杖和午餐便当',
    tags: ['户外', '自然', '运动', '历史'],
    indoor: false,
    durationMin: 360,
    rating: 4.7,
    host: '户外探险队',
    hostVerified: true,
  },

  // ===== 密室 =====
  {
    id: 'pc-mishi-01',
    name: '恐怖密室《校怨》拼场',
    category: '密室',
    activityType: '密室逃脱',
    description: '经典校园恐怖主题，4人起开，已有2人等拼！dm专业、道具逼真',
    timeSlot: '14:30-16:00',
    date: '每天',
    price: 128,
    groupPrice: 128,
    currentCount: 2,
    maxCount: 6,
    location: '三里屯密室集结地',
    district: '朝阳区',
    distanceKm: 4.0,
    difficulty: 'intermediate',
    equipment: '无需准备，提供全套',
    tags: ['沉浸', '解压', '社交', '室内'],
    indoor: true,
    durationMin: 90,
    rating: 4.5,
    host: '密室集结地',
    hostVerified: true,
  },
  {
    id: 'pc-mishi-02',
    name: '非恐密室《博物馆奇妙夜》',
    category: '密室',
    activityType: '密室逃脱',
    description: '无恐解谜主题，适合情侣和闺蜜，解密烧脑不吓人',
    timeSlot: '16:30-18:00',
    date: '每天',
    price: 138,
    groupPrice: 138,
    currentCount: 1,
    maxCount: 6,
    location: '望京密室研究所',
    district: '朝阳区',
    distanceKm: 5.5,
    difficulty: 'beginner',
    equipment: '无需准备',
    tags: ['沉浸', '解压', '室内'],
    indoor: true,
    durationMin: 90,
    rating: 4.7,
    host: '密室研究所',
    hostVerified: true,
  },

  // ===== 剧本杀 =====
  {
    id: 'pc-juben-01',
    name: '《漓川怪谈簿》6人车等拼',
    category: '剧本杀',
    activityType: '剧本杀',
    description: '日式妖怪题材情感本，dm带本超专业，已有3人等拼！',
    timeSlot: '14:00-18:00',
    date: '周六/周日',
    price: 168,
    groupPrice: 168,
    currentCount: 3,
    maxCount: 6,
    location: '双井剧本社',
    district: '朝阳区',
    distanceKm: 4.5,
    difficulty: 'beginner',
    equipment: '无需准备，提供茶饮',
    tags: ['沉浸', '社交', '文艺', '室内'],
    indoor: true,
    durationMin: 240,
    rating: 4.9,
    host: '双井剧本社',
    hostVerified: true,
  },

  // ===== 匹克球 =====
  {
    id: 'pc-pickle-01',
    name: '匹克球新手体验局',
    category: '匹克球',
    activityType: '运动竞技',
    description: '时下最火的新潮运动！比网球简单比乒乓刺激，教练手把手教',
    timeSlot: '10:00-12:00',
    date: '周六/周日',
    price: 79,
    groupPrice: 79,
    currentCount: 4,
    maxCount: 12,
    location: '朝阳体育馆',
    district: '朝阳区',
    distanceKm: 3.0,
    difficulty: 'beginner',
    equipment: '提供球拍和球，穿运动服即可',
    tags: ['运动', '社交', '新手友好', '室内'],
    indoor: true,
    durationMin: 120,
    rating: 4.8,
    host: '匹克球俱乐部',
    hostVerified: true,
  },

  // ===== 羽毛球 =====
  {
    id: 'pc-badminton-01',
    name: '周末羽毛球混合双打',
    category: '羽毛球',
    activityType: '运动竞技',
    description: '混合双打局，轮换上場，水平不限，开心最重要',
    timeSlot: '15:00-17:00',
    date: '周六/周日',
    price: 39,
    groupPrice: 39,
    currentCount: 6,
    maxCount: 12,
    location: '五棵松羽毛球馆',
    district: '海淀区',
    distanceKm: 10,
    difficulty: 'beginner',
    equipment: '提供羽毛球，自带球拍或现场租(¥10)',
    tags: ['运动', '社交', '新手友好', '室内'],
    indoor: true,
    durationMin: 120,
    rating: 4.6,
    host: '羽球小分队',
    hostVerified: true,
  },

  // ===== 骑行 =====
  {
    id: 'pc-bike-01',
    name: '长安街夜骑·看夜景',
    category: '骑行',
    activityType: '户外运动',
    description: '长安街沿线夜骑，从建国门到复兴门往返，吹晚风看夜景',
    timeSlot: '19:00-21:00',
    date: '周五/周六',
    price: 29,
    groupPrice: 29,
    currentCount: 10,
    maxCount: 20,
    location: '建国门地铁站',
    district: '东城区',
    distanceKm: 4.0,
    difficulty: 'beginner',
    equipment: '自备共享单车或公路车',
    tags: ['户外', '运动', '社交', '拍照'],
    indoor: false,
    durationMin: 120,
    rating: 4.7,
    host: '北京夜骑团',
    hostVerified: true,
  },

  // ===== 攀岩 =====
  {
    id: 'pc-climb-01',
    name: '室内攀岩新手体验',
    category: '攀岩',
    activityType: '运动竞技',
    description: '室内抱石馆，教练带热身+基础技巧+自由攀爬，零基础也能玩',
    timeSlot: '14:00-16:00',
    date: '每天',
    price: 99,
    groupPrice: 99,
    currentCount: 5,
    maxCount: 10,
    location: '望京攀岩馆',
    district: '朝阳区',
    distanceKm: 5.0,
    difficulty: 'beginner',
    equipment: '提供攀岩鞋和镁粉',
    tags: ['运动', '解压', '室内', '新手友好'],
    indoor: true,
    durationMin: 120,
    rating: 4.8,
    host: '攀岩馆教练组',
    hostVerified: true,
  },
];

// Map 拼场 categories to activity categories for the plan system
const PINCHANG_TO_ACTIVITY: Record<string, string> = {
  '飞盘': '户外运动',
  '徒步': '户外散步',
  '密室': '密室逃脱',
  '剧本杀': '剧本杀',
  '匹克球': '运动竞技',
  '羽毛球': '运动竞技',
  '骑行': '户外运动',
  '攀岩': '运动竞技',
};

export function getPinChangActivityType(category: string): string {
  return PINCHANG_TO_ACTIVITY[category] || '户外运动';
}

// Search 拼场 sessions matching user constraints
export function searchPinChang(
  constraint: Partial<PlanConstraint>,
  activityCategory?: string,
): PinChangSession[] {
  let results = [...ALL_SESSIONS];

  // Filter by activity category (map 拼场 category to activity type)
  if (activityCategory) {
    const mapped = PINCHANG_TO_ACTIVITY[activityCategory];
    if (mapped) {
      results = results.filter(s => s.activityType === mapped || s.category === activityCategory);
    } else {
      // Try direct match first, then mapped match
      results = results.filter(s =>
        s.category === activityCategory || s.activityType === activityCategory,
      );
    }
  }

  // Filter by time
  if (constraint.startTime && constraint.endTime) {
    const [sh, sm] = constraint.startTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const [eh, em] = constraint.endTime.split(':').map(Number);
    const endMin = eh * 60 + em;

    results = results.filter(s => {
      const [ssh, ssm] = s.timeSlot.split('-')[0].split(':').map(Number);
      const sStart = ssh * 60 + ssm;
      const [seh, sem] = s.timeSlot.split('-')[1].split(':').map(Number);
      const sEnd = seh * 60 + sem;
      return sStart >= startMin && sEnd <= endMin;
    });
  }

  // Filter by weather — rainy → prefer indoor
  // (handled by caller, not here)

  // Scenario-based filtering: solo users especially benefit from 拼场
  if (constraint.scenario === 'solo') {
    // Prefer social, beginner-friendly sessions for solo users
    results.sort((a, b) => {
      const aSocial = a.tags.includes('社交') ? 1 : 0;
      const bSocial = b.tags.includes('社交') ? 1 : 0;
      return bSocial - aSocial || (a.price - b.price);
    });
  }

  // Sort by: available spots (desc), price (asc), rating (desc)
  results.sort((a, b) => {
    const aAvail = a.maxCount - a.currentCount;
    const bAvail = b.maxCount - b.currentCount;
    if (aAvail <= 0 && bAvail > 0) return 1;
    if (bAvail <= 0 && aAvail > 0) return -1;
    return a.price - b.price || b.rating - a.rating;
  });

  return results;
}

// Get all available 拼场 categories
export function getPinChangCategories(): string[] {
  const cats = new Set(ALL_SESSIONS.map(s => s.category));
  return Array.from(cats);
}

// Convert 拼场 session to Activity-like object for plan integration
export function pinChangToActivity(session: PinChangSession, peopleCount: number) {
  return {
    id: session.id,
    name: session.name,
    category: session.activityType,
    tags: [...session.tags, '拼场', `${session.currentCount}/${session.maxCount}人`],
    rating: session.rating,
    location: session.location,
    district: session.district,
    distanceKm: session.distanceKm,
    imageUrl: `/images/pinchang-${session.category}.jpg`,
    price: session.price,
    groupPrice: session.groupPrice,
    durationMin: session.durationMin,
    kidFriendly: session.tags.includes('新手友好'),
    indoor: session.indoor,
    availableTickets: session.maxCount - session.currentCount,
    // Extra 拼场 info
    _pinchang: {
      currentCount: session.currentCount,
      maxCount: session.maxCount,
      timeSlot: session.timeSlot,
      date: session.date,
      host: session.host,
      hostVerified: session.hostVerified,
      difficulty: session.difficulty,
      equipment: session.equipment,
    },
  };
}
