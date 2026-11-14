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
  ];

  return (
    <aside className="w-52 h-full bg-[var(--sidebar-color)] border-r border-[var(--border-color)] flex flex-col justify-between select-none text-xs flex-shrink-0">
      {/* Top Navigation */}
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] px-2 mb-1 opacity-70">
            Library
          </div>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id && selectedPlaylistId === null;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full relative flex items-center space-x-2.5 px-2.5 py-1.5 rounded font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--surface-color)] text-[var(--text-main)] font-semibold border-l-2 border-[var(--accent-color)] pl-2'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--accent-color)]' : 'opacity-70'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playlists Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] opacity-70">
              Playlists
            </span>
            <button
              onClick={() => setIsCreating(true)}
              title="New Playlist"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
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
                className="w-full bg-[var(--surface-color)] text-xs text-[var(--text-main)] px-2 py-1 rounded border border-[var(--accent-color)] outline-none"
              />
            </form>
          )}

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {playlists.length === 0 && !isCreating && (
              <div className="text-[11px] text-[var(--text-muted)] px-2 py-1 italic opacity-60">
                No playlists created
              </div>
            )}
            {playlists.map((pl) => {
              const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
              return (
                <div
                  key={pl.id}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-[var(--surface-color)] text-[var(--text-main)] font-semibold border-l-2 border-[var(--accent-color)] pl-2'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <button
                    onClick={() => onSelectPlaylist(pl.id)}
                    className="flex items-center space-x-2 text-left truncate flex-1 min-w-0"
                  >
                    <ListMusic className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                    <span className="truncate">{pl.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] opacity-60 ml-1">
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
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Library Stats & Scan Action */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--sidebar-color)] space-y-2">
        <button
          onClick={onOpenFolderPicker}
          disabled={isScanning}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] text-[var(--text-main)] font-medium transition-colors text-xs disabled:opacity-50"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
              <span>Scanning Library...</span>
            </>
          ) : (
            <>
              <FolderOpen className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              <span>Add Music Folder</span>
            </>
          )}
        </button>

        <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] px-1">
          <div className="flex items-center space-x-1">
            <Database className="w-3 h-3 opacity-60" />
            <span>{totalTracksCount} tracks</span>
          </div>
          <span className="text-emerald-400 font-mono text-[9px] uppercase">Online</span>
        </div>
      </div>
    </aside>
  );
};
