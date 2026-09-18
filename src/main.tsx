import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const SUPABASE_AUTH_KEY = 'sb-edpgijdpllltoineakny-auth-token';

if (window.location.pathname === '/api/token') {
  const raw = localStorage.getItem(SUPABASE_AUTH_KEY);
  let token: string | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      token = parsed.access_token ?? null;
    } catch {
      token = null;
    }
  }
  document.body.innerHTML = '';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify({ token }, null, 2);
  document.body.appendChild(pre);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
