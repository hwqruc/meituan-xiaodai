interface Props {
  categories: string[];
  type: 'activity' | 'restaurant';
  onSelect: (category: string) => void;
}

const categoryIcons: Record<string, string> = {
  '手工DIY': '🎨', '户外公园': '🌿', '科技馆': '🔬', '密室逃脱': '🔐',
  '剧本杀': '🔍', '运动竞技': '🏹', '独立影院': '🎬', '户外散步': '🚶',
  '书店': '📚', '户外运动': '🚴', 'Livehouse': '🎵',
  '轻食沙拉': '🥗', '日料': '🍣', '西北菜': '🍜', '火锅': '🍲',
  '北京菜': '🦆', '烧烤': '🍖', '音乐餐吧': '🎶', '创意融合菜': '🍽️', '西餐': '🥩',
};

export default function CategorySelector({ categories, type, onSelect }: Props) {
  const title = type === 'activity'
    ? '下午可以玩这些——'
    : '想吃什么类型的？';

  return (
    <div>
      <p className="text-[12px] text-text-secondary mb-2.5">
        {title}
        <span className="text-text-hint/50 ml-1">也可以直接打字说想看什么</span>
      </p>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="shrink-0 px-4 py-2.5 rounded-full bg-gradient-to-b from-white to-[#FFF9E6]
                       border border-[#FFE082] hover:bg-meituan hover:text-text-primary
                       hover:border-meituan hover:shadow-sm
                       transition-all active:scale-95 text-text-primary
                       shadow-sm"
          >
            <span className="text-base leading-none block mb-0.5">
              {categoryIcons[cat] || '📍'}
            </span>
            <span className="text-[12px] font-medium whitespace-nowrap">
              {cat}
            </span>
          </button>
        ))}
        {/* "Other" option — type your own */}
        <button
          className="shrink-0 px-4 py-2.5 rounded-full bg-white border border-dashed border-border
                     hover:border-meituan hover:bg-[#FFF9E6] transition-all active:scale-95"
        >
          <span className="text-base leading-none block mb-0.5">💬</span>
          <span className="text-[12px] text-text-hint whitespace-nowrap">其他</span>
        </button>
      </div>
    </div>
  );
}
