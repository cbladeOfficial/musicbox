import React, { useEffect, useRef } from 'react';
import { VisualizerMode } from '../types/music';
import { audioEngine } from '../services/audioEngine';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  accentColor?: string;
  height?: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  mode,
  isPlaying,
  accentColor = '#2f81f7',
  height = 48,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode === 'off' || !canvasRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64; // Low memory, crisp 64 bins
    const freqData = new Uint8Array(bufferLength);
    const waveData = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      if (mode === 'bars') {
        audioEngine.getFrequencyData(freqData);
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (freqData[i] / 255) * h * 0.95;
          const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
          gradient.addColorStop(0, accentColor);
          gradient.addColorStop(1, '#ffffff');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

          // Peak dot
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(x, Math.max(0, h - barHeight - 2), barWidth - 1, 1.5);

          x += barWidth;
          if (x > width) break;
        }
      } else if (mode === 'wave') {
        audioEngine.getWaveformData(waveData);
        ctx.lineWidth = 2;
        ctx.strokeStyle = accentColor;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = waveData[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();
      } else if (mode === 'circle') {
        audioEngine.getFrequencyData(freqData);
        const centerX = width / 2;
        const centerY = h / 2;
        const radius = Math.min(centerX, centerY) * 0.6;
        const bars = 48;

        for (let i = 0; i < bars; i++) {
          const angle = (i * 2 * Math.PI) / bars;
          const value = freqData[i % bufferLength] / 255;
          const barLen = value * (radius * 0.7);

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barLen);
          const y2 = centerY + Math.sin(angle) * (radius + barLen);

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        // Stop CPU loop when paused
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      // Draw static flat line/resting state
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, isPlaying, accentColor]);

  if (mode === 'off') return null;

  return (
    <div className="w-full flex items-center justify-center bg-[var(--surface-color)]/50 border-t border-[var(--border-color)] px-4 py-1">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full max-w-xl h-12 block"
      />
    </div>
  );
};
