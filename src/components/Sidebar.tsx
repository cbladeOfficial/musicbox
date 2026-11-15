import React, { useState } from 'react';
import {
  Home,
  Heart,
  Disc3,
  Music2,
  Users,
  Mic2,
  Flag,
  Folder,
  Radio,
  Plus,
  ListMusic,
  ChevronDown,
  Trash2,
  FolderOpen,
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
  onOpenCreatePlaylist: () => void;
  onRequestDeletePlaylist: (playlist: PlaylistRecord) => void;
  onOpenFolderPicker: () => void;
  totalTracksCount: number;
  radioStationsCount?: number;
  isRadioPlaying?: boolean;
  isScanning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onOpenCreatePlaylist,
  onRequestDeletePlaylist,
  onOpenFolderPicker,
  totalTracksCount,
  radioStationsCount = 0,
  isRadioPlaying = false,
  isScanning,
}) => {
  const [libraryExpanded, setLibraryExpanded] = useState(true);
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true);

  const libraryItems: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'albums', label: 'Albums', icon: Disc3 },
    { id: 'tracks', label: 'Tracks', icon: Music2 },
    { id: 'album_artists', label: 'Album Artists', icon: Users },
    { id: 'artists', label: 'Artists', icon: Mic2 },
    { id: 'genres', label: 'Genres', icon: Flag },
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'radio', label: 'Radio Stations', icon: Radio },
  ];

  return (
    <aside className="w-60 h-full bg-[var(--sidebar-color)] border-r border-[var(--border-color)] flex flex-col justify-between select-none text-sm flex-shrink-0">
      {/* Scrollable Navigation Area */}
      <div className="p-3.5 space-y-5 overflow-y-auto flex-1">
        {/* Section: My Library */}
        <div>
          <button
            onClick={() => setLibraryExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-2.5 py-1 mb-1.5 text-zinc-200 hover:text-white font-medium text-[13.5px] transition-colors rounded group"
          >
            <span>My Library</span>
            <ChevronDown
              className={`w-4 h-4 text-zinc-400 group-hover:text-white transition-transform duration-200 ${
                libraryExpanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>

          {libraryExpanded && (
            <div className="space-y-0.5 animate-fadeIn">
              {libraryItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  selectedPlaylistId === null &&
                  (currentView === item.id ||
                    (item.id === 'radio' && currentView === 'radio_form') ||
                    (item.id === 'tracks' && currentView === 'track_edit_form') ||
                    (item.id === 'albums' && currentView === 'album_detail') ||
                    (item.id === 'artists' && currentView === 'artist_detail') ||
                    (item.id === 'genres' && currentView === 'genre_detail'));

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full group flex items-center justify-between px-3 py-1.5 rounded-md text-[13.5px] transition-colors duration-150 ${
                      isActive
                        ? 'text-[var(--accent-color)] font-medium bg-[var(--accent-color)]/10'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5 font-normal'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-[var(--accent-color)]'
                            : 'text-zinc-400 group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {/* Radio playing animation indicator */}
                    {item.id === 'radio' && isRadioPlaying && (
                      <span
                        className="w-2 h-2 rounded-full mr-1 bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50"
                        title="Radio stream playing"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Playlists */}
        <div>
          <div className="flex items-center justify-between px-2.5 py-1 mb-1.5 text-zinc-200 font-medium text-[13.5px]">
            <span>Playlists</span>
            <div className="flex items-center space-x-1 text-zinc-400">
              <button
                onClick={onOpenCreatePlaylist}
                title="Create Playlist"
                className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (playlists.length > 0) {
                    onSelectPlaylist(playlists[0].id);
                  } else {
                    onOpenCreatePlaylist();
                  }
                }}
                title="Playlists Overview"
                className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <ListMusic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPlaylistsExpanded((prev) => !prev)}
                title={playlistsExpanded ? 'Collapse Playlists' : 'Expand Playlists'}
                className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    playlistsExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            </div>
          </div>

          {playlistsExpanded && (
            <div className="space-y-0.5 max-h-56 overflow-y-auto animate-fadeIn">
              {playlists.length === 0 && (
                <div className="text-[12px] text-zinc-400 px-3 py-1 italic">
                  No playlists created
                </div>
              )}
              {playlists.map((pl) => {
                const isSelected =
                  (currentView === 'playlist' || currentView === 'playlist_form') &&
                  selectedPlaylistId === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-md transition-colors ${
                      isSelected
                        ? 'text-[var(--accent-color)] font-medium bg-[var(--accent-color)]/10'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <button
                      onClick={() => onSelectPlaylist(pl.id)}
                      className="flex items-center space-x-2.5 text-left truncate flex-1 min-w-0"
                    >
                      <ListMusic
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'text-[var(--accent-color)]'
                            : 'text-zinc-400 group-hover:text-white'
                        }`}
                      />
                      <span className="truncate text-[13px]">{pl.name}</span>
                      <span className="text-xs text-zinc-400 font-mono ml-1">
                        {pl.track_count}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDeletePlaylist(pl);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Library Actions & Status */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--sidebar-color)] space-y-2.5">
        <button
          onClick={onOpenFolderPicker}
          disabled={isScanning}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors text-xs disabled:opacity-50 shadow-sm"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
              <span>Scanning Library...</span>
            </>
          ) : (
            <>
              <FolderOpen className="w-4 h-4 text-[var(--accent-color)]" />
              <span>Add Music Folder</span>
            </>
          )}
        </button>

        <div className="flex justify-between items-center text-[11px] text-zinc-400 px-1 font-medium">
          <div className="flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>{totalTracksCount} tracks</span>
          </div>
          <span className="text-emerald-400 font-mono text-[10.5px]">Ready</span>
        </div>
      </div>
    </aside>
  );
};
