import React, { useEffect, useRef, useState } from 'react';
import { VisualizerMode } from '../types/music';
import { audioEngine } from '../services/audioEngine';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  accentColor?: string;
  height?: number;
  isFullSpace?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

function parseColor(cssColor: string): { r: number; g: number; b: number; hex: string } {
  let resolved = cssColor.trim();
  if (resolved.startsWith('var(')) {
    const varName = resolved.slice(4, -1).trim();
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (val) resolved = val;
    } catch {}
  }
  if (!resolved || resolved.startsWith('var(')) resolved = '#3b82f6';

  if (resolved.startsWith('#')) {
    let hex = resolved.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      hex: `#${hex}`,
    };
  }

  const rgbMatch = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return { r, g, b, hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}` };
  }

  return { r: 59, g: 130, b: 246, hex: '#3b82f6' };
}

export const Visualizer: React.FC<VisualizerProps> = ({
  mode,
  isPlaying,
  accentColor = '#3b82f6',
  height = 54,
  isFullSpace = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Peak caps memory for bars
  const peaksRef = useRef<number[]>(new Array(64).fill(0));
  // Rotation angle for circular reactor
  const rotationRef = useRef<number>(0);
  // Phase offset for wave / ribbons
  const phaseRef = useRef<number>(0);
  // Particles pool
  const particlesRef = useRef<Particle[]>([]);

  // Track dynamic dimensions
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [containerHeight, setContainerHeight] = useState<number>(height);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
        if (isFullSpace && entry.contentRect.height > 0) {
          setContainerHeight(Math.floor(entry.contentRect.height));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullSpace]);

  const effectiveHeight = isFullSpace ? containerHeight : height;

  // Initialize particles once
  useEffect(() => {
    const count = isFullSpace ? 110 : 55;
    const pts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * containerWidth,
        y: Math.random() * effectiveHeight,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2.5 + 1.2,
        alpha: Math.random() * 0.6 + 0.3,
      });
    }
    particlesRef.current = pts;
  }, [effectiveHeight, isFullSpace, containerWidth]);

  useEffect(() => {
    if (mode === 'off' || !canvasRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = effectiveHeight * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = 64;
    const freqData = new Uint8Array(bufferLength);
    const waveData = new Uint8Array(bufferLength);

    const color = parseColor(accentColor);
    const { r, g, b, hex } = color;

    const render = () => {
      const w = containerWidth;
      const h = height;
      ctx.clearRect(0, 0, w, h);

      // Fetch real audio data
      audioEngine.getFrequencyData(freqData);
      audioEngine.getWaveformData(waveData);

      // Check if real analyser data is active or zeroed (e.g. cross-origin radio without CORS)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += freqData[i];
      }
      const isDead = sum === 0;

      // If playing but stream lacks CORS headers, synthesize harmonic audio frequencies
      if (isPlaying && isDead) {
        phaseRef.current += 0.04;
        const t = phaseRef.current;
        for (let i = 0; i < bufferLength; i++) {
          const harmonic1 = Math.sin(t * 2 + i * 0.18);
          const harmonic2 = Math.cos(t * 3.5 + i * 0.35);
          const bassBoost = Math.max(0, 1 - i / 18);
          const pulse = Math.abs(harmonic1 * 0.6 + harmonic2 * 0.4) * 0.85 + bassBoost * 0.15;
          freqData[i] = Math.min(255, Math.floor(pulse * 210 + 35));
          waveData[i] = Math.min(255, Math.floor(128 + Math.sin(t * 3 + (i / bufferLength) * Math.PI * 4) * 60));
        }
      }

      // Compute average energy & bass energy
      let totalEnergy = 0;
      let bassEnergy = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalEnergy += freqData[i];
        if (i < 12) bassEnergy += freqData[i];
      }
      const avgEnergy = totalEnergy / (bufferLength * 255);
      const bassRatio = bassEnergy / (12 * 255);

      // -------------------------------------------------------------
      // 1. Classic Spectrum Bars with Falling Peak Caps
      // -------------------------------------------------------------
      if (mode === 'bars') {
        const barCount = 48;
        const totalGap = 3 * (barCount - 1);
        const barWidth = Math.max(3, (w - totalGap) / barCount);
        let x = 0;

        for (let i = 0; i < barCount; i++) {
          // Logarithmic distribution to emphasize punchy bass & warm mids
          const logIdx = Math.min(bufferLength - 1, Math.floor(Math.pow(i / barCount, 1.4) * bufferLength));
          const val = freqData[logIdx] / 255;
          const barHeight = Math.max(2, val * (h - 8));

          // Peak cap gravity
          if (barHeight > peaksRef.current[i]) {
            peaksRef.current[i] = barHeight;
          } else {
            peaksRef.current[i] = Math.max(2, peaksRef.current[i] - 1.2);
          }

          // Bar gradient
          const grad = ctx.createLinearGradient(0, h, 0, h - barHeight);
          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
          grad.addColorStop(0.6, hex);
          grad.addColorStop(1, '#ffffff');

          ctx.fillStyle = grad;
          // Smooth rounded top
          ctx.beginPath();
          const radius = Math.min(2, barWidth / 2);
          ctx.roundRect(x, h - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
          ctx.fill();

          // Peak Cap dot
          const peakY = Math.max(2, h - peaksRef.current[i] - 3);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x, peakY, barWidth, 2, 1);
          ctx.fill();

          x += barWidth + 3;
        }
      }

      // -------------------------------------------------------------
      // 2. Dual Symmetrical Mirrored Spectrum
      // -------------------------------------------------------------
      else if (mode === 'mirror-bars') {
        const barCount = 48;
        const midY = h / 2;
        const totalGap = 3 * (barCount - 1);
        const barWidth = Math.max(3, (w - totalGap) / barCount);
        let x = 0;

        for (let i = 0; i < barCount; i++) {
          const logIdx = Math.min(bufferLength - 1, Math.floor(Math.pow(i / barCount, 1.3) * bufferLength));
          const val = freqData[logIdx] / 255;
          const halfBar = Math.max(1.5, val * (midY - 4));

          const grad = ctx.createLinearGradient(0, midY - halfBar, 0, midY + halfBar);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.5, hex);
          grad.addColorStop(1, '#ffffff');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, midY - halfBar, barWidth, halfBar * 2, 2);
          ctx.fill();

          x += barWidth + 3;
        }

        // Center horizon line
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
      }

      // -------------------------------------------------------------
      // 3. Oscilloscope Neon Waveform
      // -------------------------------------------------------------
      else if (mode === 'wave') {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = hex;
        ctx.shadowColor = hex;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const sliceWidth = w / (bufferLength - 1);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = waveData[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Cubic bezier smoothing between points
            const prevX = (i - 1) * sliceWidth;
            const prevV = waveData[i - 1] / 128.0;
            const prevY = (prevV * h) / 2;
            const cX = (prevX + x) / 2;
            ctx.bezierCurveTo(cX, prevY, cX, y, x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        // Translucent ambient glow fill
        ctx.shadowBlur = 0;
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.15 + avgEnergy * 0.25})`);
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }

      // -------------------------------------------------------------
      // 4. Circular Audio Reactor
      // -------------------------------------------------------------
      else if (mode === 'circle') {
        const cx = w / 2;
        const cy = h / 2;
        rotationRef.current += 0.006;
        const rot = rotationRef.current;

        const baseRadius = Math.max(14, Math.min(cx, cy) * 0.5 + bassRatio * 6);
        const bars = 48;

        // Inner pulsing core
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.18 + bassRatio * 0.4})`;
        ctx.fill();
        ctx.strokeStyle = hex;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Outer radial beams
        for (let i = 0; i < bars; i++) {
          const angle = (i * 2 * Math.PI) / bars + rot;
          const val = freqData[i % bufferLength] / 255;
          const barLen = Math.max(3, val * (h * 0.42));

          const x1 = cx + Math.cos(angle) * baseRadius;
          const y1 = cy + Math.sin(angle) * baseRadius;
          const x2 = cx + Math.cos(angle) * (baseRadius + barLen);
          const y2 = cy + Math.sin(angle) * (baseRadius + barLen);

          ctx.strokeStyle = val > 0.65 ? '#ffffff' : hex;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // -------------------------------------------------------------
      // 5. Multi-Layered Liquid Audio Ribbons (Bass, Mids, Treble)
      // -------------------------------------------------------------
      else if (mode === 'rainbow-ribbon') {
        phaseRef.current += 0.035;
        const t = phaseRef.current;

        const layers = [
          { color: 'rgba(0, 240, 255, 0.45)', speed: 1.0, freq: 0.015, amp: 0.45 + bassRatio * 0.5 },
          { color: `rgba(${r}, ${g}, ${b}, 0.55)`, speed: 1.4, freq: 0.022, amp: 0.4 + avgEnergy * 0.4 },
          { color: 'rgba(168, 85, 247, 0.45)', speed: 0.8, freq: 0.018, amp: 0.35 + avgEnergy * 0.35 },
        ];

        for (const lyr of layers) {
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          for (let x = 0; x <= w; x += 12) {
            const freqVal = (freqData[Math.floor((x / w) * (bufferLength - 1))] / 255) * 0.5;
            const y =
              h / 2 +
              Math.sin(x * lyr.freq + t * lyr.speed) * (h * lyr.amp * 0.45 + freqVal * (h * 0.35)) +
              Math.cos(x * 0.008 + t * 0.5) * 6;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = lyr.color;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }

      // -------------------------------------------------------------
      // 6. Particle Starfield / Audio Nebula
      // -------------------------------------------------------------
      else if (mode === 'particles') {
        const pts = particlesRef.current;

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          // React to bass kick
          if (bassRatio > 0.4) {
            p.vy -= bassRatio * 0.35;
          }

          p.x += p.vx * (1 + avgEnergy * 1.5);
          p.y += p.vy;

          // Drag
          p.vy *= 0.96;
          // Gentle float back towards center
          p.vy += (h / 2 - p.y) * 0.004;

          // Wrap around edges
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 2) p.y = h - 4;
          if (p.y > h - 2) p.y = 4;

          // Draw particle
          const pSize = Math.max(1, p.size * (1 + avgEnergy * 1.2));
          ctx.beginPath();
          ctx.arc(p.x, p.y, pSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, p.alpha + avgEnergy * 0.5)})`;
          ctx.fill();

          // Connect close particles with constellation lines
          for (let j = i + 1; j < pts.length; j++) {
            const p2 = pts[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 65) {
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.25 * (1 - dist / 65)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, containerWidth, effectiveHeight);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, isPlaying, accentColor, effectiveHeight, containerWidth]);

  if (mode === 'off') return null;

  return (
    <div
      ref={containerRef}
      className={`w-full flex items-center justify-center transition-colors overflow-hidden ${
        isFullSpace
          ? 'h-full flex-1 relative bg-black/95'
          : 'bg-[var(--surface-color)]/60 border-t border-[var(--border-color)] px-4 py-1.5'
      }`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: isFullSpace ? '100%' : `${height}px` }}
        className="w-full block"
      />
    </div>
  );
};
