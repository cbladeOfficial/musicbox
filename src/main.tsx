import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress default Edge / WebView2 browser context menu across the desktop application
window.addEventListener(
  'contextmenu',
  (e) => {
    const target = e.target as HTMLElement | null;
    // Allow context menu only inside editable text inputs/textareas for copy/paste
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
  },
  true
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
