// Nudge HQ Popup Script

async function getCanvasTab() {
  const tabs = await chrome.tabs.query({ url: 'https://lakota.instructure.com/*' });
  return tabs.length > 0 ? tabs[0] : null;
}

async function updateStatus() {
  const tab       = await getCanvasTab();
  const dot       = document.getElementById('status-dot');
  const statusTxt = document.getElementById('status-text');
  const noCanvas  = document.getElementById('not-on-canvas');
  const syncBtn   = document.getElementById('sync-btn');

  if (!tab) {
    dot.className = 'dot dot-red';
    statusTxt.textContent = 'Canvas not open';
    noCanvas.style.display = 'block';
    syncBtn.disabled = true;
  } else {
    dot.className = 'dot dot-green';
    statusTxt.textContent = 'Canvas connected';
    noCanvas.style.display = 'none';
    syncBtn.disabled = false;
  }

  // Read sync status from chrome.storage.local
  chrome.storage.local.get(['nhq_synced_at', 'nhq_upcoming_raw', 'nhq_missing_raw'], (result) => {
    const upcoming = result.nhq_upcoming_raw ? JSON.parse(result.nhq_upcoming_raw).length : 0;
    const missing  = result.nhq_missing_raw  ? JSON.parse(result.nhq_missing_raw).length  : 0;
    document.getElementById('upcoming-count').textContent = upcoming || '—';
    document.getElementById('missing-count').textContent  = missing  || '—';
    if (result.nhq_synced_at) {
      const d = new Date(result.nhq_synced_at);
      document.getElementById('synced-at').textContent = 'Last synced: ' + d.toLocaleTimeString();
    }
  });
}

document.getElementById('sync-btn').addEventListener('click', async () => {
  const btn = document.getElementById('sync-btn');
  const tab = await getCanvasTab();
  if (!tab) return;

  btn.disabled = true;
  btn.textContent = '⏳ Syncing…';

  try {
    chrome.tabs.sendMessage(tab.id, { type: 'SYNC_NOW' });
    setTimeout(async () => {
      await updateStatus();
      btn.textContent = '✓ Synced!';
      setTimeout(() => {
        btn.textContent = '🔄 Sync Now';
        btn.disabled = false;
      }, 2000);
    }, 2500);
  } catch(e) {
    btn.textContent = '❌ Failed';
    btn.disabled = false;
  }
});

document.getElementById('open-parent').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://sascheetz.github.io/nudgehq-site/nudgehq-parent.html' });
});

document.getElementById('open-student').addEventListener('click', () => {
  chrome.storage.local.get(['nhq_user_ids'], (result) => {
    const userIds = JSON.parse(result.nhq_user_ids || '[]');
    const studentIds = userIds.filter(id => id !== '51186');
    const userId = studentIds[0] || '50904';
    chrome.tabs.create({ url: 'https://sascheetz.github.io/nudgehq-site/student.html?userId=' + userId });
  });
});

updateStatus();
