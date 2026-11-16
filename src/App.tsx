import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ListMusic, Play, Pencil, Trash2 } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { TrackTable } from './components/TrackTable';
import { AlbumGrid, AlbumItem } from './components/AlbumGrid';
import { ArtistView, ArtistGroup } from './components/ArtistView';
import { AlbumDetailView } from './components/AlbumDetailView';
import { Visualizer } from './components/Visualizer';
import { LyricsDrawer } from './components/LyricsDrawer';
import { TrackInfoDrawer } from './components/TrackInfoDrawer';
import { QueueDrawer } from './components/QueueDrawer';
import { SettingsView } from './components/SettingsView';
import { RadioView } from './components/RadioView';
import { RadioStationFormView } from './components/RadioStationFormView';
import { PlaylistFormView } from './components/PlaylistFormView';
import { TrackEditFormView } from './components/TrackEditFormView';
import { HomeView } from './components/HomeView';
import { GenresView } from './components/GenresView';
import { FoldersView } from './components/FoldersView';
import { AlbumArtistsView } from './components/AlbumArtistsView';
import { FullVisualizerView } from './components/FullVisualizerView';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast, ToastMessage } from './components/Toast';

import { TrackRecord, PlaylistRecord, RadioStation, RadioMetadata, ViewMode, AppSettings, VisualizerMode } from './types/music';
import { TauriBridge, isTauri } from './services/tauriBridge';
import { audioEngine } from './services/audioEngine';
import { lastFmScrobbler } from './services/lastfmScrobbler';
import { MetadataService } from './services/metadataService';
import { getCoverUrl } from './utils/cover';
import {
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  updateMediaSessionPosition,
  setupMediaSessionActions,
} from './services/mediaSession';

const DEFAULT_SETTINGS: AppSettings = {
  defaultStartingPage: 'home',
  musicFolders: [],
  theme: 'feishin',
  fontFamily: 'Inter',
  startMaximized: true,
  customAccentColor: '#2f81f7',
  tableDensity: 'comfortable',
  trackSortField: 'title',
  trackSortAsc: true,
  visualizerMode: 'bars',
  visualizerHeight: 48,
  discordRpcEnabled: true,
  discordClientId: '1176718791388975124',
  discordShowYear: true,
  artSourcePriority: ['itunes', 'jiosaavn', 'lastfm'],
  lastfmEnabled: true,
  lastfmApiKey: '',
  lastfmSecret: '',
  lastfmUsername: '',
  lowMemoryMode: false,
};

