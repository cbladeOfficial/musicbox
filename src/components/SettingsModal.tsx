import React, { useState } from 'react';
import {
  X,
  Radio,
  Palette,
  FolderOpen,
  Activity,
  Zap,
  Globe,
  Sliders,
  RotateCcw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { AppSettings, ArtSource, ThemeId, VisualizerMode, TableDensity } from '../types/music';
import { TauriBridge } from '../services/tauriBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onScanFolder: () => void;
  isScanning: boolean;
}

type SettingsTab = 'general' | 'discord' | 'lastfm' | 'appearance' | 'audio';

const DEFAULT_DISCORD_APP_ID = '1306646875971485777';

const PRESET_ACCENTS = [
  { name: 'Feishin Blue', hex: '#2f81f7' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan Neon', hex: '#00f0ff' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onScanFolder,
  isScanning,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!isOpen) return null;

  const themes: { id: ThemeId; name: string; previewColor: string }[] = [
    { id: 'feishin', name: 'Feishin Dark (Default)', previewColor: '#2f81f7' },
    { id: 'amoled', name: 'AMOLED Pure Black (Low RAM)', previewColor: '#ffffff' },
    { id: 'nord', name: 'Nord Frost', previewColor: '#88c0d0' },
    { id: 'catppuccin', name: 'Catppuccin Mocha', previewColor: '#cba6f7' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', previewColor: '#00f0ff' },
  ];

  const sourceLabels: Record<ArtSource, { name: string; desc: string }> = {
    itunes: { name: 'Apple Music / iTunes API', desc: '1000x1000 HD artwork and verified release dates' },
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden flex flex-col h-[560px]">
        {/* Header */}
        <div className="h-11 border-b border-[var(--border-color)] px-4 flex items-center justify-between bg-[var(--sidebar-color)] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[var(--accent-color)]" />
            <h2 className="text-xs font-medium text-[var(--text-main)]">
              Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Layout: Left Tabs + Right Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tab Navigation */}
          <div className="w-48 bg-[var(--sidebar-color)] border-r border-[var(--border-color)] p-2.5 space-y-1 flex-shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md font-medium text-[13px] transition-all text-left ${
                activeTab === 'general'
                  ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Library</span>
            </button>

            <button
              onClick={() => setActiveTab('discord')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md font-medium text-[13px] transition-all text-left ${
                activeTab === 'discord'
                  ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Discord RPC</span>
            </button>

            <button
              onClick={() => setActiveTab('lastfm')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md font-medium text-[13px] transition-all text-left ${
                activeTab === 'lastfm'
                  ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Last.fm</span>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md font-medium text-[13px] transition-all text-left ${
                activeTab === 'appearance'
                  ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Themes & UI</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md font-medium text-[13px] transition-all text-left ${
                activeTab === 'audio'
                  ? 'bg-[var(--accent-color)]/15 text-white border-l-2 border-[var(--accent-color)] pl-2.5'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Audio & Visuals</span>
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-200 space-y-6 bg-[var(--surface-color)]">
            {/* 1. General & Library Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">
                    Music Library Folder
                  </h3>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                    MusicBox indexes local audio files directly with native Rust and stores tags in an embedded SQLite database. Files are streamed on-demand.
                  </p>
                  <button
                    onClick={onScanFolder}
                    disabled={isScanning}
                    className="flex items-center space-x-2 px-4 py-2 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white font-medium transition-all text-xs disabled:opacity-50 shadow-md"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>{isScanning ? 'Scanning in progress...' : 'Scan Music Folder'}</span>
                  </button>
                </div>

                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <h3 className="text-xs font-medium text-[var(--text-main)]">
                    Low Memory Profile
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Disables UI backdrop blurs and drops inactive canvas buffers to keep RAM under 45 MB.
                  </p>
                  <label className="flex items-center space-x-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={settings.lowMemoryMode}
                      onChange={(e) => onUpdateSettings({ lowMemoryMode: e.target.checked })}
                      className="rounded border-[var(--border-color)] text-[var(--accent-color)]"
                    />
                    <span className="font-medium text-emerald-400">Enable Low Memory Mode</span>
                  </label>
                </div>
              </div>
            )}

            {/* 2. Discord RPC Tab */}
            {activeTab === 'discord' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-[var(--text-main)] mb-1">
                    Discord Rich Presence
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                    Broadcasts your currently playing track, artist, album (with release year), and live elapsed duration to Discord.
                  </p>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.discordRpcEnabled}
                        onChange={(e) => onUpdateSettings({ discordRpcEnabled: e.target.checked })}
                        className="rounded border-[var(--border-color)] text-[var(--accent-color)]"
                      />
                      <span>Enable Discord Rich Presence</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.discordShowYear}
                        onChange={(e) => onUpdateSettings({ discordShowYear: e.target.checked })}
                        className="rounded border-[var(--border-color)] text-[var(--accent-color)]"
                      />
                      <span>Show Album Year in Presence (e.g. "Random Access Memories (2013)")</span>
                    </label>
                  </div>
                </div>

                {/* Editable Discord Client ID */}
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-[var(--text-main)]">
                      Discord Application Client ID
                    </label>
                    <button
                      onClick={() => onUpdateSettings({ discordClientId: DEFAULT_DISCORD_APP_ID })}
                      className="text-[10px] text-[var(--accent-color)] hover:underline flex items-center space-x-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset to Default</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={settings.discordClientId || DEFAULT_DISCORD_APP_ID}
                    onChange={(e) => onUpdateSettings({ discordClientId: e.target.value.trim() })}
                    placeholder="Discord Application ID"
                    className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 font-mono text-xs outline-none focus:border-[var(--accent-color)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Default: {DEFAULT_DISCORD_APP_ID} (MusicBox registered Discord application).
                  </p>
                </div>

                {/* Cover Art Source Priority Reordering */}
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <h4 className="text-[11px] font-medium text-[var(--text-main)]">
                    Online Artwork & Metadata Priority
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Sources are queried in order to retrieve missing artwork and metadata. Use arrows to reorder.
                  </p>

                  <div className="space-y-1.5">
                    {settings.artSourcePriority.map((sourceKey, idx) => (
                      <div
                        key={sourceKey}
                        className="flex items-center justify-between p-2 rounded bg-[var(--surface-active)]/50 border border-[var(--border-color)] text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-[var(--accent-color)] font-medium">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-medium text-[var(--text-main)]">
                              {sourceLabels[sourceKey]?.name || sourceKey}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {sourceLabels[sourceKey]?.desc}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => moveSource(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSource(idx, 'down')}
                            disabled={idx === settings.artSourcePriority.length - 1}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Last.fm Tab */}
            {activeTab === 'lastfm' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-[var(--text-main)] mb-1">
                    Last.fm Scrobbler & Artist Bios
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                    Automatically updates "Now Playing" and scrobbles tracks when played for 50% of duration or 240 seconds.
                  </p>

                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={settings.lastfmEnabled}
                      onChange={(e) => onUpdateSettings({ lastfmEnabled: e.target.checked })}
                      className="rounded border-[var(--border-color)] text-[var(--accent-color)]"
                    />
                    <span>Enable Last.fm Scrobbling</span>
                  </label>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                        Last.fm Username
                      </label>
                      <input
                        type="text"
                        value={settings.lastfmUsername}
                        onChange={(e) => onUpdateSettings({ lastfmUsername: e.target.value.trim() })}
                        placeholder="Your Last.fm profile username"
                        className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                        Last.fm API Key (Optional)
                      </label>
                      <input
                        type="text"
                        value={settings.lastfmApiKey}
                        onChange={(e) => onUpdateSettings({ lastfmApiKey: e.target.value.trim() })}
                        placeholder="Default built-in key is used if blank"
                        className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs font-mono outline-none focus:border-[var(--accent-color)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
                        Last.fm Shared Secret / Session Key (Optional for Authenticated Scrobbling)
                      </label>
                      <input
                        type="password"
                        value={settings.lastfmSecret}
                        onChange={(e) => onUpdateSettings({ lastfmSecret: e.target.value.trim() })}
                        placeholder="Last.fm API Secret or Session Key"
                        className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs font-mono outline-none focus:border-[var(--accent-color)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Appearance & UI Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-[var(--text-main)] mb-1">
                    Preset Themes
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {themes.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => onUpdateSettings({ theme: th.id })}
                        className={`flex items-center space-x-2.5 p-2 rounded border text-left transition-colors ${
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
                </div>

                {/* Typography & Font Family Customization */}
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-[var(--text-main)]">
                      Interface Font Family
                    </h3>
                    <span className="text-[10px] text-[var(--accent-color)] font-mono">
                      {settings.fontFamily || 'Inter'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Select an offline bundled high-precision font or enter a custom font installed on your computer.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { id: 'Inter', name: 'Inter', desc: 'Feishin default, neutral & balanced', font: "'Inter', sans-serif" },
                      { id: 'Geist Sans', name: 'Geist Sans', desc: 'Minimalist geometric precision', font: "'Geist Sans', sans-serif" },
                      { id: 'JetBrains Mono', name: 'JetBrains Mono', desc: 'Technical clean monospace', font: "'JetBrains Mono', monospace" },
                      { id: 'System Sans', name: 'System UI', desc: 'Native OS interface font', font: 'system-ui, sans-serif' },
                    ].map((f) => {
                      const isSelected = (settings.fontFamily || 'Inter') === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => onUpdateSettings({ fontFamily: f.id })}
                          className={`flex flex-col p-2.5 rounded border text-left transition-colors ${
                            isSelected
                              ? 'border-[var(--accent-color)] bg-[var(--surface-active)] font-medium'
                              : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <span className="text-xs font-medium text-[var(--text-main)]" style={{ fontFamily: f.font }}>
                            {f.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {f.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Font Family Input */}
                  <div className="pt-1.5 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Or type custom font family name (e.g. SF Pro Text, Aptos, Helvetica Neue)..."
                      value={
                        ['Inter', 'Geist Sans', 'JetBrains Mono', 'System Sans'].includes(settings.fontFamily || 'Inter')
                          ? ''
                          : settings.fontFamily
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateSettings({ fontFamily: val || 'Inter' });
                      }}
                      className="flex-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)] text-[var(--text-main)]"
                    />
                    {settings.fontFamily && !['Inter', 'Geist Sans', 'JetBrains Mono', 'System Sans'].includes(settings.fontFamily) && (
                      <button
                        onClick={() => onUpdateSettings({ fontFamily: 'Inter' })}
                        className="text-[10px] text-[var(--accent-color)] hover:underline whitespace-nowrap"
                      >
                        Reset to Inter
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Accent Color Picker */}
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <h3 className="text-xs font-medium text-[var(--text-main)]">
                    Custom Accent Color
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Override the theme accent color with any custom swatch or hex code.
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    {PRESET_ACCENTS.map((item) => (
                      <button
                        key={item.hex}
                        onClick={() => {
                          onUpdateSettings({ customAccentColor: item.hex });
                          document.documentElement.style.setProperty('--accent-color', item.hex);
                        }}
                        title={item.name}
                        className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform flex items-center justify-center"
                        style={{ backgroundColor: item.hex }}
                      />
                    ))}
                    <div className="flex items-center space-x-1 pl-2">
                      <input
                        type="color"
                        value={settings.customAccentColor || '#2f81f7'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateSettings({ customAccentColor: val });
                          document.documentElement.style.setProperty('--accent-color', val);
                        }}
                        className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded"
                      />
                      <input
                        type="text"
                        value={settings.customAccentColor || '#2f81f7'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateSettings({ customAccentColor: val });
                          document.documentElement.style.setProperty('--accent-color', val);
                        }}
                        className="w-20 bg-[var(--surface-color)] border border-[var(--border-color)] rounded px-1.5 py-0.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Density */}
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <h3 className="text-xs font-medium text-[var(--text-main)]">
                    Table Row Spacing
                  </h3>
                  <div className="flex space-x-2">
                    {(['comfortable', 'compact'] as TableDensity[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => onUpdateSettings({ tableDensity: d })}
                        className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                          settings.tableDensity === d
                            ? 'bg-[var(--accent-color)] text-white font-medium'
                            : 'bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Window Startup Behavior */}
                <div className="border-t border-[var(--border-color)] pt-3 space-y-2">
                  <h3 className="text-xs font-medium text-[var(--text-main)]">
                    Window Startup Behavior
                  </h3>
                  <label className="flex items-center space-x-2.5 cursor-pointer pt-0.5">
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
                      className="rounded border-[var(--border-color)] text-[var(--accent-color)]"
                    />
                    <span className="text-xs text-[var(--text-main)]">Start application maximized</span>
                  </label>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    When enabled, MusicBox launches maximized to fill your display. When unchecked, it opens centered on your screen.
                  </p>
                </div>
              </div>
            )}

            {/* 5. Audio & Visualizer Tab */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-[var(--text-main)] mb-1">
                    Audio Visualizer Engine
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
                    Connected to Web Audio AnalyserNode. Automatically halts animation when paused to save 100% CPU.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1.5">
                        Visualizer Style
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

                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-medium text-[var(--text-muted)]">
                          Visualizer Height
                        </label>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
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
                        className="w-full h-1 bg-[var(--border-color)] accent-[var(--accent-color)] rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 border-t border-[var(--border-color)] px-4 flex items-center justify-end bg-[var(--sidebar-color)] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[var(--accent-color)] hover:brightness-110 text-white text-xs font-medium transition-all shadow-sm"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
