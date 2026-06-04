import { useState, useEffect } from 'react';
import { Send, Sun, CloudRain, Cloud, Thermometer, Users, Clock, MapPin, Star, UserPlus } from 'lucide-react';
import { fetchWeather } from '../data/weather';
import type { WeatherInfo } from '../types';
import { searchPinChang, type PinChangSession } from '../data/pinchang';

interface HomeScreenProps {
  onSubmit: (text: string) => void;
  onJoinSession?: (session: PinChangSession) => void;
  isLoading: boolean;
}

type HomeMode = 'plan' | 'join';

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

const difficultyLabels: Record<string, string> = {
  beginner: '新手友好', intermediate: '有一定基础', advanced: '进阶玩家',
};

export default function HomeScreen({ onSubmit, onJoinSession, isLoading }: HomeScreenProps) {
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState(0);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [mode, setMode] = useState<HomeMode>('plan');
  const [joinSessions] = useState<PinChangSession[]>(() => searchPinChang({}));

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

  const handleJoin = (s: PinChangSession) => {
    if (isLoading || !onJoinSession) return;
    onJoinSession(s);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col px-6 pb-4 overflow-y-auto">
        {/* Greeting */}
        <div className="text-center my-4">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            嗨，我是美团小袋 🦘
          </h2>
          <p className="text-sm text-text-secondary">
            {mode === 'plan' ? '一句话安排吃喝玩乐' : '发现身边正在组的局，直接加入'}
          </p>
          {weather && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-[#FFF9E6] border border-[#FFE082]">
              <WeatherIcon size={14} className="text-[#E6B800]" />
              <span className="text-xs text-[#B8860B]">
                今天{weather.condition} · {weather.temp}°C
              </span>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex bg-bg-gray rounded-xl p-1 mb-4">
          <button
            onClick={() => setMode('plan')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'plan' ? 'bg-white text-meituan-dark shadow-sm' : 'text-text-hint'
            }`}
          >
            📋 我来规划
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'join' ? 'bg-white text-meituan-dark shadow-sm' : 'text-text-hint'
            }`}
          >
            🧩 加入一个局
          </button>
        </div>

        {/* PLAN mode */}
        {mode === 'plan' && (
          <>
            {/* Feature highlights */}
            <div className="w-full mb-4">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { icon: '📋', title: '完整规划', desc: '活动+餐厅+时间一条龙' },
                  { icon: '💰', title: '省钱省心', desc: '自动匹配券·比价·团购' },
                  { icon: '🛵', title: '闪送推荐', desc: '高温冷饮·纪念日鲜花' },
                  { icon: '📤', title: '分享约局', desc: '发给朋友一起加入' },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-1.5 p-2 rounded-lg bg-bg-gray border border-border/50">
                    <span className="text-sm shrink-0">{f.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-text-primary">{f.title}</p>
                      <p className="text-[10px] text-text-hint leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full space-y-2">
              {exampleQueries.map((q, i) => (
                <button key={i} onClick={() => handleExample(q)} disabled={isLoading}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#FFF9E6] border border-[#FFE082]
                             text-sm text-text-secondary leading-relaxed hover:bg-[#FFF3CD]
                             transition-colors disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {/* JOIN mode */}
        {mode === 'join' && (
          <div className="space-y-3">
            <p className="text-xs text-text-hint">
              {joinSessions.length} 个局正在组队中，直接加入即可——
            </p>
            {joinSessions.slice(0, 6).map((s) => {
              const spots = s.maxCount - s.currentCount;
              return (
                <button
                  key={s.id}
                  onClick={() => handleJoin(s)}
                  disabled={isLoading || spots <= 0}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    spots <= 0
                      ? 'border-border bg-bg-gray opacity-50'
                      : 'border-[#FFD100] bg-[#FFF9E6] hover:border-meituan-dark'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-meituan-dark text-white font-medium">
                      {s.category}
                    </span>
                    <span className="text-[11px] text-text-hint flex items-center gap-0.5">
                      <Star size={10} className="text-[#FFD100] fill-[#FFD100]" />{s.rating}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-hint">
                    <span className="flex items-center gap-0.5"><Clock size={10} />{s.timeSlot}</span>
                    <span className="flex items-center gap-0.5"><MapPin size={10} />{s.location}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#FFD100]/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-hint">{difficultyLabels[s.difficulty]}</span>
                      <span className="text-[11px] flex items-center gap-1">
                        <Users size={11} />
                        <span className={spots <= 3 ? 'text-meituan-dark font-semibold' : ''}>
                          {s.currentCount}/{s.maxCount}人
                        </span>
                        {spots > 0 && spots <= 3 && (
                          <span className="text-[10px] text-meituan-dark font-semibold">仅剩{spots}位</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-save-green">¥{s.price}/人</span>
                      <span className="text-[11px] bg-meituan-dark text-white px-2 py-1 rounded-lg flex items-center gap-1">
                        <UserPlus size={10} />加入
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Input area — plan mode only */}
      {mode === 'plan' && (
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
        </div>
      )}
    </div>
  );
}