export function App() {
  // Library data
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [streamPort, setStreamPort] = useState<number>(45321);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [currentRadio, setCurrentRadio] = useState<RadioStation | null>(null);
  const [radioNowPlaying, setRadioNowPlaying] = useState<RadioMetadata | null>(null);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const radioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('musicbox_repeat_mode');
      if (saved === 'off' || saved === 'all' || saved === 'one') {
        return saved;
      }
    }
    return 'off';
  });
  const [queue, setQueue] = useState<TrackRecord[]>([]);

  // Navigation & Views
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [navHistory, setNavHistory] = useState<ViewMode[]>(['home']);
  const [navHistoryIndex, setNavHistoryIndex] = useState(0);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistGroup | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stationToEdit, setStationToEdit] = useState<RadioStation | null>(null);
  const [playlistToEdit, setPlaylistToEdit] = useState<PlaylistRecord | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<TrackRecord | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isTotallyFullscreen, setIsTotallyFullscreen] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const navigateToView = useCallback((v: ViewMode) => {
    setCurrentView(v);
    setSelectedPlaylistId(null);
    setSelectedAlbum(null);
    setSelectedArtist(null);
    setNavHistory((prev) => [...prev.slice(0, navHistoryIndex + 1), v]);
    setNavHistoryIndex((prev) => prev + 1);
  }, [navHistoryIndex]);

  const handleNavigateBack = useCallback(() => {
    if (navHistoryIndex > 0) {
      const nextIdx = navHistoryIndex - 1;
      setNavHistoryIndex(nextIdx);
      setCurrentView(navHistory[nextIdx]);
      setSelectedPlaylistId(null);
      setSelectedAlbum(null);
      setSelectedArtist(null);
      setStationToEdit(null);
      setPlaylistToEdit(null);
      setTrackToEdit(null);
    }
  }, [navHistory, navHistoryIndex]);

  const handleNavigateForward = useCallback(() => {
    if (navHistoryIndex < navHistory.length - 1) {
      const nextIdx = navHistoryIndex + 1;
      setNavHistoryIndex(nextIdx);
      setCurrentView(navHistory[nextIdx]);
      setSelectedPlaylistId(null);
      setSelectedAlbum(null);
      setSelectedArtist(null);
      setStationToEdit(null);
      setPlaylistToEdit(null);
      setTrackToEdit(null);
    }
  }, [navHistory, navHistoryIndex]);

  const handleOpenAddRadioStation = useCallback(() => {
    setStationToEdit(null);
    navigateToView('radio_form');
  }, [navigateToView]);

  const handleOpenEditRadioStation = useCallback((station: RadioStation) => {
    setStationToEdit(station);
    navigateToView('radio_form');
  }, [navigateToView]);

  const handleOpenCreatePlaylist = useCallback(() => {
    setPlaylistToEdit(null);
    navigateToView('playlist_form');
  }, [navigateToView]);

  const handleOpenEditPlaylist = useCallback((pl: PlaylistRecord) => {
    setPlaylistToEdit(pl);
    navigateToView('playlist_form');
  }, [navigateToView]);

  const handleOpenEditTrack = useCallback((track: TrackRecord) => {
    setTrackToEdit(track);
    navigateToView('track_edit_form');
  }, [navigateToView]);

  // UI Drawers & Modals
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Metadata & Settings
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [resolvedCoverArt, setResolvedCoverArt] = useState<string | undefined>(undefined);

  // Apply Theme, Custom Accent Color, and Font Family
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    if (settings.customAccentColor) {
      document.documentElement.style.setProperty('--accent-color', settings.customAccentColor);
    }
    
    // Resolve font family
    let resolvedFont = `'Inter', sans-serif`;
    const f = settings.fontFamily || 'Inter';
    if (f === 'Geist Sans') {
      resolvedFont = `'Geist Sans', sans-serif`;
    } else if (f === 'Outfit') {
      resolvedFont = `'Outfit', sans-serif`;
    } else if (f === 'Roboto') {
      resolvedFont = `'Roboto', sans-serif`;
    } else if (f === 'JetBrains Mono') {
      resolvedFont = `'JetBrains Mono', monospace`;
    } else if (f === 'System UI' || f === 'System Sans') {
      resolvedFont = `system-ui, sans-serif`;
    } else if (f !== 'Inter') {
      resolvedFont = `'${f}', sans-serif`;
    }

    document.documentElement.style.setProperty('--app-font-family', resolvedFont);
    document.documentElement.style.setProperty('--font-sans', resolvedFont);
    document.body.style.setProperty('--app-font-family', resolvedFont);
    document.body.style.setProperty('--font-sans', resolvedFont);
    document.documentElement.style.fontFamily = resolvedFont;
    document.body.style.fontFamily = resolvedFont;
  }, [settings.theme, settings.customAccentColor, settings.fontFamily]);

  // Window state synchronization
  const syncMaximized = useCallback(async () => {
    if (isTauri()) {
      try {
        const max = await TauriBridge.isMaximized();
        setIsMaximized(max);
      } catch (err) {
        console.warn('Failed to query isMaximized', err);
      }
    }
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    if (isTauri()) {
      try {
        const nextState = await TauriBridge.maximize();
        setIsMaximized(nextState);
      } catch {
        // Fallback sync with short timeout for OS window animation
        setTimeout(syncMaximized, 60);
      }
    } else {
      setIsMaximized((prev) => !prev);
    }
  }, [syncMaximized]);

  // Window resize listeners for maximize/restore state
  useEffect(() => {
    syncMaximized();
    window.addEventListener('resize', syncMaximized);

    let unlistenResize: (() => void) | undefined;
    if (isTauri()) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().onResized(() => {
          syncMaximized();
        }).then((fn) => {
          unlistenResize = fn;
        }).catch(() => {});
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('resize', syncMaximized);
      if (unlistenResize) {
        unlistenResize();
      }
    };
  }, [syncMaximized]);

  // Load stream port and initial data
  useEffect(() => {
    TauriBridge.getStreamPort().then((p) => setStreamPort(p)).catch(() => {});
    loadLibrary();
    loadPlaylists();
    loadRadioStations();

    TauriBridge.loadSetting('user_settings').then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.defaultStartingPage) {
            setCurrentView(parsed.defaultStartingPage);
            setNavHistory([parsed.defaultStartingPage]);
            setNavHistoryIndex(0);
          }
          if (parsed.discordClientId === '1306646875971485777') {
            parsed.discordClientId = DEFAULT_SETTINGS.discordClientId;
            TauriBridge.setDiscordClientId(DEFAULT_SETTINGS.discordClientId).catch(() => {});
          }
          setSettings((prev) => ({ ...prev, ...parsed }));
          if (isTauri()) {
            if (parsed.startMaximized === false) {
              TauriBridge.center().catch(() => {});
            } else {
              TauriBridge.isMaximized().then((isMax) => {
                if (!isMax) {
                  TauriBridge.maximize().then(setIsMaximized).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        } catch { /* ignore */ }
      } else {
        if (isTauri()) {
          TauriBridge.isMaximized().then((isMax) => {
            if (!isMax) {
              TauriBridge.maximize().then(setIsMaximized).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    });

    TauriBridge.loadSetting('repeat_mode').then((saved) => {
      if (saved === 'off' || saved === 'all' || saved === 'one') {
        setRepeatMode(saved);
        localStorage.setItem('musicbox_repeat_mode', saved);
      }
    }).catch(() => {});

    return () => {
      if (radioTimerRef.current) {
        clearInterval(radioTimerRef.current);
      }
    };
  }, []);

  const loadRadioStations = async () => {
    try {
      const data = await TauriBridge.getRadioStations();
      setRadioStations(data);
    } catch (e) {
      console.warn('Failed to load radio stations:', e);
    }
  };

  const loadLibrary = async () => {
    try {
      const data = await TauriBridge.getTracks();
      setTracks(data);
    } catch (e) {
      console.warn('Failed to load tracks:', e);
    }
  };

  const loadPlaylists = async () => {
    try {
      const list = await TauriBridge.getPlaylists();
      setPlaylists(list);
    } catch (e) {
      console.warn('Failed to load playlists:', e);
    }
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    TauriBridge.saveSetting('user_settings', JSON.stringify(updated)).catch(() => {});

    if (newPartial.discordRpcEnabled !== undefined) {
      TauriBridge.toggleDiscordRpc(newPartial.discordRpcEnabled).catch(() => {});
    }
    if (newPartial.discordClientId !== undefined) {
      TauriBridge.setDiscordClientId(newPartial.discordClientId).catch(() => {});
    }
  };

  const handleToggleTotallyFullscreen = useCallback(() => {
    setIsTotallyFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isTotallyFullscreen) {
        setIsTotallyFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isTotallyFullscreen]);

  // Stop active radio stream polling
  const stopRadioPolling = useCallback(() => {
    if (radioTimerRef.current) {
      clearInterval(radioTimerRef.current);
      radioTimerRef.current = null;
    }
  }, []);

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const playedFromSearchRef = useRef<boolean>(false);

  // Play a specific track
  const handlePlayTrack = useCallback(
    async (track: TrackRecord, fromSearch?: boolean) => {
      stopRadioPolling();
      setCurrentRadio(null);
      setRadioNowPlaying(null);
      setResolvedCoverArt(undefined);

      const isFromSearch = fromSearch !== undefined ? fromSearch : searchQueryRef.current.trim().length > 0;
      playedFromSearchRef.current = isFromSearch;

      setCurrentTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(track.duration || 0);

      // Play via AudioEngine
      await audioEngine.playTrack(track, streamPort, 0);
      TauriBridge.recordPlay(track.id).catch(() => {});

      // Notify Last.fm
      if (settings.lastfmEnabled) {
        lastFmScrobbler.onTrackStart(track, settings.lastfmApiKey, settings.lastfmSecret);
      }

      // Update Discord Rich Presence immediately
      if (settings.discordRpcEnabled) {
        TauriBridge.updateDiscordPresence({
          title: track.title,
          artist: track.artist,
          album: track.album,
          year: settings.discordShowYear ? track.year : undefined,
          duration: track.duration,
          position: 0,
          coverUrl: undefined,
          isPlaying: true,
          clientId: settings.discordClientId,
        }).catch(() => {});
      }

      // Resolve online cover art (iTunes / JioSaavn / Last.fm)
      MetadataService.resolveCoverArt(
        track.artist,
        track.album,
        track.title,
        settings.artSourcePriority,
        settings.lastfmApiKey
      ).then((onlineCover) => {
        setResolvedCoverArt(onlineCover || undefined);

        // Update Discord Rich Presence with resolved online cover if available
        if (settings.discordRpcEnabled && onlineCover) {
          TauriBridge.updateDiscordPresence({
            title: track.title,
            artist: track.artist,
            album: track.album,
            year: settings.discordShowYear ? track.year : undefined,
            duration: track.duration,
            position: 0,
            coverUrl: onlineCover,
            isPlaying: true,
            clientId: settings.discordClientId,
          }).catch(() => {});
        }
      });
    },
    [streamPort, settings, stopRadioPolling]
  );

  // Play an online radio station
  const handlePlayRadio = useCallback(
    async (station: RadioStation) => {
      stopRadioPolling();
      setCurrentTrack(null);
      setCurrentRadio(station);
      setRadioNowPlaying(null);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);

      // Stream via AudioEngine
      await audioEngine.playRadio(station.url);

      const updatePresence = (meta?: RadioMetadata | null, playing = true) => {
        if (!settings.discordRpcEnabled) return;
        TauriBridge.updateRadioPresence({
          stationName: station.name,
          songTitle: meta?.title || station.name,
          artist: meta?.artist || 'Live Radio',
          iconUrl: station.favicon || undefined,
          isPlaying: playing,
          clientId: settings.discordClientId,
        }).catch(() => {});
      };

      // Set initial Discord RPC
      updatePresence(null, true);

      // Fetch ICY metadata immediately
      TauriBridge.fetchRadioMetadata(station.url)
        .then((meta) => {
          if (meta) {
            setRadioNowPlaying(meta);
            updatePresence(meta, true);
          }
        })
        .catch(() => {});

      // Poll stream ICY metadata every 10 seconds
      radioTimerRef.current = setInterval(async () => {
        try {
          const meta = await TauriBridge.fetchRadioMetadata(station.url);
          if (meta) {
            setRadioNowPlaying(meta);
            updatePresence(meta, true);
          }
        } catch {
          // stream poll ignore
        }
      }, 10000);
    },
    [settings, stopRadioPolling]
  );

  // PlayNext or skip track
  const handleNext = useCallback(() => {
    playedFromSearchRef.current = false;
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue((prev) => prev.slice(1));
      handlePlayTrack(nextTrack, false);
      return;
    }

    if (tracks.length === 0) return;

    if (isShuffle) {
      const randIdx = Math.floor(Math.random() * tracks.length);
      handlePlayTrack(tracks[randIdx], false);
    } else if (currentTrack) {
      const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
      const nextIdx = (currentIdx + 1) % tracks.length;
      handlePlayTrack(tracks[nextIdx], false);
    } else {
      handlePlayTrack(tracks[0], false);
    }
  }, [queue, tracks, isShuffle, currentTrack, handlePlayTrack]);

  const handlePrevious = useCallback(() => {
    playedFromSearchRef.current = false;
    if (currentTime > 3) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    if (tracks.length === 0) return;

    if (currentTrack) {
      const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
      const prevIdx = (currentIdx - 1 + tracks.length) % tracks.length;
      handlePlayTrack(tracks[prevIdx], false);
    }
  }, [currentTime, tracks, currentTrack, handlePlayTrack]);

  // Hook up AudioEngine events
  useEffect(() => {
    audioEngine.onTimeUpdate = (curr, dur) => {
      setCurrentTime(curr);
      if (dur > 0) setDuration(dur);
      updateMediaSessionPosition(curr, dur);

      if (settings.lastfmEnabled) {
        lastFmScrobbler.checkScrobbleEligibility(curr, settings.lastfmApiKey, settings.lastfmSecret);
      }
    };

    audioEngine.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
      if (currentRadio && settings.discordRpcEnabled) {
        TauriBridge.updateRadioPresence({
          stationName: currentRadio.name,
          songTitle: radioNowPlaying?.title || currentRadio.name,
          artist: radioNowPlaying?.artist || 'Live Radio',
          iconUrl: currentRadio.favicon || undefined,
          isPlaying: playing,
          clientId: settings.discordClientId,
        }).catch(() => {});
      } else if (currentTrack && settings.discordRpcEnabled) {
        TauriBridge.updateDiscordPresence({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          year: settings.discordShowYear ? currentTrack.year : undefined,
          duration: currentTrack.duration,
          position: audioEngine.getCurrentTime(),
          coverUrl: resolvedCoverArt,
          isPlaying: playing,
          clientId: settings.discordClientId,
        }).catch(() => {});
      }
    };

    audioEngine.onEnded = () => {
      // 1. Repeat One: replay current track from start
      if (repeatMode === 'one' && currentTrack) {
        audioEngine.seek(0);
        audioEngine.resume();
        return;
      }

      // 2. Track played by searching: do not move to next track
      if (playedFromSearchRef.current) {
        setIsPlaying(false);
        audioEngine.pause();
        audioEngine.seek(0);
        setCurrentTime(0);
        if (currentTrack && settings.discordRpcEnabled) {
          TauriBridge.updateDiscordPresence({
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album,
            year: settings.discordShowYear ? currentTrack.year : undefined,
            duration: currentTrack.duration,
            position: 0,
            coverUrl: resolvedCoverArt,
            isPlaying: false,
            clientId: settings.discordClientId,
          }).catch(() => {});
        }
        return;
      }

      // 3. Explicit queue: proceed through user queue items
      if (queue.length > 0) {
        const nextTrack = queue[0];
        setQueue((prev) => prev.slice(1));
        handlePlayTrack(nextTrack, false);
        return;
      }

      // 4. Played from track list: do not change unless repeat all is chosen
      if (repeatMode === 'all') {
        handleNext();
      } else {
        // Repeat is off: standard media player behavior - do not change track
        setIsPlaying(false);
        audioEngine.pause();
        audioEngine.seek(0);
        setCurrentTime(0);
        if (currentTrack && settings.discordRpcEnabled) {
          TauriBridge.updateDiscordPresence({
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album,
            year: settings.discordShowYear ? currentTrack.year : undefined,
            duration: currentTrack.duration,
            position: 0,
            coverUrl: resolvedCoverArt,
            isPlaying: false,
            clientId: settings.discordClientId,
          }).catch(() => {});
        }
      }
    };
  }, [currentTrack, currentRadio, radioNowPlaying, settings, repeatMode, resolvedCoverArt, handleNext, queue, handlePlayTrack]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        audioEngine.seek(audioEngine.getCurrentTime() + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        audioEngine.seek(Math.max(0, audioEngine.getCurrentTime() - 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const newVol = Math.min(1, volume + 0.05);
        handleVolumeChange(newVol);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const newVol = Math.max(0, volume - 0.05);
        handleVolumeChange(newVol);
      } else if (e.code === 'Escape') {
        setShowLyrics(false);
        setShowQueue(false);
        setShowInfo(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, isPlaying, volume]);

  // Volume & Mute handling
  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      audioEngine.setVolume(volume);
      setIsMuted(false);
    } else {
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const handlePlayPause = useCallback(() => {
    if (currentRadio) {
      if (isPlaying) {
        audioEngine.pause();
        setIsPlaying(false);
        if (settings.discordRpcEnabled) {
          TauriBridge.updateRadioPresence({
            stationName: currentRadio.name,
            songTitle: radioNowPlaying?.title || currentRadio.name,
            artist: radioNowPlaying?.artist || 'Live Radio',
            iconUrl: currentRadio.favicon || undefined,
            isPlaying: false,
            clientId: settings.discordClientId,
          }).catch(() => {});
        }
      } else {
        audioEngine.resume();
        setIsPlaying(true);
        if (settings.discordRpcEnabled) {
          TauriBridge.updateRadioPresence({
            stationName: currentRadio.name,
            songTitle: radioNowPlaying?.title || currentRadio.name,
            artist: radioNowPlaying?.artist || 'Live Radio',
            iconUrl: currentRadio.favicon || undefined,
            isPlaying: true,
            clientId: settings.discordClientId,
          }).catch(() => {});
        }
      }
      return;
    }

    if (!currentTrack) {
      if (tracks.length > 0) handlePlayTrack(tracks[0]);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.resume();
    }
  }, [currentRadio, isPlaying, settings, radioNowPlaying, currentTrack, tracks, handlePlayTrack]);

  const handleStop = useCallback(() => {
    audioEngine.pause();
    audioEngine.seek(0);
    setIsPlaying(false);
    setCurrentTime(0);
    if (settings.discordRpcEnabled) {
      TauriBridge.clearDiscordPresence().catch(() => {});
    }
  }, [settings.discordRpcEnabled]);

  // Save repeat mode state on change so it persists across app restarts
  useEffect(() => {
    localStorage.setItem('musicbox_repeat_mode', repeatMode);
    TauriBridge.saveSetting('repeat_mode', repeatMode).catch(() => {});
  }, [repeatMode]);

  // Sync playback state with Windows SMTC & Taskbar thumbnail toolbar
  useEffect(() => {
    updateMediaSessionPlaybackState(isPlaying);
    TauriBridge.updateTaskbarPlaybackState(isPlaying).catch(() => {});
  }, [isPlaying]);

  // Sync MediaSession metadata (Title, Artist, Album, Artwork) for Windows Action Center
  useEffect(() => {
    if (currentRadio) {
      updateMediaSessionMetadata({
        title: radioNowPlaying?.title || currentRadio.name,
        artist: radioNowPlaying?.artist || 'Live Radio',
        album: currentRadio.name,
        artworkUrl: currentRadio.favicon || undefined,
      });
    } else if (currentTrack) {
      const coverUrl = getCoverUrl(currentTrack.cover_path, streamPort, resolvedCoverArt);
      updateMediaSessionMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artworkUrl: coverUrl,
      });
    }
  }, [currentTrack, currentRadio, radioNowPlaying, resolvedCoverArt, streamPort]);

  // Register MediaSession action handlers (Windows Action Center & keyboard media keys)
  useEffect(() => {
    const cleanup = setupMediaSessionActions({
      onPlay: () => handlePlayPause(),
      onPause: () => handlePlayPause(),
      onPrevious: () => handlePrevious(),
      onNext: () => handleNext(),
      onStop: () => handleStop(),
      onSeek: (time) => audioEngine.seek(time),
    });
    return cleanup;
  }, [handlePlayPause, handlePrevious, handleNext, handleStop]);

  // Listen to Win32 Taskbar thumbnail toolbar events (VLC-style buttons on taskbar hover preview)
  useEffect(() => {
    if (!isTauri()) return;

    let unlistenToggle: (() => void) | undefined;
    let unlistenPrev: (() => void) | undefined;
    let unlistenNext: (() => void) | undefined;
    let unlistenStop: (() => void) | undefined;
    let isMounted = true;

    import('@tauri-apps/api/event').then(({ listen }) => {
      if (!isMounted) return;

      listen('media-toggle-play', () => {
        handlePlayPause();
      }).then((un) => {
        if (isMounted) unlistenToggle = un;
        else un();
      });

      listen('media-previous', () => {
        handlePrevious();
      }).then((un) => {
        if (isMounted) unlistenPrev = un;
        else un();
      });

      listen('media-next', () => {
        handleNext();
      }).then((un) => {
        if (isMounted) unlistenNext = un;
        else un();
      });

      listen('media-stop', () => {
        handleStop();
      }).then((un) => {
        if (isMounted) unlistenStop = un;
        else un();
      });
    });

    return () => {
      isMounted = false;
      unlistenToggle?.();
      unlistenPrev?.();
      unlistenNext?.();
      unlistenStop?.();
    };
  }, [handlePlayPause, handlePrevious, handleNext, handleStop]);

  const handleToggleFavorite = async (trackId: number) => {
    const isFav = await TauriBridge.toggleFavorite(trackId);
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, is_favorite: isFav } : t))
    );
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, is_favorite: isFav } : null));
    }
  };

  const handleToggleRadioFavorite = async (id: number) => {
    const isFav = await TauriBridge.toggleRadioFavorite(id);
    setRadioStations((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_favorite: isFav } : s))
    );
    if (currentRadio && currentRadio.id === id) {
      setCurrentRadio((prev) => (prev ? { ...prev, is_favorite: isFav } : null));
    }
  };

  const handleAddRadioStation = async (station: {
    name: string;
    url: string;
    favicon?: string;
    tags?: string;
    country?: string;
  }) => {
    await TauriBridge.addRadioStation(
      station.name,
      station.url,
      station.favicon,
      station.tags,
      station.country
    );
    await loadRadioStations();
  };

  const handleUpdateRadioStation = async (
    id: number,
    station: { name: string; url: string; favicon?: string; tags?: string }
  ) => {
    await TauriBridge.updateRadioStation(
      id,
      station.name,
      station.url,
      station.favicon,
      station.tags
    );
    await loadRadioStations();
    if (currentRadio && currentRadio.id === id) {
      setCurrentRadio((prev) => (prev ? { ...prev, ...station } : null));
    }
  };

  const handleDeleteRadioStation = async (id: number) => {
    await TauriBridge.deleteRadioStation(id);
    if (currentRadio && currentRadio.id === id) {
      audioEngine.pause();
      stopRadioPolling();
      setCurrentRadio(null);
      setRadioNowPlaying(null);
      setIsPlaying(false);
      TauriBridge.clearDiscordPresence().catch(() => {});
    }
    await loadRadioStations();
  };

  const handleScanFolder = async () => {
    try {
      const folder = await TauriBridge.pickDirectory();
      if (!folder) return;

      setIsScanning(true);
      await TauriBridge.scanDirectory(folder);
      await loadLibrary();
      setIsScanning(false);
    } catch (e) {
      console.error('Scan error:', e);
      setIsScanning(false);
    }
  };

  // Group tracks into Albums
  const albumGroups = useMemo(() => {
    const map = new Map<string, AlbumItem>();
    for (const t of tracks) {
      const key = `${t.artist}___${t.album}`;
      if (!map.has(key)) {
        map.set(key, {
          name: t.album,
          artist: t.artist,
          year: t.year,
          trackCount: 0,
          coverPath: t.cover_path,
          tracks: [],
        });
      }
      const item = map.get(key)!;
      item.trackCount += 1;
      item.tracks.push(t);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Group tracks into Artists
  const artistGroups = useMemo(() => {
    const map = new Map<string, ArtistGroup>();
    for (const t of tracks) {
      const artistName = t.artist || 'Unknown Artist';
      if (!map.has(artistName)) {
        map.set(artistName, {
          name: artistName,
          trackCount: 0,
          albumCount: 0,
          tracks: [],
        });
      }
      const item = map.get(artistName)!;
      item.trackCount += 1;
      item.tracks.push(t);
    }
    return Array.from(map.values()).map((a) => {
      const albums = new Set(a.tracks.map((t) => t.album));
      return { ...a, albumCount: albums.size };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  // Filtered tracks for search or views
  const displayTracks = useMemo(() => {
    let list = tracks;

    if (currentView === 'favorites') {
      list = list.filter((t) => t.is_favorite);
    } else if (currentView === 'playlist' && selectedPlaylistId !== null) {
      list = playlistTracks;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, currentView, selectedPlaylistId, playlistTracks, searchQuery]);

  const handleSelectPlaylist = async (id: number) => {
    setSelectedPlaylistId(id);
    setCurrentView('playlist');
    const plTracks = await TauriBridge.getPlaylistTracks(id);
    setPlaylistTracks(plTracks);
  };

  const handleCreatePlaylist = async (name: string) => {
    await TauriBridge.createPlaylist(name);
    await loadPlaylists();
  };

  const handleDeletePlaylist = async (id: number) => {
    await TauriBridge.deletePlaylist(id);
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(null);
      setCurrentView('tracks');
    }
    await loadPlaylists();
  };

  const handleSavePlaylistForm = async (data: {
    name: string;
    description: string;
    trackIds: number[];
  }) => {
    if (playlistToEdit) {
      if (data.name !== playlistToEdit.name) {
        await TauriBridge.renamePlaylist(playlistToEdit.id, data.name);
      }
      const existingTracks = await TauriBridge.getPlaylistTracks(playlistToEdit.id);
      const existingIds = new Set(existingTracks.map((t) => t.id));
      const targetIds = new Set(data.trackIds);

      for (const id of data.trackIds) {
        if (!existingIds.has(id)) {
          await TauriBridge.addToPlaylist(playlistToEdit.id, id);
        }
      }
      for (const t of existingTracks) {
        if (!targetIds.has(t.id)) {
          await TauriBridge.removeFromPlaylist(playlistToEdit.id, t.id);
        }
      }

      await loadPlaylists();
      const updatedTracks = await TauriBridge.getPlaylistTracks(playlistToEdit.id);
      setPlaylistTracks(updatedTracks);
      showToast(`Updated playlist "${data.name}"`);
      handleNavigateBack();
    } else {
      const newId = await TauriBridge.createPlaylist(data.name);
      for (const trackId of data.trackIds) {
        await TauriBridge.addToPlaylist(newId, trackId);
      }
      await loadPlaylists();
      showToast(`Created playlist "${data.name}"`);
      setSelectedPlaylistId(newId);
      const plTracks = await TauriBridge.getPlaylistTracks(newId);
      setPlaylistTracks(plTracks);
      setCurrentView('playlist');
    }
  };

  const handleRequestDeletePlaylist = (pl: PlaylistRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Playlist?',
      message: `Are you sure you want to delete "${pl.name}"? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        await handleDeletePlaylist(pl.id);
        setConfirmModal(null);
        showToast(`Deleted playlist "${pl.name}"`);
      },
    });
  };

  const handleRequestDeleteRadioStation = (station: RadioStation) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Radio Station?',
      message: `Are you sure you want to delete "${station.name}"? The stream will be removed from your stations.`,
      isDanger: true,
      onConfirm: async () => {
        await handleDeleteRadioStation(station.id);
        setConfirmModal(null);
        showToast(`Deleted radio station "${station.name}"`);
      },
    });
  };

  const handleSaveTrackEdit = async (data: {
    title: string;
    artist: string;
    album: string;
    genre?: string;
    year?: number;
    trackNumber?: number;
  }) => {
    if (!trackToEdit) return;
    await TauriBridge.updateTrackMetadata({
      trackId: trackToEdit.id,
      title: data.title,
      artist: data.artist,
      album: data.album,
      genre: data.genre,
      year: data.year,
      trackNumber: data.trackNumber,
    });

    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackToEdit.id
          ? {
              ...t,
              title: data.title,
              artist: data.artist,
              album: data.album,
              genre: data.genre,
              year: data.year,
              track_number: data.trackNumber,
            }
          : t
      )
    );

    if (currentTrack && currentTrack.id === trackToEdit.id) {
      setCurrentTrack((prev) =>
        prev
          ? {
              ...prev,
              title: data.title,
              artist: data.artist,
              album: data.album,
              genre: data.genre,
              year: data.year,
              track_number: data.trackNumber,
            }
          : null
      );
    }

    showToast(`Updated tags for "${data.title}"`);
  };

  const handleAddToPlaylist = async (playlistId: number, trackId: number) => {
    await TauriBridge.addToPlaylist(playlistId, trackId);
    await loadPlaylists();
  };

  const handlePlayAlbum = (album: AlbumItem, shuffle = false) => {
    if (album.tracks.length === 0) return;
    const albumTracks = [...album.tracks];
    if (shuffle) {
      albumTracks.sort(() => Math.random() - 0.5);
    }
    handlePlayTrack(albumTracks[0]);
    setQueue(albumTracks.slice(1));
  };

  const handlePlayArtist = (artist: ArtistGroup, shuffle = false) => {
    if (artist.tracks.length === 0) return;
    const artistTracks = [...artist.tracks];
    if (shuffle) {
      artistTracks.sort(() => Math.random() - 0.5);
    }
    handlePlayTrack(artistTracks[0]);
    setQueue(artistTracks.slice(1));
  };

  const handleNavigateToAlbum = (albumName: string, artistName?: string) => {
    const found = albumGroups.find(
      (a) =>
        a.name.toLowerCase() === albumName.toLowerCase() &&
        (!artistName || a.artist.toLowerCase() === artistName.toLowerCase())
    ) || albumGroups.find((a) => a.name.toLowerCase() === albumName.toLowerCase());

    if (found) {
      setSelectedAlbum(found);
      setCurrentView('albums');
    }
  };

  const handleNavigateToArtist = (artistName: string) => {
    const found = artistGroups.find(
      (a) => a.name.toLowerCase() === artistName.toLowerCase()
    );
    if (found) {
      setSelectedArtist(found);
      setCurrentView('artists');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] antialiased">
      {/* 1. Feishin Top Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => navigateToView('settings')}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
        discordActive={settings.discordRpcEnabled}
        density={settings.tableDensity}
        onToggleDensity={() => {
          const next = settings.tableDensity === 'compact' ? 'comfortable' : 'compact';
          handleUpdateSettings({ tableDensity: next });
        }}
        onNavigateBack={handleNavigateBack}
        onNavigateForward={handleNavigateForward}
        canNavigateBack={navHistoryIndex > 0}
        canNavigateForward={navHistoryIndex < navHistory.length - 1}
      />

      {/* 2. Main Center Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {currentView !== 'visualizer' && (
          <Sidebar
            currentView={currentView}
            onSelectView={navigateToView}
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={handleSelectPlaylist}
            onOpenCreatePlaylist={handleOpenCreatePlaylist}
            onRequestDeletePlaylist={handleRequestDeletePlaylist}
            onOpenFolderPicker={handleScanFolder}
            totalTracksCount={tracks.length}
            radioStationsCount={radioStations.length}
            isRadioPlaying={currentRadio !== null && isPlaying}
            isScanning={isScanning}
          />
        )}

        {/* Center Content Views */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-color)]">
          {currentView === 'home' ? (
            <HomeView
              tracks={tracks}
              streamPort={streamPort}
              onPlayTrack={handlePlayTrack}
              onSelectAlbum={(albName) => handleNavigateToAlbum(albName)}
              onSelectArtist={(artName) => handleNavigateToArtist(artName)}
              onSelectGenre={(genreName) => {
                setSelectedGenre(genreName);
                navigateToView('genres');
              }}
            />
          ) : currentView === 'genres' ? (
            <GenresView
              tracks={tracks}
              selectedGenre={selectedGenre}
              onSelectGenre={(g) => setSelectedGenre(g)}
              onPlayTrack={handlePlayTrack}
              onPlayTracks={(gTracks) => {
                if (gTracks.length > 0) {
                  setQueue(gTracks);
                  handlePlayTrack(gTracks[0]);
                }
              }}
              streamPort={streamPort}
            />
          ) : currentView === 'folders' ? (
            <FoldersView
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onPlayTracks={(fTracks) => {
                if (fTracks.length > 0) {
                  setQueue(fTracks);
                  handlePlayTrack(fTracks[0]);
                }
              }}
            />
          ) : currentView === 'album_artists' ? (
            <AlbumArtistsView
              tracks={tracks}
              onSelectArtist={(artName) => handleNavigateToArtist(artName)}
              onPlayTracks={(artTracks) => {
                if (artTracks.length > 0) {
                  setQueue(artTracks);
                  handlePlayTrack(artTracks[0]);
                }
              }}
              streamPort={streamPort}
            />
          ) : currentView === 'visualizer' ? (
            <FullVisualizerView
              currentTrack={currentTrack}
              currentRadio={currentRadio}
              radioNowPlaying={radioNowPlaying}
              isPlaying={isPlaying}
              accentColor={settings.customAccentColor}
              coverUrl={
                resolvedCoverArt ||
                getCoverUrl(currentTrack?.cover_path, streamPort)
              }
              visualizerMode={settings.visualizerMode}
              onChangeVisualizerMode={(m) => handleUpdateSettings({ visualizerMode: m })}
              onClose={() => {
                if (isTotallyFullscreen) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  setIsTotallyFullscreen(false);
                }
                handleNavigateBack();
              }}
              onTogglePlay={handlePlayPause}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSeek={(sec) => audioEngine.seek(sec)}
              volume={volume}
              onVolumeChange={handleVolumeChange}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              currentTime={currentTime}
              duration={duration}
              isTotallyFullscreen={isTotallyFullscreen}
              onToggleTotallyFullscreen={handleToggleTotallyFullscreen}
            />
          ) : currentView === 'tracks' || currentView === 'favorites' || currentView === 'playlist' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {currentView === 'playlist' && selectedPlaylistId !== null && (
                <div className="h-14 border-b border-[var(--border-color)] px-5 flex items-center justify-between bg-[var(--surface-color)]/60 backdrop-blur-md flex-shrink-0">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] flex-shrink-0 shadow-sm">
                      <ListMusic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-semibold text-white truncate">
                          {playlists.find((p) => p.id === selectedPlaylistId)?.name || 'Playlist'}
                        </h2>
                        <span className="text-xs text-zinc-400 font-mono">
                          ({playlistTracks.length} tracks)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {playlistTracks.length > 0 && (
                      <button
                        onClick={() => {
                          if (playlistTracks.length > 0) {
                            setQueue(playlistTracks);
                            handlePlayTrack(playlistTracks[0]);
                          }
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--accent-color)] text-white hover:brightness-110 transition-opacity active:opacity-75 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play All</span>
                      </button>
                    )}

                    {(() => {
                      const curPl = playlists.find((p) => p.id === selectedPlaylistId);
                      if (!curPl) return null;
                      return (
                        <>
                          <button
                            onClick={() => handleOpenEditPlaylist(curPl)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                            title="Edit Playlist parameters and tracks"
                          >
                            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Edit Playlist</span>
                          </button>

                          <button
                            onClick={() => handleRequestDeletePlaylist(curPl)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                            title="Delete Playlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              <TrackTable
                tracks={displayTracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                density={settings.tableDensity}
                streamPort={streamPort}
                onPlayTrack={handlePlayTrack}
                onToggleFavorite={handleToggleFavorite}
                onAddToQueue={(t) => setQueue((prev) => [...prev, t])}
                playlists={playlists}
                onAddToPlaylist={handleAddToPlaylist}
                onViewAlbum={handleNavigateToAlbum}
                onViewArtist={handleNavigateToArtist}
                onEditTrackMetadata={handleOpenEditTrack}
                sortField={settings.trackSortField || 'title'}
                sortAsc={settings.trackSortAsc ?? true}
                onSortChange={(field, asc) => {
                  handleUpdateSettings({ trackSortField: field, trackSortAsc: asc });
                }}
              />
            </div>
          ) : currentView === 'playlist_form' ? (
            <PlaylistFormView
              playlistToEdit={playlistToEdit}
              existingPlaylistTrackIds={playlistToEdit ? playlistTracks.map((t) => t.id) : []}
              allTracks={tracks}
              onSave={handleSavePlaylistForm}
              onBack={handleNavigateBack}
            />
          ) : currentView === 'track_edit_form' ? (
            trackToEdit ? (
              <TrackEditFormView
                track={trackToEdit}
                streamPort={streamPort}
                onSave={handleSaveTrackEdit}
                onBack={handleNavigateBack}
              />
            ) : null
          ) : currentView === 'radio' ? (
            <RadioView
              stations={radioStations}
              activeStationId={currentRadio?.id}
              isPlaying={isPlaying && !!currentRadio}
              onPlayStation={handlePlayRadio}
              onToggleFavorite={handleToggleRadioFavorite}
              onAddStation={handleAddRadioStation}
              onOpenAddStation={handleOpenAddRadioStation}
              onOpenEditStation={handleOpenEditRadioStation}
              onRequestDeleteStation={handleRequestDeleteRadioStation}
              onNotify={(msg) => showToast(msg, 'success')}
            />
          ) : currentView === 'radio_form' ? (
            <RadioStationFormView
              stationToEdit={stationToEdit}
              onSave={(stationData) => {
                if (stationToEdit) {
                  handleUpdateRadioStation(stationToEdit.id, stationData);
                  showToast(`Updated station "${stationData.name}"`);
                } else {
                  handleAddRadioStation(stationData);
                  showToast(`Added station "${stationData.name}"`);
                }
                handleNavigateBack();
              }}
              onBack={handleNavigateBack}
            />
          ) : currentView === 'albums' ? (
            selectedAlbum ? (
              <AlbumDetailView
                album={selectedAlbum}
                streamPort={streamPort}
                onBack={() => setSelectedAlbum(null)}
                onPlayTrack={handlePlayTrack}
                onPlayAlbum={handlePlayAlbum}
                currentTrackId={currentTrack?.id}
                lastfmApiKey={settings.lastfmApiKey}
              />
            ) : (
              <AlbumGrid
                albums={albumGroups}
                streamPort={streamPort}
                onSelectAlbum={(alb) => setSelectedAlbum(alb)}
                onPlayAlbum={handlePlayAlbum}
              />
            )
          ) : currentView === 'artists' ? (
            <ArtistView
              artists={artistGroups}
              selectedArtist={selectedArtist}
              onSelectArtist={(art) => setSelectedArtist(art)}
              onBackToArtists={() => setSelectedArtist(null)}
              onPlayTrack={handlePlayTrack}
              onPlayArtist={handlePlayArtist}
              currentTrackId={currentTrack?.id}
              lastfmApiKey={settings.lastfmApiKey}
              streamPort={streamPort}
              onViewAlbum={handleNavigateToAlbum}
            />
          ) : currentView === 'settings' ? (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onScanFolder={handleScanFolder}
              isScanning={isScanning}
              onBack={handleNavigateBack}
            />
          ) : null}
        </main>

        {/* Right Lyrics Drawer */}
        <LyricsDrawer
          currentTrack={currentTrack}
          currentTime={currentTime}
          isOpen={showLyrics}
          onClose={() => setShowLyrics(false)}
          onSeek={(t) => audioEngine.seek(t)}
        />

        {/* Right Track Info Drawer */}
        <TrackInfoDrawer
          currentTrack={currentTrack}
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          lastfmApiKey={settings.lastfmApiKey}
          coverArtUrl={resolvedCoverArt}
          streamPort={streamPort}
        />

        {/* Right Queue Drawer */}
        <QueueDrawer
          queue={queue}
          currentTrack={currentTrack}
          isOpen={showQueue}
          onClose={() => setShowQueue(false)}
          onPlayFromQueue={(idx) => {
            const tr = queue[idx];
            setQueue((prev) => prev.filter((_, i) => i !== idx));
            handlePlayTrack(tr);
          }}
          onRemoveFromQueue={(idx) => setQueue((prev) => prev.filter((_, i) => i !== idx))}
          onClearQueue={() => setQueue([])}
        />
      </div>

      {/* 3. Audio Visualizer Canvas */}
      {currentView !== 'visualizer' && (
        <Visualizer
          mode={settings.visualizerMode}
          isPlaying={isPlaying}
          accentColor="var(--accent-color)"
          height={settings.visualizerHeight}
        />
      )}

      {/* 4. Feishin Bottom Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        currentRadio={currentRadio}
        radioNowPlaying={radioNowPlaying}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        visualizerMode={settings.visualizerMode}
        isFullVisualizer={currentView === 'visualizer'}
        showLyrics={showLyrics}
        showQueue={showQueue}
        showInfo={showInfo}
        streamPort={streamPort}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSeek={(time) => audioEngine.seek(time)}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={() => {
          const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
          const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
          setRepeatMode(next);
        }}
        onToggleVisualizer={() => {
          const modes: VisualizerMode[] = [
            'bars',
            'mirror-bars',
            'wave',
            'circle',
            'rainbow-ribbon',
            'particles',
            'off',
          ];
          const next = modes[(modes.indexOf(settings.visualizerMode) + 1) % modes.length];
          handleUpdateSettings({ visualizerMode: next });
        }}
        onToggleFullVisualizer={() => {
          if (currentView === 'visualizer') {
            handleNavigateBack();
          } else {
            navigateToView('visualizer');
          }
        }}
        onToggleLyrics={() => {
          setShowLyrics(!showLyrics);
          if (!showLyrics) {
            setShowInfo(false);
            setShowQueue(false);
          }
        }}
        onToggleQueue={() => {
          setShowQueue(!showQueue);
          if (!showQueue) {
            setShowLyrics(false);
            setShowInfo(false);
          }
        }}
        onToggleInfo={() => {
          setShowInfo(!showInfo);
          if (!showInfo) {
            setShowLyrics(false);
            setShowQueue(false);
          }
        }}
        onToggleFavorite={handleToggleFavorite}
        onToggleRadioFavorite={handleToggleRadioFavorite}
        coverArtUrl={resolvedCoverArt}
      />

      {/* Non-blocking Toast Alerts */}
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* In-App Feishin Modal Confirmation */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

export default App;
