// Nudge HQ Background Service Worker
// Handles alarms for auto-sync and badge updates

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SYNC_COMPLETE') {
    // Update badge with missing count if available
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#2a7a56' });
    console.log('[Nudge HQ] Sync complete:', msg.upcoming, 'upcoming,', msg.missing, 'missing');
  }
  if (msg.type === 'SYNC_FAILED') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#c0392b' });
  }
});

// Set up alarm for auto-sync every 30 minutes
chrome.alarms.create('nhq_auto_sync', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'nhq_auto_sync') return;
  // Find an active Canvas tab and trigger sync
  const tabs = await chrome.tabs.query({ url: 'https://*.instructure.com/*' });
  if (tabs.length > 0) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SYNC_NOW' });
  }
});
