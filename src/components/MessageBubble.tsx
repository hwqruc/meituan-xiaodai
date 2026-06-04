import type { Message } from '../types';
import { Bot, User } from 'lucide-react';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isAgent = message.role === 'agent';

  return (
    <div className={`flex gap-2 px-4 mb-4 ${isAgent ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isAgent ? 'bg-meituan' : 'bg-save-green'
        }`}
      >
        {isAgent ? (
          <div className="relative">
            <span className="text-[10px] font-bold text-white">袋</span>
            <img
              src={import.meta.env.BASE_URL + 'images/mascot.png'}
              alt="袋"
              className="absolute inset-0 w-full h-full rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
          <User size={14} color="white" />
        )}
      </div>

      {/* Text */}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAgent
            ? 'bg-[#FFF9E6] text-text-primary rounded-tl-sm'
            : 'bg-save-green text-white rounded-tr-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
}
