import React, { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  Heart,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Search,
  ExternalLink,
  Volume2,
  X,
  Sparkles,
  Check,
  Disc3,
  Loader2,
} from 'lucide-react';
import { RadioStation } from '../types/music';
import { RadioBrowserService, OnlineStationResult } from '../services/radioBrowserService';
import { RadioStationIcon } from './RadioStationIcon';

interface RadioViewProps {
  stations: RadioStation[];
  activeStationId?: number;
  isPlaying: boolean;
  onPlayStation: (station: RadioStation) => void;
  onToggleFavorite: (id: number) => void;
  onAddStation: (station: {
    name: string;
    url: string;
    favicon?: string;
    tags?: string;
    country?: string;
  }) => void;
  onOpenAddStation: () => void;
  onOpenEditStation: (station: RadioStation) => void;
  onRequestDeleteStation: (station: RadioStation) => void;
  onNotify?: (text: string) => void;
}

type RadioTab = 'my_stations' | 'favorites' | 'directory';

const GENRE_TAGS = [
  'All',
  'Lofi',
  'Ambient',
  'Electronic',
  'Jazz',
  'Classical',
  'Rock',
  'Pop',
  'Synthwave',
  'Chill',
];

const PRESET_ICONS = [
  'https://play-lh.googleusercontent.com/9v4e5qH4P4fWbT9yNl59s4X1z7p6-J38N_o5M03sWJ5gB4F9rA3xXz',
  'https://plaza.one/apple-touch-icon.png',
  'https://somafm.com/img/groovesalad120.png',
  'https://somafm.com/img/defcon120.png',
  'https://kexp.org/static/assets/img/kexp-logo-square.png',
  'https://ibizaglobalradio.com/wp-content/uploads/2021/04/cropped-favicon-192x192.png',
];

