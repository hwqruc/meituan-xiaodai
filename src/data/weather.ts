import type { WeatherInfo } from '../types';

// Open-Meteo WMO weather codes → Chinese condition
const WMO_CONDITIONS: Record<number, { condition: string; icon: string }> = {
  0: { condition: '晴', icon: 'sunny' },
  1: { condition: '晴间多云', icon: 'partly-cloudy' },
  2: { condition: '多云', icon: 'cloudy' },
  3: { condition: '阴', icon: 'overcast' },
  45: { condition: '雾', icon: 'fog' },
  48: { condition: '霜雾', icon: 'fog' },
  51: { condition: '小雨', icon: 'drizzle' },
  53: { condition: '中雨', icon: 'drizzle' },
  55: { condition: '大雨', icon: 'rain' },
  61: { condition: '小雨', icon: 'rain' },
  63: { condition: '中雨', icon: 'rain' },
  65: { condition: '大雨', icon: 'heavy-rain' },
  71: { condition: '小雪', icon: 'snow' },
  73: { condition: '中雪', icon: 'snow' },
  75: { condition: '大雪', icon: 'heavy-snow' },
  80: { condition: '阵雨', icon: 'rain' },
  95: { condition: '雷阵雨', icon: 'thunderstorm' },
};

// Beijing approximate coordinates
const BJ_LAT = 39.92;
const BJ_LNG = 116.46;

export async function fetchWeather(): Promise<WeatherInfo> {
  // Try Open-Meteo free API first (no API key needed)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${BJ_LAT}&longitude=${BJ_LNG}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability&timezone=Asia/Shanghai`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const current = data.current;
    const code = current.weather_code;
    const wmo = WMO_CONDITIONS[code] || { condition: '多云', icon: 'cloudy' };

    return {
      temp: Math.round(current.temperature_2m),
      condition: wmo.condition,
      rainChance: current.precipitation_probability ?? 0,
      icon: wmo.icon,
    };
  } catch {
    // Fallback: dynamic mock based on Beijing season
    return dynamicMock();
  }
}

function dynamicMock(): WeatherInfo {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const hour = now.getHours();

  // Seasonal temperature ranges (Beijing)
  let baseTemp: number;
  let conditions: string[];
  let rainRange: [number, number];

  if (month >= 6 && month <= 8) {
    // Summer
    baseTemp = 26 + Math.random() * 12;     // 26–38
    conditions = ['晴', '多云', '阴', '雷阵雨', '阵雨'];
    rainRange = [20, 55];
  } else if (month >= 3 && month <= 5) {
    // Spring
    baseTemp = 10 + Math.random() * 18;      // 10–28
    conditions = ['晴', '晴间多云', '多云', '阴', '小雨'];
    rainRange = [5, 30];
  } else if (month >= 9 && month <= 11) {
    // Autumn
    baseTemp = 8 + Math.random() * 16;       // 8–24
    conditions = ['晴', '晴间多云', '多云'];
    rainRange = [3, 20];
  } else {
    // Winter
    baseTemp = -8 + Math.random() * 10;      // -8–2
    conditions = ['晴', '多云', '阴', '小雪'];
    rainRange = [0, 10];
  }

  // Slight night cooling
  if (hour < 8 || hour > 20) baseTemp -= 3;

  const temp = Math.round(baseTemp);
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const rainChance = Math.floor(rainRange[0] + Math.random() * (rainRange[1] - rainRange[0]));

  return { temp, condition, rainChance, icon: 'sunny' };
}

// Default for initial state
export const mockWeather: WeatherInfo = {
  temp: 28,
  condition: '晴',
  rainChance: 5,
  icon: 'sunny',
};

export function getWeatherCondition(temp: number, rainChance: number): string {
  if (rainChance > 50) return 'rain';
  if (temp > 30) return 'hot';
  if (temp < 10) return 'cold';
  return 'pleasant';
}
