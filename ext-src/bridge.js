// Nudge HQ Bridge Script
// Reads all nhq_* data from chrome.storage.local and writes to page localStorage

chrome.storage.local.get(null, (result) => {
  Object.entries(result).forEach(([key, value]) => {
    if (key.startsWith('nhq_')) {
      localStorage.setItem(key, value);
    }
  });
  console.log('[Nudge HQ Bridge] Data written to localStorage ✓');
  window.dispatchEvent(new CustomEvent('nhq_data_ready'));
});

// Listen for auth token from the dashboard page
window.addEventListener('nhq_token_ready', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  if (detail?.token) {
    chrome.storage.local.set({ nhq_auth_token: detail.token });
    console.log('[Nudge HQ Bridge] Auth token saved ✓');
  }
});
