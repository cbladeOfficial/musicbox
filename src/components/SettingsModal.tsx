import React from 'react';
import {
  X,
  Radio,
  Palette,
  FolderOpen,
  Activity,
  Zap,
  Globe,
  Sliders,
} from 'lucide-react';
import { AppSettings, ArtSource, ThemeId, VisualizerMode } from '../types/music';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onScanFolder: () => void;
  isScanning: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onScanFolder,
  isScanning,
}) => {
  if (!isOpen) return null;

  const themes: { id: ThemeId; name: string; previewColor: string }[] = [
    { id: 'feishin', name: 'Feishin Dark (Default)', previewColor: '#2f81f7' },
    { id: 'amoled', name: 'AMOLED Pure Black (Ultra Low RAM)', previewColor: '#ffffff' },
    { id: 'nord', name: 'Nord Frost', previewColor: '#88c0d0' },
    { id: 'catppuccin', name: 'Catppuccin Mocha', previewColor: '#cba6f7' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', previewColor: '#00f0ff' },
  ];

  const artSources: { id: ArtSource; name: string; desc: string }[] = [
    { id: 'itunes', name: 'Apple Music / iTunes API', desc: 'Highest resolution (1000x1000), verified dates' },
    { id: 'jiosaavn', name: 'JioSaavn API', desc: 'Accurate regional & international metadata' },
    { id: 'lastfm', name: 'Last.fm API', desc: 'Community tags, artist bios, and summaries' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 border-b border-[var(--border-color)] px-5 flex items-center justify-between bg-[var(--sidebar-color)]">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[var(--accent-color)]" />
            <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              MusicBox Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[var(--text-main)]">
          {/* Library Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[var(--accent-color)] font-semibold uppercase tracking-wider text-[11px]">
              <FolderOpen className="w-4 h-4" />
              <span>Local Music Library</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Manage your local music folders. MusicBox indexes files locally with zero background bloat.
            </p>
            <button
              onClick={onScanFolder}
              disabled={isScanning}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[var(--accent-color)] hover:bg-[var(--feishin-accentHover)] text-white font-medium transition-colors disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{isScanning ? 'Scanning...' : 'Select & Scan Music Folder'}</span>
            </button>
          </div>

          <div className="border-t border-[var(--border-color)]" />

          {/* Discord Rich Presence */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[#5865F2] font-semibold uppercase tracking-wider text-[11px]">
              <Radio className="w-4 h-4" />
              <span>Discord Rich Presence</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Show what you're listening to on Discord with album art, timestamps, and artist info.
            </p>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.discordRpcEnabled}
                  onChange={(e) => onUpdateSettings({ discordRpcEnabled: e.target.checked })}
                  className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-0"
                />
                <span>Enable Discord Rich Presence</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.discordShowYear}
                  onChange={(e) => onUpdateSettings({ discordShowYear: e.target.checked })}
                  className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-0"
                />
                <span>Display Album Release Year in presence (e.g. "Album (2024)")</span>
              </label>
            </div>

            {/* Online Art Source Priority */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                Online Album Art & Metadata Source Priority:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {artSources.map((source, idx) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-2 rounded-md bg-[var(--surface-active)]/50 border border-[var(--border-color)] text-xs"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-main)] flex items-center space-x-1.5">
                        <span className="text-[10px] text-[var(--accent-color)] font-mono">#{idx + 1}</span>
                        <span>{source.name}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{source.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-color)]" />

          {/* Last.fm Scrobbling & Metadata */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 font-semibold uppercase tracking-wider text-[11px]">
              <Globe className="w-4 h-4" />
              <span>Last.fm Scrobbler & Artist Bios</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Scrobble local tracks to your Last.fm profile at 50% playback and fetch artist biographies.
            </p>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lastfmEnabled}
                onChange={(e) => onUpdateSettings({ lastfmEnabled: e.target.checked })}
                className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-0"
              />
              <span>Enable Last.fm Scrobbling</span>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Last.fm API Key (Optional)
                </label>
                <input
                  type="text"
                  value={settings.lastfmApiKey}
                  onChange={(e) => onUpdateSettings({ lastfmApiKey: e.target.value })}
                  placeholder="Defaults to built-in key"
                  className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                  Last.fm Username
                </label>
                <input
                  type="text"
                  value={settings.lastfmUsername}
                  onChange={(e) => onUpdateSettings({ lastfmUsername: e.target.value })}
                  placeholder="Your Last.fm username"
                  className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-color)]" />

          {/* Themes & Visualizer */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[var(--accent-color)] font-semibold uppercase tracking-wider text-[11px]">
              <Palette className="w-4 h-4" />
              <span>Themes & Visuals</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ theme: th.id })}
                  className={`flex items-center space-x-2.5 p-2 rounded-lg border text-left transition-colors ${
                    settings.theme === th.id
                      ? 'border-[var(--accent-color)] bg-[var(--surface-active)] font-medium'
                      : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: th.previewColor }}
                  />
                  <span className="truncate text-xs">{th.name}</span>
                </button>
              ))}
            </div>

            {/* Visualizer Mode */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1.5 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Audio Visualizer Style</span>
              </label>
              <div className="flex space-x-2">
                {(['bars', 'wave', 'circle', 'off'] as VisualizerMode[]).map((vMode) => (
                  <button
                    key={vMode}
                    onClick={() => onUpdateSettings({ visualizerMode: vMode })}
                    className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                      settings.visualizerMode === vMode
                        ? 'bg-[var(--accent-color)] text-white font-medium'
                        : 'bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {vMode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-color)]" />

          {/* Memory Optimization Mode */}
          <div className="space-y-2 p-3 rounded-lg bg-[var(--surface-active)]/40 border border-[var(--border-color)]">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-[11px]">
              <Zap className="w-3.5 h-3.5" />
              <span>Extreme Low-Memory Engine</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Tauri v2 + Rust byte-range streaming already consumes ~35MB–65MB RAM (vs 300MB+ in Electron). Turning this option on further disables blur filters and unloads inactive visualizer buffers.
            </p>
            <label className="flex items-center space-x-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={settings.lowMemoryMode}
                onChange={(e) => onUpdateSettings({ lowMemoryMode: e.target.checked })}
                className="rounded border-[var(--border-color)] text-emerald-500 focus:ring-0"
              />
              <span className="font-medium text-emerald-400">Enable Low Memory Profile</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[var(--border-color)] px-5 flex items-center justify-end bg-[var(--sidebar-color)]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[var(--accent-color)] hover:bg-[var(--feishin-accentHover)] text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
