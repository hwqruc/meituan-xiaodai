import { useState, useEffect } from 'react';
import { Send, Sun, CloudRain, Cloud, Thermometer } from 'lucide-react';
import { fetchWeather } from '../data/weather';
import type { WeatherInfo } from '../types';

interface HomeScreenProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const exampleQueries = [
  '下午2点到6点带5岁娃出去放电，两个大人一个小孩，在家待不住了，别离家太远',
  '周六下午和三个朋友玩密室或剧本杀，4个人两男两女，人均预算200，晚上再吃顿火锅',
  '周六下午2点到晚上8点和对象约会，两个人，喜欢安静能拍照的地方，想吃好一点人均300',
];

const weatherIcons: Record<string, typeof Sun> = {
  sunny: Sun,
  'partly-cloudy': Cloud,
  cloudy: Cloud,
  rain: CloudRain,
  drizzle: CloudRain,
  thunderstorm: CloudRain,
};

export default function HomeScreen({ onSubmit, isLoading }: HomeScreenProps) {
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState(0);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholder((p) => (p + 1) % exampleQueries.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchWeather().then(setWeather).catch(() => {});
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSubmit(text);
    setInput('');
  };

  const handleExample = (text: string) => {
    if (isLoading) return;
    onSubmit(text);
  };

  const WeatherIcon = weather ? (weatherIcons[weather.icon] || Sun) : Sun;

  return (
    <div className="flex flex-col flex-1">
      {/* Greeting */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            嗨，我是美团小袋 🦘
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            周末闲时助手，一句话帮你安排吃喝玩乐
          </p>

          {/* Weather chip */}
          {weather && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-[#FFF9E6] border border-[#FFE082]">
              <WeatherIcon size={14} className="text-[#E6B800]" />
              <span className="text-xs text-[#B8860B]">
                今天{weather.condition} · {weather.temp}°C
              </span>
              {weather.rainChance > 0 && (
                <span className="text-[10px] text-text-hint">
                  {weather.rainChance > 30 ? '🌂' : ''} 降雨{weather.rainChance}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Feature highlights */}
        <div className="w-full mb-6">
          <p className="text-xs text-text-hint mb-2 text-center">我能帮你——</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📋', title: '完整规划', desc: '活动+餐厅+时间一条龙' },
              { icon: '🧩', title: '美团拼场', desc: '飞盘徒步密室找搭子' },
              { icon: '💰', title: '省钱省心', desc: '自动匹配券·比价·团购' },
              { icon: '⚡', title: '一键执行', desc: '购票订座取号一次性搞定' },
              { icon: '🛵', title: '闪送推荐', desc: '高温冷饮·纪念日鲜花' },
              { icon: '📤', title: '分享方案', desc: '一键发给朋友家人确认' },
            ].map((f) => (
              <div key={f.title}
                   className="flex items-start gap-2 p-2.5 rounded-xl bg-bg-gray border border-border/50">
                <span className="text-base shrink-0">{f.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{f.title}</p>
                  <p className="text-[10px] text-text-hint leading-tight">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Example bubbles */}
        <div className="w-full space-y-2.5">
          {exampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleExample(q)}
              disabled={isLoading}
              className="w-full text-left px-4 py-3 rounded-xl bg-[#FFF9E6] border border-[#FFE082]
                         text-sm text-text-secondary leading-relaxed hover:bg-[#FFF3CD]
                         transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-white">
        <div className="flex items-center gap-2 bg-bg-gray rounded-xl px-4 py-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={exampleQueries[placeholder]}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-hint
                       outline-none border-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-lg bg-meituan flex items-center justify-center
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Send size={16} color="#333" />
          </button>
        </div>
        <p className="text-[10px] text-text-hint text-center mt-2">
          美团小袋 · 周末出游好搭子
        </p>
      </div>
    </div>
  );
}
