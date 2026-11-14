import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { SettingsModal } from './components/SettingsModal';

import { TrackRecord, PlaylistRecord, ViewMode, AppSettings } from './types/music';
import { TauriBridge, isTauri } from './services/tauriBridge';
import { audioEngine } from './services/audioEngine';
import { lastFmScrobbler } from './services/lastfmScrobbler';
import { MetadataService } from './services/metadataService';

const DEFAULT_SETTINGS: AppSettings = {
  musicFolders: [],
  theme: 'feishin',
  customAccentColor: '#2f81f7',
  tableDensity: 'comfortable',
  visualizerMode: 'bars',
  visualizerHeight: 48,
  discordRpcEnabled: true,
  discordClientId: '1306646875971485777',
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [queue, setQueue] = useState<TrackRecord[]>([]);

  // Navigation & Views
  const [currentView, setCurrentView] = useState<ViewMode>('tracks');
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistGroup | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // UI Drawers & Modals
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Metadata & Settings
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [resolvedCoverArt, setResolvedCoverArt] = useState<string | undefined>(undefined);

  // Apply Theme & Custom Accent Color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    if (settings.customAccentColor) {
      document.documentElement.style.setProperty('--accent-color', settings.customAccentColor);
    }
  }, [settings.theme, settings.customAccentColor]);

  // Load stream port and initial data
  useEffect(() => {
    TauriBridge.getStreamPort().then((p) => setStreamPort(p)).catch(() => {});
    loadLibrary();
    loadPlaylists();

    if (isTauri()) {
      TauriBridge.isMaximized().then(setIsMaximized).catch(() => {});
    }

    TauriBridge.loadSetting('user_settings').then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch { /* ignore */ }
      }
    });
  }, []);

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

  // Play a specific track
  const handlePlayTrack = useCallback(
    async (track: TrackRecord) => {
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

      // Resolve online cover art (iTunes / JioSaavn / Last.fm)
      MetadataService.resolveCoverArt(
        track.artist,
        track.album,
        track.title,
        settings.artSourcePriority,
        settings.lastfmApiKey
      ).then((onlineCover) => {
        setResolvedCoverArt(onlineCover || undefined);

        // Update Discord Rich Presence
        if (settings.discordRpcEnabled) {
          TauriBridge.updateDiscordPresence({
            title: track.title,
            artist: track.artist,
            album: track.album,
            year: settings.discordShowYear ? track.year : undefined,
            duration: track.duration,
            position: 0,
            coverUrl: onlineCover || undefined,
            isPlaying: true,
            clientId: settings.discordClientId,
          }).catch(() => {});
        }
      });
    },
    [streamPort, settings]
  );

  // PlayNext or skip track
  const handleNext = useCallback(() => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue((prev) => prev.slice(1));
      handlePlayTrack(nextTrack);
      return;
    }

    if (tracks.length === 0) return;

    if (isShuffle) {
      const randIdx = Math.floor(Math.random() * tracks.length);
      handlePlayTrack(tracks[randIdx]);
    } else if (currentTrack) {
      const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
      const nextIdx = (currentIdx + 1) % tracks.length;
      handlePlayTrack(tracks[nextIdx]);
    } else {
      handlePlayTrack(tracks[0]);
    }
  }, [queue, tracks, isShuffle, currentTrack, handlePlayTrack]);

  const handlePrevious = useCallback(() => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    if (tracks.length === 0) return;

    if (currentTrack) {
      const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
      const prevIdx = (currentIdx - 1 + tracks.length) % tracks.length;
      handlePlayTrack(tracks[prevIdx]);
    }
  }, [currentTime, tracks, currentTrack, handlePlayTrack]);

  // Hook up AudioEngine events
  useEffect(() => {
    audioEngine.onTimeUpdate = (curr, dur) => {
      setCurrentTime(curr);
      if (dur > 0) setDuration(dur);

      if (settings.lastfmEnabled) {
        lastFmScrobbler.checkScrobbleEligibility(curr, settings.lastfmApiKey, settings.lastfmSecret);
      }
    };

    audioEngine.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
      if (currentTrack && settings.discordRpcEnabled) {
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
      if (repeatMode === 'one' && currentTrack) {
        audioEngine.seek(0);
        audioEngine.resume();
      } else {
        handleNext();
      }
    };
  }, [currentTrack, settings, repeatMode, resolvedCoverArt, handleNext]);

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
        setIsSettingsOpen(false);
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

  const handlePlayPause = () => {
    if (!currentTrack) {
      if (tracks.length > 0) handlePlayTrack(tracks[0]);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.resume();
    }
  };

  const handleToggleFavorite = async (trackId: number) => {
    const isFav = await TauriBridge.toggleFavorite(trackId);
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, is_favorite: isFav } : t))
    );
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack((prev) => (prev ? { ...prev, is_favorite: isFav } : null));
    }
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

  const handleNavigateToAlbum = (albumName: string, artistName: string) => {
    const found = albumGroups.find(
      (a) =>
        a.name.toLowerCase() === albumName.toLowerCase() &&
        a.artist.toLowerCase() === artistName.toLowerCase()
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--text-main)] font-sans antialiased">
      {/* 1. Feishin Top Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMaximized={isMaximized}
        onToggleMaximize={() => {
          TauriBridge.maximize();
          setIsMaximized(!isMaximized);
        }}
        discordActive={settings.discordRpcEnabled}
        density={settings.tableDensity}
        onToggleDensity={() => {
          const next = settings.tableDensity === 'compact' ? 'comfortable' : 'compact';
          handleUpdateSettings({ tableDensity: next });
        }}
      />

      {/* 2. Main Center Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(v) => {
            setCurrentView(v);
            setSelectedPlaylistId(null);
            setSelectedAlbum(null);
            setSelectedArtist(null);
          }}
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          onSelectPlaylist={handleSelectPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onOpenFolderPicker={handleScanFolder}
          totalTracksCount={tracks.length}
          isScanning={isScanning}
        />

        {/* Center Content Views */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-color)]">
          {currentView === 'tracks' || currentView === 'favorites' || currentView === 'playlist' ? (
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
      <Visualizer
        mode={settings.visualizerMode}
        isPlaying={isPlaying}
        accentColor="var(--accent-color)"
        height={settings.visualizerHeight}
      />

      {/* 4. Feishin Bottom Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        visualizerMode={settings.visualizerMode}
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
          const modes: ('bars' | 'wave' | 'circle' | 'off')[] = ['bars', 'wave', 'circle', 'off'];
          const next = modes[(modes.indexOf(settings.visualizerMode) + 1) % modes.length];
          handleUpdateSettings({ visualizerMode: next });
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
        coverArtUrl={resolvedCoverArt}
      />

      {/* 5. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onScanFolder={handleScanFolder}
        isScanning={isScanning}
      />
    </div>
  );
}

export default App;
