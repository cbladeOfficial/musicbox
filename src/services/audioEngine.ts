import { TrackRecord } from '../types/music';

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized = false;

  public onTimeUpdate: ((current: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
  public onError: ((err: string) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onEnded) this.onEnded();
    });

    this.audio.addEventListener('play', () => {
      if (this.onPlayStateChange) this.onPlayStateChange(true);
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    });

    this.audio.addEventListener('pause', () => {
      if (this.onPlayStateChange) this.onPlayStateChange(false);
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      if (this.onError) {
        this.onError('Audio playback failed or file format unsupported.');
      }
    });
  }

  private initWebAudio() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256; // 128 frequency bins - low memory & high responsiveness
      this.analyser.smoothingTimeConstant = 0.82;

      this.gainNode = this.audioCtx.createGain();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API init error (visualizer will fallback):', e);
    }
  }

  public getStreamUrl(track: TrackRecord, port: number): string {
    return `http://127.0.0.1:${port}/stream?path=${encodeURIComponent(track.path)}`;
  }

  public async playTrack(track: TrackRecord, port: number, startTime = 0) {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const url = this.getStreamUrl(track, port);
    if (this.audio.src !== url) {
      this.audio.src = url;
    }

    if (startTime > 0) {
      this.audio.currentTime = startTime;
    }

    try {
      await this.audio.play();
    } catch (err) {
      console.error('Failed to start playback:', err);
      if (this.onError) this.onError('Failed to start playback.');
    }
  }

  public async playRadio(streamUrl: string) {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (this.audio.src !== streamUrl) {
      this.audio.src = streamUrl;
    }

    try {
      await this.audio.play();
    } catch (err) {
      console.error('Failed to connect to radio stream:', err);
      if (this.onError) this.onError('Failed to connect to radio stream.');
    }
  }

  public pause() {
    this.audio.pause();
  }

  public async resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audio.play();
  }

  public seek(seconds: number) {
    if (Number.isFinite(seconds)) {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.audio.volume = clamped;
  }

  public getVolume(): number {
    return this.audio.volume;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  public getDuration(): number {
    return this.audio.duration || 0;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    } else {
      array.fill(0);
    }
  }

  public getWaveformData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as unknown as Uint8Array<ArrayBuffer>);
    } else {
      array.fill(128);
    }
  }
}

export const audioEngine = new AudioEngine();
