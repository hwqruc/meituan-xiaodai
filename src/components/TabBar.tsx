import { MessageCircle, Clock, ReceiptText } from 'lucide-react';
import type { TabId } from '../types';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasPlan?: boolean;
}

const tabs: { id: TabId; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: '对话', icon: MessageCircle },
  { id: 'timeline', label: '行程', icon: Clock },
  { id: 'savings', label: '账单', icon: ReceiptText },
];

export default function TabBar({ activeTab, onTabChange, hasPlan }: TabBarProps) {
  return (
    <nav className="flex items-center justify-around bg-white border-t border-border py-1.5 safe-bottom">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab;
        const isDisabled = (id === 'timeline' || id === 'savings') && !hasPlan;

        return (
          <button
            key={id}
            onClick={() => !isDisabled && onTabChange(id)}
            disabled={isDisabled}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
              isActive
                ? 'text-meituan-dark'
                : isDisabled
                  ? 'text-text-hint/40'
                  : 'text-text-hint'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
