import type { ReactNode } from 'react';

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-gray p-4">
      <div className="phone-frame w-full max-w-[375px] h-[812px] bg-white rounded-[36px] overflow-hidden flex flex-col relative shadow-lg">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] text-text-primary bg-white">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <rect x="0" y="0" width="14" height="10" rx="2" fill="#333" />
              <rect x="2" y="1.5" width="3" height="2.5" rx="0.5" fill="white" />
              <rect x="6" y="1.5" width="3" height="2.5" rx="0.5" fill="white" />
              <rect x="10" y="1.5" width="2" height="2.5" rx="0.5" fill="white" />
            </svg>
          </div>
        </div>
        {children}
      </div>

      {/* Responsive: full screen on mobile */}
      <style>{`
        @media (max-width: 420px) {
          .phone-frame {
            max-width: 100%;
            height: 100dvh;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
