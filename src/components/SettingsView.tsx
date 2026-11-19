import React, { useState } from 'react';
import {
  ArrowLeft,
  Radio,
  Palette,
  FolderOpen,
  Activity,
  Globe,
  Sliders,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Check,
  Type,
  Maximize2,
  HardDrive,
  Sparkles,
  ArrowUpDown,
  LayoutTemplate,
  Image as ImageIcon,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpCircle,
  ListOrdered,
} from 'lucide-react';
import { AppSettings, ArtSource, ThemeId, VisualizerMode, VisualizerState, TableDensity, TrackSortField, ViewMode, AlbumArtMode, AlbumTrackOrder, UpdateCheckResult, PendingUpdateInfo, DownloadProgress } from '../types/music';
import { TauriBridge } from '../services/tauriBridge';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onScanFolder: () => void;
  isScanning: boolean;
  onBack: () => void;
}

type SettingsTab = 'general' | 'appearance' | 'discord' | 'lastfm' | 'audio' | 'updates';

const DEFAULT_DISCORD_APP_ID = '1176718791388975124';

const PRESET_ACCENTS = [
  { name: 'Sapphire Blue', hex: '#2f81f7' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan Neon', hex: '#00f0ff' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onScanFolder,
  isScanning,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Update State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<DownloadProgress | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdateInfo | null>(null);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  // Load pending update status & listen for background download events
  React.useEffect(() => {
    TauriBridge.getPendingUpdateStatus().then((p) => {
      if (p) setPendingUpdate(p);
    }).catch(() => {});

    let unlistenProgress: (() => void) | undefined;
    let unlistenDownloaded: (() => void) | undefined;

    TauriBridge.onUpdateProgress((p) => {
      setUpdateProgress(p);
      setDownloadingUpdate(true);
    }).then((un) => {
      unlistenProgress = un;
    }).catch(() => {});

    TauriBridge.onUpdateDownloaded((ver) => {
      setDownloadingUpdate(false);
      setUpdateStatusMsg(`Update v${ver} is downloaded and ready to install.`);
      TauriBridge.getPendingUpdateStatus().then((p) => {
        if (p) setPendingUpdate(p);
      }).catch(() => {});
    }).then((un) => {
      unlistenDownloaded = un;
    }).catch(() => {});

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenDownloaded) unlistenDownloaded();
    };
  }, []);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatusMsg(null);
    try {
      const pending = await TauriBridge.getPendingUpdateStatus();
      setPendingUpdate(pending);
      if (pending && pending.ready_to_install) {
        setCheckingUpdate(false);
        return;
      }

      const res = await TauriBridge.checkForUpdates();
      setUpdateInfo(res);
      if (!res.update_available) {
        setUpdateStatusMsg('You are running the latest version of MusicBox.');
      }
    } catch {
      setUpdateStatusMsg('Unable to check for updates. Please verify your connection.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.download_url) return;
    setDownloadingUpdate(true);
    setUpdateStatusMsg(null);
    try {
      await TauriBridge.downloadUpdate(updateInfo.download_url, updateInfo.latest_version);
      const pending = await TauriBridge.getPendingUpdateStatus();
      setPendingUpdate(pending);
      setUpdateStatusMsg(`Version ${updateInfo.latest_version} downloaded! Ready to install.`);
    } catch {
      setUpdateStatusMsg('Failed to download update. Please try again.');
    } finally {
      setDownloadingUpdate(false);
    }
  };

  const handleInstallNow = async () => {
    try {
      await TauriBridge.installPendingUpdate();
    } catch {
      setUpdateStatusMsg('Failed to launch updater installer.');
    }
  };

  const themes: { id: ThemeId; name: string; previewColor: string; desc: string }[] = [
    { id: 'feishin', name: 'Dark (Default)', previewColor: '#2f81f7', desc: 'True obsidian background with high-contrast accents' },
    { id: 'amoled', name: 'AMOLED Pure Black', previewColor: '#ffffff', desc: 'Absolute #000000 for OLED screens with ultra-low memory' },
    { id: 'nord', name: 'Nord Frost', previewColor: '#88c0d0', desc: 'Arctic bluish dark palette inspired by Nord' },
    { id: 'catppuccin', name: 'Catppuccin Mocha', previewColor: '#cba6f7', desc: 'Cozy pastel palette with lavender highlights' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', previewColor: '#00f0ff', desc: 'Deep electric night with vibrant neon cyan' },
  ];

  const fontOptions = [
    { id: 'Inter', name: 'Inter', desc: 'Default, clean neutral & balanced', font: "'Inter', sans-serif" },
    { id: 'Geist Sans', name: 'Geist Sans', desc: 'Modern geometric precision', font: "'Geist Sans', sans-serif" },
    { id: 'Outfit', name: 'Outfit', desc: 'Friendly contemporary geometric', font: "'Outfit', sans-serif" },
    { id: 'Roboto', name: 'Roboto', desc: 'Classic neo-grotesque screen font', font: "'Roboto', sans-serif" },
    { id: 'JetBrains Mono', name: 'JetBrains Mono', desc: 'Technical clean monospace', font: "'JetBrains Mono', monospace" },
    { id: 'System UI', name: 'System UI', desc: 'Native OS interface font', font: 'system-ui, sans-serif' },
  ];

  const sourceLabels: Record<ArtSource, { name: string; desc: string }> = {
    itunes: { name: 'Apple Music / iTunes API', desc: '1000x1000 HD artwork and verified release dates' },
    wikipedia: { name: 'Wikipedia REST API', desc: 'Canonical official album cover art and releases' },
    jiosaavn: { name: 'JioSaavn API', desc: 'Accurate regional and international metadata' },
    lastfm: { name: 'Last.fm API', desc: 'Community tags, artist bios, and album summaries' },
  };

  const moveSource = (index: number, direction: 'up' | 'down') => {
    const list = [...settings.artSourcePriority];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    onUpdateSettings({ artSourcePriority: list });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-color)] select-none text-[var(--text-main)] animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="h-13 border-b border-[var(--border-color)] px-6 flex items-center justify-between bg-[var(--sidebar-color)] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-sm text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[var(--accent-color)]" />
            <h1 className="text-base font-medium text-white">Settings & Preferences</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>Auto-saved</span>
        </div>
      </div>

      {/* 2. Main Body: Left Sub-navigation + Right Content Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sub-nav */}
        <aside className="w-56 bg-[var(--sidebar-color)] border-r border-[var(--border-color)] p-3 space-y-1.5 flex-shrink-0 text-sm">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md font-medium transition-all text-left ${
              activeTab === 'appearance'
                ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Palette className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Appearance & UI</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md font-medium transition-all text-left ${
              activeTab === 'general'
                ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Library & Storage</span>
          </button>

          <button
            onClick={() => setActiveTab('discord')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md font-medium transition-all text-left ${
              activeTab === 'discord'
                ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Discord & Artwork</span>
          </button>

          <button
            onClick={() => setActiveTab('lastfm')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md font-medium transition-all text-left ${
              activeTab === 'lastfm'
                ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Last.fm Scrobbler</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md font-medium transition-all text-left ${
              activeTab === 'audio'
                ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4 text-[var(--accent-color)]" />
            <span>Playback & Audio</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md font-medium transition-all text-left ${
              activeTab === 'updates'
                ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <DownloadCloud className="w-4 h-4 text-[var(--accent-color)]" />
            <div className="flex items-center justify-between flex-1">
              <span>Updates</span>
              {pendingUpdate?.ready_to_install && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Update ready to install" />
              )}
            </div>
          </button>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-8">
          {/* ================= Appearance & UI Tab ================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              {/* Theme Selection */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Application Theme</h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Select a desktop color theme. All themes maintain high element visibility and clean contrast.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {themes.map((th) => {
                    const isSelected = settings.theme === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => onUpdateSettings({ theme: th.id })}
                        className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent-color)] bg-[var(--surface-active)] shadow-md'
                            : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">{th.name}</span>
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/20"
                            style={{ backgroundColor: th.previewColor }}
                          />
                        </div>
                        <p className="text-xs text-zinc-400 leading-normal">{th.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Typography / Font Family Selection */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Type className="w-4 h-4 text-[var(--accent-color)]" />
                    <h2 className="text-base font-medium text-white">Interface Font Family</h2>
                  </div>
                  <span className="text-xs text-[var(--accent-color)] font-mono bg-[var(--accent-color)]/10 px-2 py-0.5 rounded border border-[var(--accent-color)]/20">
                    Active: {settings.fontFamily || 'Inter'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Choose from bundled offline high-precision typography, system fonts, or enter any font installed on your computer.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {fontOptions.map((f) => {
                    const isSelected = (settings.fontFamily || 'Inter') === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onUpdateSettings({ fontFamily: f.id })}
                        className={`flex flex-col p-3.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent-color)] bg-[var(--surface-active)] shadow-md ring-1 ring-[var(--accent-color)]/30'
                            : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white" style={{ fontFamily: f.font }}>
                            {f.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-color)]" />}
                        </div>
                        <span className="text-xs text-zinc-400 mt-1 truncate">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Font Family Name Input */}
                <div className="pt-2">
                  <label className="text-xs text-zinc-400 block mb-1.5">
                    Or specify a custom local font installed on your system:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. SF Pro Display, Helvetica Neue, Aptos, Circular Std, Ubuntu..."
                      value={
                        fontOptions.some((o) => o.id === (settings.fontFamily || 'Inter'))
                          ? ''
                          : settings.fontFamily
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateSettings({ fontFamily: val || 'Inter' });
                      }}
                      className="flex-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)] text-white"
                    />
                    {settings.fontFamily && !fontOptions.some((o) => o.id === settings.fontFamily) && (
                      <button
                        onClick={() => onUpdateSettings({ fontFamily: 'Inter' })}
                        className="text-xs text-[var(--accent-color)] hover:underline whitespace-nowrap px-2"
                      >
                        Reset to Inter
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Accent Color Customization */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Accent Color</h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Select a curated accent preset or pick any custom hex swatch for active indicators, sliders, and badges.
                </p>

                <div className="flex items-center space-x-3 pt-1 flex-wrap gap-y-2">
                  {PRESET_ACCENTS.map((item) => (
                    <button
                      key={item.hex}
                      onClick={() => {
                        onUpdateSettings({ customAccentColor: item.hex });
                        document.documentElement.style.setProperty('--accent-color', item.hex);
                      }}
                      title={item.name}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[var(--surface-color)] border border-[var(--border-color)] hover:border-white/20 transition-all text-xs"
                    >
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.hex }} />
                      <span className="text-zinc-200">{item.name}</span>
                    </button>
                  ))}

                  <div className="flex items-center space-x-2 pl-2">
                    <input
                      type="color"
                      value={settings.customAccentColor || '#2f81f7'}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateSettings({ customAccentColor: val });
                        document.documentElement.style.setProperty('--accent-color', val);
                      }}
                      className="w-8 h-8 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <input
                      type="text"
                      value={settings.customAccentColor || '#2f81f7'}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateSettings({ customAccentColor: val });
                        document.documentElement.style.setProperty('--accent-color', val);
                      }}
                      className="w-24 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-2.5 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Table Density */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <h2 className="text-base font-medium text-white">Table Spacing & Density</h2>
                <p className="text-xs text-zinc-400">
                  Control vertical row spacing in library track views.
                </p>
                <div className="flex space-x-3">
                  {(['comfortable', 'compact'] as TableDensity[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => onUpdateSettings({ tableDensity: d })}
                      className={`px-4 py-2 rounded-md text-sm capitalize transition-colors ${
                        settings.tableDensity === d
                          ? 'bg-[var(--accent-color)] text-white font-medium shadow-sm'
                          : 'bg-[var(--surface-color)] text-zinc-400 hover:text-white border border-[var(--border-color)]'
                      }`}
                    >
                      {d} Spacing
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Track Sort Order */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Default Track Sort Order</h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Choose how tracks are automatically arranged in your library views.
                </p>
                <div className="relative w-72">
                  <select
                    value={`${settings.trackSortField || 'title'}_${(settings.trackSortAsc ?? true) ? 'asc' : 'desc'}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.split('_');
                      const asc = parts[parts.length - 1] === 'asc';
                      const field = parts.slice(0, parts.length - 1).join('_') as TrackSortField;
                      onUpdateSettings({ trackSortField: field, trackSortAsc: asc });
                    }}
                    className="w-full bg-[var(--surface-color)] text-zinc-200 text-sm font-medium rounded-md pl-3 pr-8 py-2 border border-[var(--border-color)] hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="title_asc">Title (A-Z - Alphabetical)</option>
                    <option value="title_desc">Title (Z-A)</option>
                    <option value="artist_asc">Artist (A-Z)</option>
                    <option value="artist_desc">Artist (Z-A)</option>
                    <option value="album_asc">Album (A-Z)</option>
                    <option value="album_desc">Album (Z-A)</option>
                    <option value="duration_asc">Duration (Shortest first)</option>
                    <option value="duration_desc">Duration (Longest first)</option>
                    <option value="date_added_desc">Date Added (Newest first)</option>
                    <option value="date_added_asc">Date Added (Oldest first)</option>
                    <option value="track_number_asc">Track # (Ascending)</option>
                    <option value="track_number_desc">Track # (Descending)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Window Startup Behavior */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <Maximize2 className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Window Startup Behavior</h2>
                </div>
                <label className="flex items-center space-x-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={settings.startMaximized !== false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onUpdateSettings({ startMaximized: checked });
                      if (!checked) {
                        TauriBridge.center().catch(() => {});
                      }
                    }}
                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] accent-[var(--accent-color)]"
                  />
                  <span className="text-sm text-zinc-200">Start application maximized</span>
                </label>
                <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                  When enabled, MusicBox launches maximized to fill your desktop display. When unchecked, it opens centered on your screen.
                </p>
              </div>
            </div>
          )}

          {/* ================= Library & Storage Tab ================= */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Music Library Folders</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  MusicBox indexes local audio files directly with native Rust and stores metadata in an embedded SQLite database.
                </p>

                <div className="pt-2">
                  <button
                    onClick={onScanFolder}
                    disabled={isScanning}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white font-medium transition-all text-sm disabled:opacity-50 shadow-md"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{isScanning ? 'Scanning in progress...' : 'Scan Music Folder'}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <LayoutTemplate className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Default Starting Sidebar Page</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Choose which sidebar view opens automatically when MusicBox starts up.
                </p>
                <div className="max-w-xs pt-1">
                  <select
                    value={settings.defaultStartingPage || 'home'}
                    onChange={(e) => onUpdateSettings({ defaultStartingPage: e.target.value as ViewMode })}
                    className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-color)] cursor-pointer"
                  >
                    <option value="home">Home (Default)</option>
                    <option value="tracks">Tracks</option>
                    <option value="albums">Albums</option>
                    <option value="artists">Artists</option>
                    <option value="album_artists">Album Artists</option>
                    <option value="genres">Genres</option>
                    <option value="folders">Folders</option>
                    <option value="radio">Radio Stations</option>
                    <option value="favorites">Favorites</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Low Memory Profile</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Disables UI backdrop blurs and halts inactive canvas buffers to keep RAM under 45 MB.
                </p>
                <label className="flex items-center space-x-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={settings.lowMemoryMode}
                    onChange={(e) => onUpdateSettings({ lowMemoryMode: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] accent-[var(--accent-color)]"
                  />
                  <span className="text-sm text-zinc-200">Enable ultra-low memory mode</span>
                </label>
              </div>
            </div>
          )}

          {/* ================= Discord RPC Tab ================= */}
          {activeTab === 'discord' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Discord Rich Presence</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Broadcasts currently playing song info, artist, album, live duration, and artwork directly to Discord.
                </p>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.discordRpcEnabled}
                      onChange={(e) => onUpdateSettings({ discordRpcEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] accent-[var(--accent-color)]"
                    />
                    <span className="text-sm text-zinc-200">Enable Discord Rich Presence</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.discordShowYear}
                      onChange={(e) => onUpdateSettings({ discordShowYear: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] accent-[var(--accent-color)]"
                    />
                    <span className="text-sm text-zinc-200">Show Album Year in Presence (e.g. "Random Access Memories (2013)")</span>
                  </label>
                </div>
              </div>

              {/* Editable Client ID */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    Discord Application Client ID
                  </label>
                  <button
                    onClick={() => onUpdateSettings({ discordClientId: DEFAULT_DISCORD_APP_ID })}
                    className="text-xs text-[var(--accent-color)] hover:underline flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Default</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={settings.discordClientId || DEFAULT_DISCORD_APP_ID}
                  onChange={(e) => onUpdateSettings({ discordClientId: e.target.value.trim() })}
                  placeholder="Discord Application ID"
                  className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-3 py-2 font-mono text-xs outline-none focus:border-[var(--accent-color)] text-white"
                />
                <p className="text-xs text-zinc-400">
                  Default: {DEFAULT_DISCORD_APP_ID}. Broadcasts "Listening to MusicBox" with live progress bar, artist, and track details. You can enter your own Discord Application ID from the Discord Developer Portal to customize branding.
                </p>
              </div>

              {/* Album Art Source & Fallback Policy */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-[var(--accent-color)]" />
                  <h3 className="text-sm font-semibold text-white">
                    Album Art Source & Fallback Policy
                  </h3>
                </div>
                <p className="text-xs text-zinc-400">
                  Controls how album art is resolved for your tracks. Embedded artwork extracted from your local audio files is always prioritized.
                </p>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  {[
                    {
                      id: 'local_and_online' as AlbumArtMode,
                      title: 'Local First with Online Fallback (Recommended)',
                      badge: 'Recommended',
                      desc: 'Shows local album art only when embedded in the track. If the track has no embedded artwork, automatically falls back to online search (iTunes, Wikipedia, JioSaavn, Last.fm).',
                    },
                    {
                      id: 'local_only' as AlbumArtMode,
                      title: 'Local Embedded Only (No Online Search)',
                      badge: 'Offline Only',
                      desc: 'Shows local album art only when embedded in the track. If missing, disables album art entirely for that track without searching online.',
                    },
                    {
                      id: 'disabled' as AlbumArtMode,
                      title: 'Disable Album Art Entirely',
                      badge: 'Off',
                      desc: 'Disables all album art display across the app (Track list, Player bar, Full visualizer, Track details, and Discord RPC).',
                    },
                  ].map((option) => {
                    const isSelected = (settings.albumArtMode || 'local_and_online') === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onUpdateSettings({ albumArtMode: option.id })}
                        className={`flex items-start justify-between p-3.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent-color)] bg-[var(--surface-active)] shadow-md ring-1 ring-[var(--accent-color)]/30'
                            : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white">{option.title}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                isSelected
                                  ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] border-[var(--accent-color)]/30'
                                  : 'bg-white/5 text-zinc-400 border-white/10'
                              }`}
                            >
                              {option.badge}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{option.desc}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white'
                              : 'border-zinc-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Artwork & Metadata Priority */}
              <div className="border-t border-[var(--border-color)] pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">
                    Online Artwork & Metadata Priority
                  </h3>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      settings.albumArtMode === 'disabled'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : settings.albumArtMode === 'local_only'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {settings.albumArtMode === 'disabled'
                      ? 'Disabled'
                      : settings.albumArtMode === 'local_only'
                      ? 'Fallback Inactive (Local Only)'
                      : 'Active Fallback'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  {settings.albumArtMode === 'local_and_online'
                    ? 'Queried in order only when a track has no embedded local album art.'
                    : settings.albumArtMode === 'local_only'
                    ? 'Online cover art queries are disabled because "Local Embedded Only" is selected above.'
                    : 'Online cover art queries are disabled because album art is disabled entirely.'}
                </p>

                <div className="space-y-2 pt-1">
                  {settings.artSourcePriority.map((sourceKey, idx) => (
                    <div
                      key={sourceKey}
                      className="flex items-center justify-between p-3 rounded-md bg-[var(--surface-color)] border border-[var(--border-color)] text-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs text-[var(--accent-color)] font-medium">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-white">
                            {sourceLabels[sourceKey]?.name || sourceKey}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            {sourceLabels[sourceKey]?.desc}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => moveSource(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-20"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveSource(idx, 'down')}
                          disabled={idx === settings.artSourcePriority.length - 1}
                          className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-20"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= Last.fm Tab ================= */}
          {activeTab === 'lastfm' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Last.fm Scrobbler & Artist Bios</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automatically updates "Now Playing" and scrobbles tracks when played for 50% of duration or 240 seconds.
                </p>

                <div className="pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.lastfmEnabled}
                      onChange={(e) => onUpdateSettings({ lastfmEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] accent-[var(--accent-color)]"
                    />
                    <span className="text-sm text-zinc-200">Enable Last.fm Integration</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-[var(--border-color)] pt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Last.fm Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.lastfmUsername}
                    onChange={(e) => onUpdateSettings({ lastfmUsername: e.target.value.trim() })}
                    placeholder="Your Last.fm username"
                    className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-[var(--accent-color)] text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Last.fm API Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.lastfmApiKey}
                    onChange={(e) => onUpdateSettings({ lastfmApiKey: e.target.value.trim() })}
                    placeholder="Built-in public key is used if blank"
                    className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-[var(--accent-color)] text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Last.fm Shared Secret / Session Key (Optional for Authenticated Scrobbling)
                  </label>
                  <input
                    type="password"
                    value={settings.lastfmSecret}
                    onChange={(e) => onUpdateSettings({ lastfmSecret: e.target.value.trim() })}
                    placeholder="Last.fm API Secret or Session Key"
                    className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-[var(--accent-color)] text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= Playback & Audio Tab ================= */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Album Playback Order */}
              <div className="space-y-3 pb-6 border-b border-[var(--border-color)]">
                <div className="flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Album Playback Order</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Choose how tracks are sorted and queued when playing albums or using Repeat All within an album.
                </p>

                <div className="pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: 'track_number',
                        label: 'Track Number Priority (Default)',
                        desc: 'Albums with embedded track numbers play in numerical sequence (1, 2, 3...). Unnumbered tracks follow alphabetically by title.',
                      },
                      {
                        id: 'alphabetical',
                        label: 'Alphabetical (A–Z)',
                        desc: 'Strictly sort all album tracks alphabetically by song title (A–Z), regardless of embedded ID3 track numbers (and not by filename).',
                      },
                    ].map((item) => {
                      const isSelected = (settings.albumTrackOrder || 'track_number') === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onUpdateSettings({ albumTrackOrder: item.id as AlbumTrackOrder });
                            try {
                              localStorage.setItem('musicbox_album_track_order', item.id);
                            } catch {}
                            TauriBridge.saveSetting('album_track_order', item.id).catch(() => {});
                          }}
                          className={`p-3.5 rounded-lg text-left transition-colors border ${
                            isSelected
                              ? 'bg-[var(--accent-color)]/15 border-[var(--accent-color)] text-white shadow-sm'
                              : 'bg-[var(--surface-color)] border-[var(--border-color)] text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-color)]" />}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Audio Visualizer Engine */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[var(--accent-color)]" />
                  <h2 className="text-base font-medium text-white">Audio Visualizer Engine</h2>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Connected directly to Web Audio AnalyserNode. Automatically halts animation when paused to save 100% CPU.
                </p>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs text-zinc-300 block mb-2 font-medium">
                      Visualizer Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'bars', label: 'Spectrum Bars' },
                        { id: 'mirror-bars', label: 'Mirrored Bars' },
                        { id: 'wave', label: 'Oscilloscope Wave' },
                        { id: 'circle', label: 'Circular Reactor' },
                        { id: 'rainbow-ribbon', label: 'Rainbow Ribbons' },
                        { id: 'particles', label: 'Particle Starfield' },
                        { id: 'off', label: 'Disabled (Off)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => onUpdateSettings({ visualizerMode: item.id as VisualizerMode })}
                          className={`px-3 py-2 rounded-md text-xs transition-colors ${
                            settings.visualizerMode === item.id
                              ? 'bg-[var(--accent-color)] text-white font-medium shadow-sm'
                              : 'bg-[var(--surface-color)] text-zinc-400 hover:text-white border border-[var(--border-color)]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs text-zinc-300 block mb-2 font-medium">
                      Visualizer View Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'bottom', label: 'Bottom Strip', desc: 'Display visualizer docked above bottom player bar' },
                        { id: 'regular_fullscreen', label: 'Regular Fullscreen', desc: 'Default to regular fullscreen visualizer view' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onUpdateSettings({ visualizerState: item.id as VisualizerState });
                            try {
                              localStorage.setItem('musicbox_visualizer_state', item.id);
                            } catch {}
                            TauriBridge.saveSetting('visualizer_state', item.id).catch(() => {});
                          }}
                          className={`p-3 rounded-lg text-left transition-colors border ${
                            (settings.visualizerState || 'bottom') === item.id
                              ? 'bg-[var(--accent-color)]/15 border-[var(--accent-color)] text-white'
                              : 'bg-[var(--surface-color)] border-[var(--border-color)] text-zinc-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-semibold text-white">{item.label}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                      Note: Totally fullscreen mode (F / Double-click) is temporary and never persisted across app restarts.
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-zinc-300 font-medium">
                        Visualizer Height
                      </label>
                      <span className="text-xs font-mono text-zinc-400">
                        {settings.visualizerHeight}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={32}
                      max={96}
                      step={4}
                      value={settings.visualizerHeight}
                      onChange={(e) => onUpdateSettings({ visualizerHeight: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-zinc-800 accent-[var(--accent-color)] rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= Application Updates Tab ================= */}
          {activeTab === 'updates' && (
            <div className="space-y-6">
              {/* Status Header Card */}
              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/25 flex items-center justify-center">
                      <DownloadCloud className="w-5 h-5 text-[var(--accent-color)]" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">MusicBox Desktop Updates</h2>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-xs text-zinc-400">Current version:</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-200 font-semibold">
                          v0.1.0
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckUpdates}
                    disabled={checkingUpdate || downloadingUpdate}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[var(--accent-color)] hover:brightness-110 text-white text-xs font-medium transition-all shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    <span>{checkingUpdate ? 'Checking GitHub...' : 'Check for Updates'}</span>
                  </button>
                </div>

                {/* State 1: Update Ready to Install */}
                {pendingUpdate?.ready_to_install && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center space-x-2.5 text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">
                          MusicBox v{pendingUpdate.version} is ready to install!
                        </div>
                        <div className="text-xs text-emerald-400/80 mt-0.5">
                          The update has been downloaded in the background. It will install automatically next time you close or launch MusicBox, or you can restart now.
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center space-x-3">
                      <button
                        onClick={handleInstallNow}
                        className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors shadow-md"
                      >
                        Restart & Install Update Now
                      </button>
                      <span className="text-[11px] text-zinc-400">
                        (~{(pendingUpdate.file_size / (1024 * 1024)).toFixed(1)} MB installer verified)
                      </span>
                    </div>
                  </div>
                )}

                {/* State 2: Downloading in Progress */}
                {downloadingUpdate && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-blue-300 font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Downloading background update...</span>
                      </div>
                      <span className="font-mono text-blue-200 font-bold">
                        {updateProgress?.percent ?? 0}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-color)] transition-all duration-200"
                        style={{ width: `${updateProgress?.percent ?? 0}%` }}
                      />
                    </div>

                    {updateProgress && updateProgress.total_bytes > 0 && (
                      <div className="text-[11px] text-zinc-400 font-mono text-right">
                        {(updateProgress.downloaded_bytes / (1024 * 1024)).toFixed(1)} MB / {(updateProgress.total_bytes / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    )}
                  </div>
                )}

                {/* State 3: Update Available (Not yet downloaded) */}
                {!pendingUpdate?.ready_to_install && !downloadingUpdate && updateInfo?.update_available && (
                  <div className="p-4 rounded-lg bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/30 space-y-3">
                    <div className="flex items-center space-x-2 text-white">
                      <ArrowUpCircle className="w-5 h-5 text-[var(--accent-color)]" />
                      <span className="font-semibold text-sm">
                        New version available: {updateInfo.latest_version}
                      </span>
                    </div>

                    {updateInfo.release_notes && (
                      <div className="p-3 rounded bg-black/40 border border-white/5 text-xs text-zinc-300 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                        {updateInfo.release_notes}
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        onClick={handleDownloadUpdate}
                        className="px-4 py-2 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white font-medium text-xs transition-all shadow-md"
                      >
                        Download Update in Background
                      </button>
                    </div>
                  </div>
                )}

                {/* State 4: Feedback Status Message */}
                {updateStatusMsg && !pendingUpdate?.ready_to_install && !downloadingUpdate && !updateInfo?.update_available && (
                  <div className="p-3 rounded-lg bg-white/5 text-xs text-zinc-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{updateStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Automatic Update Settings */}
              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-5">
                <div className="flex items-center space-x-2 text-white font-medium text-sm pb-2 border-b border-white/5">
                  <Sliders className="w-4 h-4 text-[var(--accent-color)]" />
                  <span>Update Preferences</span>
                </div>

                {/* Toggle: Enable Auto Updates */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white block cursor-pointer">
                      Automatically Check & Download Updates
                    </label>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                      When enabled, MusicBox quietly queries GitHub Releases on startup. If a newer build is released, it downloads automatically in the background without interrupting music playback.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={settings.autoUpdateEnabled !== false}
                      onChange={(e) => onUpdateSettings({ autoUpdateEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]" />
                  </label>
                </div>

                {/* Toggle: Install Automatically on Next App Start */}
                <div className="border-t border-white/5 pt-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white block cursor-pointer">
                      Install Automatically on Next App Start
                    </label>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                      When an update finishes downloading, automatically apply it silently in the background when closing MusicBox so the new version is ready the next time you start the app.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={settings.autoInstallOnNextStart !== false}
                      onChange={(e) => onUpdateSettings({ autoInstallOnNextStart: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]" />
                  </label>
                </div>

                {/* Release Channel Info */}
                <div className="border-t border-white/5 pt-4 flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>Channel: Official Releases (cbladeOfficial/musicbox)</span>
                  <span>Target: Windows x64 (NSIS)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
