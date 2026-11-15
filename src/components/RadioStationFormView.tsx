import React, { useState } from 'react';
import { ArrowLeft, Check, X, Globe, Tag, Link2, Volume2, Loader2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRadio } from '@fortawesome/free-solid-svg-icons';
import { RadioStation } from '../types/music';
import { RadioStationIcon } from './RadioStationIcon';

interface RadioStationFormViewProps {
  stationToEdit?: RadioStation | null;
  onSave: (station: {
    name: string;
    url: string;
    favicon?: string;
    tags?: string;
    country?: string;
  }) => void;
  onBack: () => void;
}

const POPULAR_TAGS = [
  'Lofi',
  'Electronic',
  'Ambient',
  'Jazz',
  'Classical',
  'Rock',
  'Pop',
  'Synthwave',
  'Chill',
  'News',
  'Metal',
  'Hip Hop',
];

export const RadioStationFormView: React.FC<RadioStationFormViewProps> = ({
  stationToEdit,
  onSave,
  onBack,
}) => {
  const [name, setName] = useState(stationToEdit?.name || '');
  const [url, setUrl] = useState(stationToEdit?.url || '');
  const [favicon, setFavicon] = useState(stationToEdit?.favicon || '');
  const [tags, setTags] = useState(stationToEdit?.tags || '');
  const [country, setCountry] = useState(stationToEdit?.country || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testAudio, setTestAudio] = useState<HTMLAudioElement | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const isEditing = !!stationToEdit;

  // Handle live audio test
  const handleToggleTestStream = () => {
    if (isTesting && testAudio) {
      testAudio.pause();
      testAudio.src = '';
      setTestAudio(null);
      setIsTesting(false);
      setTestError(null);
      return;
    }

    if (!url.trim()) return;

    setTestError(null);
    try {
      const audio = new Audio(url.trim());
      audio.volume = 0.5;
      setIsTesting(true);

      audio.play().catch((err) => {
        console.warn('Test audio error:', err);
        setTestError('Failed to play stream. Ensure the URL is a direct MP3/AAC/OGG stream.');
        setIsTesting(false);
      });

      audio.onended = () => setIsTesting(false);
      audio.onerror = () => {
        setTestError('Stream error. Stream may be offline or CORS restricted.');
        setIsTesting(false);
      };

      setTestAudio(audio);
    } catch {
      setTestError('Invalid audio stream URL.');
      setIsTesting(false);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const currentTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (currentTags.some((t) => t.toLowerCase() === tagToAdd.toLowerCase())) {
      // Toggle off
      const nextTags = currentTags.filter((t) => t.toLowerCase() !== tagToAdd.toLowerCase());
      setTags(nextTags.join(', '));
    } else {
      // Add
      currentTags.push(tagToAdd);
      setTags(currentTags.join(', '));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    if (testAudio) {
      testAudio.pause();
      testAudio.src = '';
    }

    onSave({
      name: name.trim(),
      url: url.trim(),
      favicon: favicon.trim() || undefined,
      tags: tags.trim() || undefined,
      country: country.trim() || undefined,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-color)] select-none text-[var(--text-main)] animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="h-13 border-b border-[var(--border-color)] px-6 flex items-center justify-between bg-[var(--sidebar-color)] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (testAudio) {
                testAudio.pause();
                testAudio.src = '';
              }
              onBack();
            }}
            className="flex items-center space-x-2 text-sm text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Radio</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center space-x-2.5">
            <FontAwesomeIcon icon={faRadio} className="text-[var(--accent-color)] text-sm" />
            <h1 className="text-base font-semibold text-white">
              {isEditing ? `Edit "${stationToEdit.name}"` : 'Add Custom Radio Station'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (testAudio) {
                testAudio.pause();
                testAudio.src = '';
              }
              onBack();
            }}
            className="px-4 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-[var(--accent-color)] hover:brightness-110 text-white text-sm font-medium shadow-sm transition-opacity active:opacity-75"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Save Changes' : 'Add Station'}</span>
          </button>
        </div>
      </div>

      {/* 2. Page Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Main Form Card */}
          <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] shadow-md space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">
                Station Parameters
              </h2>
              <p className="text-xs text-zinc-400">
                Configure your custom radio station details, audio streaming URL, and branding icon.
              </p>
            </div>

            {/* Station Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                Station Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lofi Chillhop Radio"
                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] transition-all placeholder:text-zinc-600"
              />
            </div>

            {/* Stream URL + Live Test */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  <span>Audio Stream URL</span> <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  disabled={!url.trim()}
                  onClick={handleToggleTestStream}
                  className={`text-xs px-2.5 py-1 rounded flex items-center space-x-1.5 transition-colors duration-150 font-medium disabled:opacity-30 ${
                    isTesting
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/25 hover:bg-[var(--accent-color)]/25'
                  }`}
                >
                  {isTesting ? (
                    <>
                      <Volume2 className="w-3 h-3 text-rose-300" />
                      <span>Stop Test</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
                      <span>Test Stream</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="url"
                required
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestError(null);
                }}
                placeholder="https://stream.example.com/live.mp3"
                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] transition-all placeholder:text-zinc-600"
              />
              <p className="text-[11px] text-zinc-500 font-mono">
                Direct audio stream: MP3, AAC, OGG, or HLS (m3u8).
              </p>

              {testError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded border border-rose-500/20">
                  {testError}
                </div>
              )}
            </div>

            {/* Custom Icon / Favicon with Live Preview */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                Station Icon / Favicon (Optional)
              </label>

              <div className="flex items-center space-x-4">
                {/* Live Preview Container */}
                <div className="w-16 h-16 rounded-xl bg-zinc-900 border-2 border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-md">
                  <RadioStationIcon
                    favicon={favicon}
                    name={name || 'Preview'}
                    iconClassName="text-[var(--accent-color)] text-2xl"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <input
                    type="url"
                    value={favicon}
                    onChange={(e) => setFavicon(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-[var(--accent-color)] placeholder:text-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Leave blank to automatically use the FontAwesome generic radio icon.
                  </p>
                </div>
              </div>
            </div>

            {/* Country / Region */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Country / Origin (Optional)</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States, Japan, Global"
                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-color)] placeholder:text-zinc-600"
              />
            </div>

            {/* Tags / Genres */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Genres & Tags</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Lofi, Ambient, Chillout"
                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-color)] placeholder:text-zinc-600"
              />

              {/* Quick Tag Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 block">Click to toggle popular genres:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_TAGS.map((popTag) => {
                    const isSelected = tags
                      .toLowerCase()
                      .split(',')
                      .map((t) => t.trim())
                      .includes(popTag.toLowerCase());

                    return (
                      <button
                        type="button"
                        key={popTag}
                        onClick={() => handleAddTag(popTag)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isSelected
                            ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)] font-medium shadow-sm'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {isSelected ? `✓ ${popTag}` : `+ ${popTag}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (testAudio) {
                    testAudio.pause();
                    testAudio.src = '';
                  }
                  onBack();
                }}
                className="px-5 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-sm text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-[var(--accent-color)] hover:brightness-110 text-white text-sm font-semibold shadow-md transition-opacity active:opacity-75"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Create Radio Station'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
