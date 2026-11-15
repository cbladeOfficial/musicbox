import React from 'react';
import {
  Search,
  Minus,
  Square,
  Copy,
  X,
  Radio,
  Settings as SettingsIcon,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TauriBridge } from '../services/tauriBridge';
import { TableDensity } from '../types/music';

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  discordActive: boolean;
  density: TableDensity;
  onToggleDensity: () => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  isMaximized,
  onToggleMaximize,
  discordActive,
  density,
  onToggleDensity,
  onNavigateBack,
  onNavigateForward,
  canNavigateBack = false,
  canNavigateForward = false,
}) => {
  return (
    <header
      onDoubleClick={(e) => {
        // Only trigger maximize on empty titlebar area (not on inputs/buttons)
        if ((e.target as HTMLElement).closest('.no-drag')) return;
        onToggleMaximize();
      }}
      className="h-11 w-full bg-[var(--sidebar-color)] border-b border-[var(--border-color)] flex items-center justify-between pl-3.5 pr-0 select-none drag-region z-50 transition-colors"
    >
      {/* Left: Brand & Navigation History Controls */}
      <div className="flex items-center space-x-3 text-sm font-medium">
        <div className="flex items-center space-x-2">
          <img
            src="/app-icon.png"
            alt="MusicBox Logo"
            className="w-6 h-6 rounded-md object-contain select-none pointer-events-none drop-shadow-sm"
          />
          <span className="text-zinc-200 font-medium text-[14px]">MusicBox</span>
        </div>

        {/* Feishin History Nav Arrows */}
        <div className="flex items-center space-x-1 pl-1 no-drag">
          <button
            onClick={onNavigateBack}
            disabled={!canNavigateBack}
            title="Go Back"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateForward}
            disabled={!canNavigateForward}
            title="Go Forward"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {discordActive && (
          <div
            title="Discord Rich Presence connected"
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs bg-[#5865F2]/15 text-[#7983f5] font-medium border border-[#5865F2]/20"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>RPC</span>
          </div>
        )}
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-lg mx-4 no-drag">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tracks, artists, albums, playlists..."
            className="w-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-color)] text-[13px] text-white placeholder-zinc-400 pl-9 pr-8 py-1.5 rounded-md border border-[var(--border-color)] focus:border-[var(--accent-color)] outline-none transition-colors duration-150 shadow-inner"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-zinc-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden md:inline-block absolute right-2.5 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 rounded">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Right: Window & UI Controls */}
      <div className="flex items-center h-full no-drag">
        {/* Table Density Switcher */}
        <button
          onClick={onToggleDensity}
          title={`View mode: ${density === 'compact' ? 'Compact' : 'Comfortable'}`}
          className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors mr-1"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors mr-2"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>

        {/* Native Windows Caption Controls - flush to top-right corner */}
        <button
          onClick={() => TauriBridge.minimize()}
          title="Minimize"
          className="h-full w-11 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleMaximize}
          title={isMaximized ? 'Restore Down' : 'Maximize'}
          className="h-full w-11 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isMaximized ? (
            /* Restore Down icon: two overlapping boxes */
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M5 3.5V2a0.5 0.5 0 0 1 0.5-0.5h8a0.5 0.5 0 0 1 0.5 0.5v8a0.5 0.5 0 0 1-0.5 0.5H12" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2" y="5" width="9.5" height="9.5" rx="0.5" fill="var(--sidebar-color)" />
            </svg>
          ) : (
            /* Maximize icon: single box */
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="2.5" y="2.5" width="11" height="11" rx="0.5" />
            </svg>
          )}
        </button>
        <button
          onClick={() => TauriBridge.close()}
          title="Close"
          className="h-full w-12 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-[#e81123] active:bg-[#bf0f1d] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
