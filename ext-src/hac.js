// Nudge HQ HAC Content Script
// Runs on hac.lakotainline.com
// Scrapes grade data and finds zeros/missing scores

const HAC_BASE = 'https://hac.lakotainline.com';

async function fetchHACPage(path) {
  const res = await fetch(HAC_BASE + path, {
    credentials: 'include',
    headers: { 'Accept': 'text/html' }
  });
  if (!res.ok) throw new Error('HAC fetch failed: ' + res.status);
  const html = await res.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

async function scrapeHAC() {
  console.log('[Nudge HQ HAC] Starting HAC scrape...');
  try {
    // Get the week view which lists all courses
    const weekDoc = await fetchHACPage('/HomeAccess/Home/WeekView');
    
    // Get student name from page
    const studentName = weekDoc.querySelector('.sg-banner-title')?.textContent?.trim() || 'Student';

    // Find all course links - HAC uses javascript: links with section keys
    // Pattern: ViewAssignmentsRCPopUp(section_key, course_session, ...)
    const allLinks = [...weekDoc.querySelectorAll('a')];
    const courseLinks = allLinks.filter(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('ViewAssignmentsRCPopUp') || href.includes('AssignmentsFromRCPopUp');
    });

    // Also check onclick attributes
    const onclickLinks = allLinks.filter(a => {
      const oc = a.getAttribute('onclick') || '';
      return oc.includes('ViewAssignmentsRCPopUp');
    });

    const allCourseLinks = [...new Set([...courseLinks, ...onclickLinks])];

    if (!allCourseLinks.length) {
      console.log('[Nudge HQ HAC] No course links found - trying grades page');
      await scrapeFromGradesPage();
      return;
    }

    console.log('[Nudge HQ HAC] Found', allCourseLinks.length, 'courses');

    const zeros = [];

    for (const link of allCourseLinks) {
      // Extract section_key from javascript: href or onclick
      const jsStr = link.getAttribute('href') || link.getAttribute('onclick') || '';
      const match = jsStr.match(/ViewAssignmentsRCPopUp\((\d+),\s*(\d+)/);
      if (!match) continue;
      
      const sectionKey    = match[1];
      const courseSession = match[2];
      const coursePath    = `/HomeAccess/Content/Student/AssignmentsFromRCPopUp.aspx?section_key=${sectionKey}&course_session=${courseSession}&RC_RUN=1&stripe_num=1&RC_period=MP++++.Trim()`;
      const courseName    = link.closest('tr')?.querySelector('.sg-header-title, .sg-course-name')?.textContent?.trim()
        || link.textContent?.trim()
        || 'Course ' + sectionKey;

      try {
        const courseDoc = await fetchHACPage(coursePath);
        const rows = [...courseDoc.querySelectorAll('tr.sg-asp-table-data-row')];
        
        rows.forEach(row => {
          const cells = [...row.querySelectorAll('td')];
          if (cells.length < 5) return;
          
          const dateDue    = cells[0]?.textContent?.trim();
          const assignment = cells[2]?.textContent?.trim();
          const score      = cells[4]?.textContent?.trim();
          const totalPts   = cells[8]?.textContent?.trim();
          const pct        = cells[10]?.textContent?.trim();
          
          if (!assignment) return;
          
          // Flag zeros AND ungraded assignments
          const isZero    = score === '0.00' || score === '0';
          const isZeroPct = pct === '0.00%' || pct === '0%';
          const isBlank   = !score || score.trim() === '';
          
          if (isZero || isZeroPct || isBlank) {
            zeros.push({
              course:     courseName,
              assignment,
              dateDue,
              score:      isBlank ? 'Not graded' : score,
              totalPts:   totalPts || '—',
              pct:        isBlank ? '—' : (pct || '0%'),
              isBlank,
              isZero: isZero || isZeroPct,
            });
          }
        });
      } catch(e) {
        console.warn('[Nudge HQ HAC] Course scrape failed:', courseName, e.message);
      }
    }

    console.log('[Nudge HQ HAC] Found', zeros.length, 'zeros/missing scores');

    // Cross-reference with Canvas data
    const canvasData = await new Promise(res => chrome.storage.local.get([
      'nhq_50904_submitted_ids',
      'nhq_50904_upcoming_raw',
      'nhq_50904_missing_raw',
    ], res));

    const submittedIds    = new Set(JSON.parse(canvasData.nhq_50904_submitted_ids || '[]'));
    const upcomingRaw     = JSON.parse(canvasData.nhq_50904_upcoming_raw || '[]');
    const missingRaw      = JSON.parse(canvasData.nhq_50904_missing_raw  || '[]');

    // Build a map of Canvas assignment names to IDs and status
    const canvasAssignments = {};
    upcomingRaw.forEach(e => {
      const a = e.assignment || e;
      const name = (a.name || a.title || e.title || '').toLowerCase().trim();
      if (name) canvasAssignments[name] = { id: String(a.id || e.id), status: 'upcoming' };
    });
    missingRaw.forEach(a => {
      const name = (a.name || '').toLowerCase().trim();
      if (name) canvasAssignments[name] = { id: String(a.id), status: 'missing' };
    });

    // Add Canvas status to each HAC zero
    zeros.forEach(z => {
      const hacName = z.assignment.toLowerCase().trim();
      
      // Exact match first
      let match = canvasAssignments[hacName];
      
      // Fuzzy match - check if HAC name contains Canvas name or vice versa
      if (!match) {
        for (const [canvasName, data] of Object.entries(canvasAssignments)) {
          if (hacName.includes(canvasName) || canvasName.includes(hacName) ||
              hacName.replace(/[^a-z0-9]/g, '').includes(canvasName.replace(/[^a-z0-9]/g, ''))) {
            match = data;
            break;
          }
        }
      }

      if (match) {
        const submitted = submittedIds.has(match.id);
        z.canvasStatus = submitted ? 'submitted' : match.status;
        z.canvasId     = match.id;
      } else {
        z.canvasStatus = 'not_in_canvas'; // paper-only assignment
      }
    });

    await chrome.storage.local.set({
      nhq_hac_zeros:    JSON.stringify(zeros),
      nhq_hac_synced_at: new Date().toISOString(),
      nhq_hac_student:  studentName,
    });

    chrome.runtime.sendMessage({ type: 'HAC_SYNC_COMPLETE', zeros: zeros.length });

  } catch(e) {
    console.error('[Nudge HQ HAC] Scrape failed:', e.message);
    chrome.runtime.sendMessage({ type: 'HAC_SYNC_FAILED', error: e.message });
  }
}

async function scrapeFromGradesPage() {
  // Try the report card / grades page
  const gradesDoc = await fetchHACPage('/HomeAccess/Content/Student/ReportCards.aspx');
  const links = [...gradesDoc.querySelectorAll('a[href*="section_key"]')];
  console.log('[Nudge HQ HAC] Grades page links:', links.length);
  // Similar scraping logic would go here
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'HAC_SYNC_NOW') {
    scrapeHAC().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

// Auto-scrape throttled to once per 30 minutes
chrome.storage.local.get(['nhq_hac_synced_at'], (result) => {
  const lastSync = result.nhq_hac_synced_at;
  const minutesSince = lastSync ? (Date.now() - new Date(lastSync).getTime()) / 60000 : 999;
  if (minutesSince > 30) scrapeHAC();
});
