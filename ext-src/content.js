// Nudge HQ Content Script
// Syncs from student's own Canvas session
// Stores data in chrome.storage.local namespaced by user ID

const BASE = window.location.origin;

async function fetchJSON(path) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error(path + ' returned ' + res.status);
  return res.json();
}

async function syncCanvas() {
  console.log('[Nudge HQ] Syncing Canvas data...');
  try {
    const profile = await fetchJSON('/api/v1/users/self/profile');
    const userId  = String(profile.id);
    const userName = profile.short_name || profile.name || 'Student';
    console.log('[Nudge HQ] Syncing for:', userName, '(', userId, ')');

    const [upcoming, missing, courses] = await Promise.all([
      fetchJSON('/api/v1/users/self/upcoming_events?per_page=50'),
      fetchJSON('/api/v1/users/self/missing_submissions?per_page=50'),
      fetchJSON('/api/v1/users/self/courses?enrollment_state=active&per_page=50'),
    ]);

    const courseMap = {};
    courses.forEach(c => {
      courseMap[String(c.id)] = c.name || c.course_code || 'Course ' + c.id;
    });

    let planner = [];
    const markedDoneIds = new Set();
    try {
      planner = await fetchJSON('/api/v1/planner/items?per_page=50');
      planner.forEach(p => {
        if (p.planner_override && p.planner_override.marked_complete) {
          markedDoneIds.add(String(p.plannable_id));
        }
      });
    } catch(e) {
      console.warn('[Nudge HQ] Planner fetch failed:', e.message);
    }

    // Fetch all assignments per course to catch beyond upcoming_events window (~2 weeks)
    const allAssignments = [];
    try {
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead
      const activeCourses = courses.filter(c => c.workflow_state === 'available' && c.name && c.name.includes('2027'));
      
      const assignFetches = activeCourses.map(c =>
        fetchJSON('/api/v1/courses/' + c.id + '/assignments?per_page=50&bucket=upcoming&order_by=due_at')
          .catch(() => [])
      );
      const assignResults = await Promise.all(assignFetches);
      assignResults.forEach((courseAssignments, i) => {
        const courseId = String(activeCourses[i].id);
        courseAssignments.forEach(a => {
          if (!a.due_at) return;
          const due = new Date(a.due_at);
          if (due < now || due > future) return;
          allAssignments.push({ ...a, course_id: courseId });
        });
      });
      console.log('[Nudge HQ] Extended assignments fetched:', allAssignments.length);
    } catch(e) {
      console.warn('[Nudge HQ] Extended assignment fetch failed:', e.message);
    }

    // Fetch submitted assignment IDs
    const submittedIds = new Set();
    try {
      const activeCourseIds = courses
        .filter(c => c.workflow_state === 'available')
        .map(c => c.id);
      const subFetches = activeCourseIds.map(cid =>
        fetchJSON('/api/v1/courses/' + cid +
          '/students/submissions?student_ids[]=self&workflow_state[]=submitted&workflow_state[]=graded&per_page=50')
          .catch(() => [])
      );
      const subResults = await Promise.all(subFetches);
      subResults.forEach(subs => {
        subs.forEach(s => {
          if (s.assignment_id && (s.workflow_state === 'submitted' || s.workflow_state === 'graded')) {
            submittedIds.add(String(s.assignment_id));
          }
        });
      });
      console.log('[Nudge HQ] Submitted IDs:', submittedIds.size);
    } catch(e) {
      console.warn('[Nudge HQ] Submission fetch failed:', e.message);
    }

    const prefix = 'nhq_' + userId + '_';
    const data   = {};
    // Merge upcoming_events with extended course assignments
    const upcomingMerged = [...upcoming];
    const upcomingIds = new Set(upcoming.map(e => String(e.assignment?.id || e.id)));
    allAssignments.forEach(a => {
      if (!upcomingIds.has(String(a.id))) {
        upcomingMerged.push({
          id: 'assignment_' + a.id,
          type: 'Assignment',
          title: a.name,
          assignment: a,
          context_name: courseMap[String(a.course_id)] || '',
          start_at: a.due_at,
          end_at: a.due_at,
        });
      }
    });

    data[prefix + 'upcoming_raw']    = JSON.stringify(upcomingMerged);
    data[prefix + 'missing_raw']     = JSON.stringify(missing);
    data[prefix + 'planner_raw']     = JSON.stringify(planner);
    data[prefix + 'course_map']      = JSON.stringify(courseMap);
    data[prefix + 'submitted_ids']   = JSON.stringify([...submittedIds]);
    data[prefix + 'marked_done_ids'] = JSON.stringify([...markedDoneIds]);
    data[prefix + 'name']            = userName;
    data[prefix + 'synced_at']       = new Date().toISOString();

    // Update user IDs list
    const existing = await new Promise(res => chrome.storage.local.get(['nhq_user_ids'], res));
    const userIds  = new Set(JSON.parse(existing.nhq_user_ids || '[]'));
    userIds.add(userId);
    data['nhq_user_ids'] = JSON.stringify([...userIds]);

    await chrome.storage.local.set(data);
    console.log('[Nudge HQ] Sync complete. Upcoming:', upcoming.length, 'Missing:', missing.length, 'Submitted:', submittedIds.size);
    chrome.runtime.sendMessage({ type: 'SYNC_COMPLETE', upcoming: upcoming.length, missing: missing.length, userId, userName });

  } catch(e) {
    console.error('[Nudge HQ] Sync failed:', e.message);
    chrome.runtime.sendMessage({ type: 'SYNC_FAILED', error: e.message });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SYNC_NOW') {
    syncCanvas().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

// Auto-sync throttled to once per 5 minutes
chrome.storage.local.get(['nhq_user_ids'], async () => {
  const profile = await fetchJSON('/api/v1/users/self/profile').catch(() => null);
  if (!profile) return;
  const key = 'nhq_' + profile.id + '_synced_at';
  chrome.storage.local.get([key], (r) => {
    const lastSync     = r[key];
    const minutesSince = lastSync ? (Date.now() - new Date(lastSync).getTime()) / 60000 : 999;
    if (minutesSince > 5) syncCanvas();
  });
});
