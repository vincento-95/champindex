// ============================================================
// ChampIndex — Navigation bottom bar (Material Symbols + SVG icons)
// ============================================================

import type { AppView } from '../types';
import { IconCameraLeaf } from './Icons';

interface BottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const NAV_ITEMS: {
  view: AppView;
  matIcon?: string;
  SvgIcon?: React.FC<{ size?: number; className?: string }>;
  label: string;
}[] = [
  { view: 'home', matIcon: 'search', label: 'Explorer' },
  { view: 'identify', SvgIcon: IconCameraLeaf, label: 'Identifier' },
  { view: 'heatmap', matIcon: 'map', label: 'Carte' },
  { view: 'notebook', matIcon: 'book_2', label: 'Carnet' },
];

export default function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[999] bg-[#1a2215]/95 backdrop-blur-xl
        border-t border-white/10 safe-area-bottom"
      role="tablist"
      aria-label="Navigation principale"
    >
      <div className="max-w-[480px] mx-auto flex">
        {NAV_ITEMS.map(item => {
          const isActive = item.view === activeView;
          return (
            <button
              key={item.view}
              role="tab"
              aria-selected={isActive}
              onClick={() => onNavigate(item.view)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 relative
                transition-all duration-200 active:scale-90 ${
                isActive ? 'text-amber-400' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {item.SvgIcon ? (
                <item.SvgIcon size={22} className={isActive ? 'scale-110' : ''} />
              ) : (
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.matIcon}
                </span>
              )}
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