export const RadioView: React.FC<RadioViewProps> = ({
  stations,
  activeStationId,
  isPlaying,
  onPlayStation,
  onToggleFavorite,
  onAddStation,
  onOpenAddStation,
  onOpenEditStation,
  onRequestDeleteStation,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<RadioTab>('my_stations');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  // Online Radio Directory state
  const [onlineStations, setOnlineStations] = useState<OnlineStationResult[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);

  // Fetch online directory when tab is active
  useEffect(() => {
    if (activeTab === 'directory') {
      setLoadingOnline(true);
      if (selectedGenre === 'All') {
        RadioBrowserService.getTopStations().then((data) => {
          setOnlineStations(data);
          setLoadingOnline(false);
        });
      } else {
        RadioBrowserService.getStationsByTag(selectedGenre).then((data) => {
          setOnlineStations(data);
          setLoadingOnline(false);
        });
      }
    }
  }, [activeTab, selectedGenre]);

  const handleOnlineSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingOnline(true);
    RadioBrowserService.searchStations(searchQuery).then((data) => {
      setOnlineStations(data);
      setLoadingOnline(false);
    });
  };

  // Favorite count
  const favoriteCount = stations.filter((s) => s.is_favorite).length;

  // Filter local stations
  const displayedStations = stations.filter((st) => {
    if (activeTab === 'favorites' && !st.is_favorite) return false;
    if (searchQuery.trim() && activeTab !== 'directory') {
      const q = searchQuery.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        (st.tags && st.tags.toLowerCase().includes(q)) ||
        (st.country && st.country.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[var(--bg-color)]">
      {/* 1. Header Toolbar */}
      <div className="h-12 border-b border-[var(--border-color)] px-5 flex items-center justify-between bg-[var(--sidebar-color)] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-[var(--accent-color)]" />
            <h1 className="text-sm font-medium text-white">
              Online Radio
            </h1>
            <span className="text-[11px] px-2 py-0.2 rounded-md bg-white/5 text-zinc-400 font-mono border border-white/5">
              {stations.length}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 pl-4">
            <button
              onClick={() => setActiveTab('my_stations')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'my_stations'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              My Stations ({stations.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Favorites ({favoriteCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                activeTab === 'directory'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Explore Radio Directory</span>
            </button>
          </div>
        </div>

        {/* Right Actions: Search + Add Station */}
        <div className="flex items-center space-x-2.5">
          {activeTab === 'directory' ? (
            <form onSubmit={handleOnlineSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search global stations..."
                className="w-52 bg-[var(--surface-color)] text-xs text-[var(--text-main)] pl-8 pr-3 py-1.5 rounded-md border border-[var(--border-color)] focus:border-[var(--accent-color)] outline-none"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
            </form>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter stations..."
                className="w-48 bg-[var(--surface-color)] text-xs text-[var(--text-main)] pl-8 pr-3 py-1.5 rounded-md border border-[var(--border-color)] focus:border-[var(--accent-color)] outline-none"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
            </div>
          )}

          <button
            onClick={onOpenAddStation}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white text-xs font-medium transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Station</span>
          </button>
        </div>
      </div>

      {/* 2. Genre Tags Filter (Visible in Directory) */}
      {activeTab === 'directory' && (
        <div className="px-5 py-2 border-b border-[var(--border-color)] bg-[var(--surface-color)]/30 flex items-center space-x-1.5 overflow-x-auto flex-shrink-0">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] mr-1">
            Genre:
          </span>
          {GENRE_TAGS.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors ${
                selectedGenre === genre
                  ? 'bg-[var(--accent-color)] text-white font-medium'
                  : 'bg-[var(--surface-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* 3. Station Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'directory' ? (
          // Global Directory Results
          loadingOnline ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-[var(--text-muted)] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-color)]" />
              <span>Browsing worldwide radio directory...</span>
            </div>
          ) : onlineStations.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] italic">
              No online radio stations found matching your query.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {onlineStations.map((st) => (
                <div
                  key={st.stationuuid}
                  className="group flex flex-col justify-between p-3 rounded bg-[var(--surface-color)]/60 hover:bg-[var(--surface-color)] border border-[var(--border-color)]/60 hover:border-[var(--border-color)] transition-all shadow-sm"
                >
                  <div className="flex items-start space-x-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-[var(--surface-active)] border border-[var(--border-color)]/60 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
                      <RadioStationIcon
                        favicon={st.favicon}
                        name={st.name}
                        iconClassName="text-[var(--accent-color)] text-base"
                      />
                    </div>

                    <div className="flex-1 truncate">
                      <div className="font-semibold text-xs text-[var(--text-main)] truncate" title={st.name}>
                        {st.name}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        {st.country || 'Global Stream'}
                      </div>
                      {st.codec && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--surface-active)] text-[var(--text-muted)] font-mono mt-1 inline-block">
                          {st.codec.toUpperCase()} {st.bitrate ? `${st.bitrate}k` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/40 text-xs">
                    <button
                      onClick={() => {
                        onPlayStation({
                          id: -1,
                          name: st.name,
                          url: st.url_resolved || st.url,
                          favicon: st.favicon || undefined,
                          tags: st.tags || undefined,
                          country: st.country || undefined,
                          is_favorite: false,
                          created_at: Date.now(),
                        });
                      }}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--accent-color)] text-white font-medium hover:brightness-110 transition-all text-[11px]"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Listen</span>
                    </button>

                    <button
                      onClick={() => {
                        onAddStation({
                          name: st.name,
                          url: st.url_resolved || st.url,
                          favicon: st.favicon || undefined,
                          tags: st.tags || undefined,
                          country: st.country || undefined,
                        });
                        if (onNotify) {
                          onNotify(`Added "${st.name}" to My Stations`);
                        }
                      }}
                      title="Add to My Stations"
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors flex items-center space-x-1 text-[11px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Saved / Favorite Stations Grid
          displayedStations.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-3">
              <Radio className="w-10 h-10 opacity-30 stroke-1" />
              <p>No radio stations found. Click "Add Station" or explore the Online Directory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedStations.map((station) => {
                const isCurrent = activeStationId === station.id;

                return (
                  <div
                    key={station.id}
                    className={`group relative flex flex-col justify-between p-4 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border transition-all duration-200 shadow-sm hover:shadow-xl ${
                      isCurrent
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-1 ring-[var(--accent-color)]/30'
                        : 'border-[var(--border-color)] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      {/* Station Icon with Live indicator */}
                      <div className="relative w-14 h-14 rounded-lg bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-md">
                        <RadioStationIcon
                          favicon={station.favicon}
                          name={station.name}
                          iconClassName="text-[var(--accent-color)] text-xl"
                        />

                        {isCurrent && (
                          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="font-medium text-[14px] text-white truncate cursor-pointer hover:underline"
                            onClick={() => onPlayStation(station)}
                            title={station.name}
                          >
                            {station.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 mt-1 text-xs text-zinc-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          <span className="font-mono font-medium text-emerald-400 text-xs">
                            Live
                          </span>
                          {station.country && (
                            <>
                              <span>•</span>
                              <span className="truncate">{station.country}</span>
                            </>
                          )}
                        </div>

                        {station.tags && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {station.tags
                              .split(',')
                              .slice(0, 2)
                              .map((t) => (
                                <span
                                  key={t}
                                  className="text-xs px-2 py-0.5 rounded bg-[var(--surface-active)] text-zinc-300 border border-[var(--border-color)]/60 truncate"
                                >
                                  {t.trim()}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/40 text-xs">
                      <button
                        onClick={() => onPlayStation(station)}
                        className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold shadow-sm transition-all ${
                          isCurrent
                            ? 'bg-[var(--accent-color)] text-white brightness-110'
                            : 'bg-[var(--surface-active)] hover:bg-[var(--accent-color)] hover:text-white text-[var(--text-main)] border border-[var(--border-color)]'
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center space-x-0.5">
                        <button
                          onClick={() => onToggleFavorite(station.id)}
                          title={station.is_favorite ? 'Remove Favorite' : 'Favorite'}
                          className={`p-1 rounded transition-colors ${
                            station.is_favorite
                              ? 'text-rose-500 hover:text-rose-400'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${station.is_favorite ? 'fill-rose-500' : ''}`} />
                        </button>

                        <button
                          onClick={() => onOpenEditStation(station)}
                          title="Edit Station"
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onRequestDeleteStation(station)}
                          title="Delete Station"
                          className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--surface-hover)] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};
