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
