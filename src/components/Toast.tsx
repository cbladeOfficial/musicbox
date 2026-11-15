import React, { useEffect } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center space-x-2.5 px-4 py-2.5 rounded-lg bg-[#181a20]/95 border border-white/15 text-white text-xs shadow-2xl backdrop-blur-md animate-fadeIn transition-opacity duration-200"
        >
          {toast.type === 'info' ? (
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.text}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
