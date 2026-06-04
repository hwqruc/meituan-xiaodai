import { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

interface Props {
  placeholder?: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  autoFocus?: boolean;
}

const placeholders = [
  '说说你的想法…',
  '比如：密室太贵了，有没有便宜点的',
  '想换个口味，清淡一点的',
  '晚半小时出发可以吗',
];

export default function ChatInput({ placeholder, disabled, onSubmit, autoFocus }: Props) {
  const [input, setInput] = useState('');
  const [phIndex, setPhIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhIndex((p) => (p + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setInput('');
  };

  const displayPlaceholder = placeholder || placeholders[phIndex];

  return (
    <div className="px-4 pb-4 pt-2 border-t border-border bg-white">
      <div className="flex items-center gap-2 bg-bg-gray rounded-full px-4 py-2.5
                      focus-within:bg-white focus-within:ring-2 focus-within:ring-meituan/50
                      transition-all">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={displayPlaceholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-hint
                     outline-none border-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="w-7 h-7 rounded-full bg-meituan flex items-center justify-center shrink-0
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all
                     hover:bg-meituan-dark active:scale-90"
        >
          <ArrowUp size={16} strokeWidth={2.5} color="#333" />
        </button>
      </div>
    </div>
  );
}
