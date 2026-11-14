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
  Music2,
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
}) => {
  return (
    <header className="h-10 w-full bg-[var(--sidebar-color)] border-b border-[var(--border-color)] flex items-center justify-between px-3 select-none drag-region z-50">
      {/* Left: Feishin App Brand */}
      <div className="flex items-center space-x-2 text-xs font-semibold tracking-wide">
        <div className="w-5 h-5 rounded bg-[var(--accent-color)] flex items-center justify-center text-white shadow-sm shadow-[var(--accent-color)]/25">
          <Music2 className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <span className="text-[var(--text-main)] font-semibold text-xs tracking-tight">MusicBox</span>

        {discordActive && (
          <div
            title="Discord Rich Presence connected"
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-[#5865F2]/15 text-[#5865F2] font-medium border border-[#5865F2]/20 ml-1.5"
          >
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>RPC</span>
          </div>
        )}
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-sm mx-4 no-drag">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tracks, artists, albums..."
            className="w-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-color)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] pl-8 pr-7 py-1 rounded border border-[var(--border-color)] focus:border-[var(--accent-color)] outline-none transition-all duration-150"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Window & UI Controls */}
      <div className="flex items-center space-x-0.5 no-drag">
        {/* Table Density Switcher */}
        <button
          onClick={onToggleDensity}
          title={`View mode: ${density === 'compact' ? 'Compact' : 'Comfortable'}`}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] rounded transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] rounded transition-colors"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-[1px] bg-[var(--border-color)] mx-1" />

        {/* Frameless window controls */}
        <button
          onClick={() => TauriBridge.minimize()}
          title="Minimize"
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] rounded transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] rounded transition-colors"
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={() => TauriBridge.close()}
          title="Close"
          className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-red-600 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
