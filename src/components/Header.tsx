import { MapPin, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  location?: string;
}

export default function Header({ location = '朝阳区·望京' }: HeaderProps) {
  return (
    <header className="bg-gradient-to-b from-[#FFD100] to-[#FFC800]">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* Kangaroo logo — text fallback until mascot.png is placed */}
          <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center
                          backdrop-blur-sm overflow-hidden relative">
            <span className="text-sm font-bold text-white">袋</span>
            <img
              src={import.meta.env.BASE_URL + 'images/mascot.png'}
              alt="袋"
              className="absolute inset-0 w-full h-full rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-white leading-tight">
              美团小袋
            </div>
            <div className="flex items-center gap-0.5 cursor-pointer">
              <MapPin size={11} color="white" className="opacity-70" />
              <span className="text-[11px] text-white/70">{location}</span>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
              </svg>
            </div>
          </div>
        </div>
        <ShoppingCart size={20} color="white" className="opacity-70" />
      </div>
    </header>
  );
}
