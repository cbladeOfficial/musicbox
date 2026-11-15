import React, { useState } from 'react';
import {
  Music2,
  Disc3,
  Mic2,
  Radio,
  Heart,
  ListMusic,
  Plus,
  FolderOpen,
  Trash2,
  Loader2,
  Database,
  Sliders,
} from 'lucide-react';
import { PlaylistRecord, ViewMode } from '../types/music';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  playlists: PlaylistRecord[];
  selectedPlaylistId: number | null;
  onSelectPlaylist: (id: number) => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: number) => void;
  onOpenFolderPicker: () => void;
  totalTracksCount: number;
  isScanning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onOpenFolderPicker,
  totalTracksCount,
  isScanning,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const navItems = [
    { id: 'tracks' as ViewMode, label: 'Tracks', icon: Music2 },
    { id: 'albums' as ViewMode, label: 'Albums', icon: Disc3 },
    { id: 'artists' as ViewMode, label: 'Artists', icon: Mic2 },
    { id: 'radio' as ViewMode, label: 'Radio Stations', icon: Radio },
    { id: 'favorites' as ViewMode, label: 'Favorites', icon: Heart },
    { id: 'settings' as ViewMode, label: 'Settings', icon: Sliders },
  ];

  return (
    <aside className="w-60 h-full bg-[var(--sidebar-color)] border-r border-[var(--border-color)] flex flex-col justify-between select-none text-sm flex-shrink-0">
      {/* Top Navigation */}
      <div className="p-3.5 space-y-6 overflow-y-auto flex-1">
        <div>
          <div className="text-xs uppercase tracking-wider font-medium text-zinc-400 px-3 mb-2">
            Library
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id && selectedPlaylistId === null;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full group relative flex items-center justify-between px-3.5 py-2.5 rounded-md font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-3 shadow-sm'
                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[var(--accent-color)]' : 'text-zinc-400 group-hover:text-white'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.id === 'tracks' && totalTracksCount > 0 && (
                    <span className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded ${isActive ? 'text-white bg-[var(--accent-color)]/25' : 'text-zinc-400 bg-white/5'}`}>
                      {totalTracksCount}
                    </span>
                  )}
                  {item.id === 'radio' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Playlists Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs uppercase tracking-wider font-medium text-zinc-400">
              Playlists
            </span>
            <button
              onClick={() => setIsCreating(true)}
              title="New Playlist"
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="px-2 mb-2">
              <input
                autoFocus
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                onBlur={() => {
                  if (!newPlaylistName) setIsCreating(false);
                }}
                placeholder="Playlist name..."
                className="w-full bg-[var(--surface-color)] text-xs text-white px-2.5 py-1.5 rounded-md border border-[var(--accent-color)] outline-none shadow-sm"
              />
            </form>
          )}

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {playlists.length === 0 && !isCreating && (
              <div className="text-[11px] text-zinc-400 px-3 py-1.5 italic">
                No playlists created
              </div>
            )}
            {playlists.map((pl) => {
              const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
              return (
                <div
                  key={pl.id}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-color)]/15 text-white font-medium border-l-2 border-[var(--accent-color)] pl-3'
                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <button
                    onClick={() => onSelectPlaylist(pl.id)}
                    className="flex items-center space-x-2.5 text-left truncate flex-1 min-w-0"
                  >
                    <ListMusic className="w-4 h-4 flex-shrink-0 text-zinc-400 group-hover:text-white" />
                    <span className="truncate text-[13px]">{pl.name}</span>
                    <span className="text-xs text-zinc-400 font-mono ml-1">
                      {pl.track_count}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete playlist "${pl.name}"?`)) {
                        onDeletePlaylist(pl.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1.5 rounded transition-opacity"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Library Stats & Scan Action */}
      <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--sidebar-color)] space-y-3">
        <button
          onClick={onOpenFolderPicker}
          disabled={isScanning}
          className="w-full flex items-center justify-center space-x-2.5 py-2.5 px-3.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors text-sm disabled:opacity-50 shadow-sm"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-color)]" />
              <span>Scanning Library...</span>
            </>
          ) : (
            <>
              <FolderOpen className="w-4.5 h-4.5 text-[var(--accent-color)]" />
              <span>Add Music Folder</span>
            </>
          )}
        </button>

        <div className="flex justify-between items-center text-xs text-zinc-400 px-1 font-medium">
          <div className="flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-zinc-400" />
            <span>{totalTracksCount} tracks</span>
          </div>
          <span className="text-emerald-400 font-mono text-xs">Ready</span>
        </div>
      </div>
    </aside>
  );
};
