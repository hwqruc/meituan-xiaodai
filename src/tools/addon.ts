import type { WeatherInfo } from '../types';
import { fetchWeather } from '../data/weather';

export async function checkWeather(_location: string): Promise<WeatherInfo> {
  return fetchWeather();
}

export function shouldTriggerAddon(
  activityTags: string[],
  temp: number,
  occasion?: string,
  kidAge?: number,
  activityDurationMin?: number,
  scenario?: string,
): { trigger: boolean; type?: 'cold_drink' | 'flowers' | 'snack'; message?: string } {
  // Hot day → cold drink（高温天不管室内室外都要喝冰的）
  if (temp > 28) {
    return {
      trigger: true,
      type: 'cold_drink',
      message: '今天' + temp + '°C挺热的，帮你叫个冰饮送到活动地点？',
    };
  }

  // Outdoor activity on warm day → cold drink
  if (temp > 25 && activityTags.some((t) => ['户外', '运动', '自然'].includes(t))) {
    return {
      trigger: true,
      type: 'cold_drink',
      message: '今天挺热的，户外活动肯定渴，帮你叫个冰饮送到出口？',
    };
  }

  // Couples or special occasion → flowers
  if (scenario === 'couples' || (occasion && ['纪念日', '生日'].includes(occasion))) {
    const msg = occasion ? `今天是${occasion}，花束直送餐桌，给她一个惊喜？` : '约会配束花，仪式感拉满，送到餐厅？';
    return {
      trigger: true,
      type: 'flowers',
      message: msg,
    };
  }

  // Kids + long activity → snack
  if (kidAge && kidAge <= 10 && activityDurationMin && activityDurationMin > 90) {
    return {
      trigger: true,
      type: 'snack',
      message: '小朋友中途会饿，来份零食包送到活动地点？',
    };
  }

  return { trigger: false };
}

export interface AddonOption {
  type: 'cold_drink' | 'flowers' | 'snack';
  name: string;
  price: number;
  deliveryTime: string;
  imageUrl: string;
}

export const addonOptions: Record<string, AddonOption> = {
  cold_drink: {
    type: 'cold_drink',
    name: '冰鲜果茶 · 3杯装',
    price: 38,
    deliveryTime: '活动结束前5分钟送达',
    imageUrl: '/images/addon-drink.jpg',
  },
  flowers: {
    type: 'flowers',
    name: '鲜花花束 · 精致款',
    price: 128,
    deliveryTime: '餐厅入座前送达',
    imageUrl: '/images/addon-flowers.jpg',
  },
  snack: {
    type: 'snack',
    name: '儿童零食能量包',
    price: 25,
    deliveryTime: '活动中途送达',
    imageUrl: '/images/addon-snack.jpg',
  },
};
