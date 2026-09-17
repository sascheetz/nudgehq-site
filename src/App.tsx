import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import type { Assignment, HACZero, CompletedSub, TabKey } from './types';
import { loadFromExtension, loadHACZeros, loadCompletedSubs, getUserIds, getCourseMap, loadAllFromCloud, scheduleCloudPush, restoreCredential, readQRParams, twilioSend, buildMissingMsg, buildEncMsg, buildAllMissingMsg } from './data';
import { urgency, getDateLabel, pillLabel, pillClass } from './utils';
import { Sidebar } from './components/Sidebar';
import { AssignmentCard } from './components/AssignmentCard';
import { HACTab } from './components/HACTab';
import { CompletedTab } from './components/CompletedTab';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Toast, showToast } from './components/Toast';

function off(d: number, h: number, m: number): Date {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, m, 0, 0);
  return x;
}

export default function App() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [studentName, setStudentName] = useState('Student');
  const [studentChecked, setStudentChecked] = useState<Record<string, boolean>>({});
  const [studentSubTypes, setStudentSubTypes] = useState<Record<string, any>>({});
  const [parentDone, setParentDone] = useState<Record<string, boolean>>(JSON.parse(localStorage.getItem('nhq_parent_done') || '{}'));
  const [parentNotes, setParentNotes] = useState<Record<string, string>>(JSON.parse(localStorage.getItem('nhq_parent_notes') || '{}'));
  const [syncedAt, setSyncedAt] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCourseFilter, setActiveCourseFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('assignments');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hacZeros, setHacZeros] = useState<HACZero[]>([]);
  const [hacSyncedAt, setHacSyncedAt] = useState('');
  const [completedSubs, setCompletedSubs] = useState<CompletedSub[]>([]);
  const [nudgeSentIds, setNudgeSentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoModeRef = useRef(false);

  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const doLoadFromExtension = useCallback((userId?: string, opts?: { silent?: boolean }) => {
    const ids = getUserIds();
    const PARENT_ID = '51186';
    const filteredIds = ids.filter(id => id !== PARENT_ID);
    if (!filteredIds.length) {
      if (!opts?.silent) showToast('No extension data found. Open Canvas and click Sync in the Nudge HQ extension.', 'err');
      return;
    }
    const uid = userId || filteredIds[0];
    setActiveUserId(uid);
    setUserIds(filteredIds);
    const result = loadFromExtension(uid);
    setAssignments(result.assignments);
    setStudentChecked(result.studentChecked);
    setStudentSubTypes(result.studentSubTypes);
    setSyncedAt(result.syncedAt);
    setStudentName(result.studentName);

    setParentDone(JSON.parse(localStorage.getItem('nhq_parent_done') || '{}'));
    setParentNotes(JSON.parse(localStorage.getItem('nhq_parent_notes') || '{}'));
    setActiveCourseFilter(null);
    setActiveFilter('all');

    // Load HAC
    const hac = loadHACZeros();
    setHacZeros(hac.zeros);
    setHacSyncedAt(hac.syncedAt);

    // Load completed subs
    setCompletedSubs(loadCompletedSubs(uid));

    if (!opts?.silent) showToast(`Loaded ${result.assignments.length} assignments for ${result.studentName} ✓`, 'ok');
  }, []);

  // Auto-load on mount
  useEffect(() => {
    readQRParams();
    const hasExtData = localStorage.getItem('nhq_upcoming_raw') || localStorage.getItem('nhq_missing_raw');
    if (hasExtData) {
      autoLoadTimerRef.current = setTimeout(() => {
        if (!demoModeRef.current) doLoadFromExtension();
      }, 300);
    }
    // Listen for bridge data
    const bridgeHandler = () => setTimeout(() => {
      if (!demoModeRef.current) doLoadFromExtension();
    }, 100);
    window.addEventListener('nhq_data_ready', bridgeHandler);
    return () => window.removeEventListener('nhq_data_ready', bridgeHandler);
  }, [doLoadFromExtension]);

  const handleLoadAllFromCloud = async () => {
    showToast('Loading from cloud...', '');
    setLoading(true);
    try {
      await loadAllFromCloud(activeUserId);
      const ids = getUserIds();
      const uid = activeUserId && activeUserId !== 'demo' ? activeUserId : (ids[0] || '50904');
      doLoadFromExtension(uid, { silent: true });
      showToast('Loaded all data from cloud ✓', 'ok');
    } catch (e) {
      console.error('Cloud load error:', e);
      showToast('Cloud load failed. Check your connection and try again.', 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHAC = () => {
    const hac = loadHACZeros();
    if (!hac.zeros.length) {
      showToast('No HAC data yet. Open HAC Classwork and let Nudge HQ sync.', 'err');
      return;
    }
    setHacZeros(hac.zeros);
    setHacSyncedAt(hac.syncedAt);
    setActiveTab('hac');
    showToast(`Loaded ${hac.zeros.length} HAC entries ✓`, 'ok');
  };

  const loadDemo = () => {
    demoModeRef.current = true;
    if (autoLoadTimerRef.current) { clearTimeout(autoLoadTimerRef.current); autoLoadTimerRef.current = null; }
    const demoAssignments: Assignment[] = [
      { id: 'd1', title: 'Civil War Causes — DBQ Essay', course: '7th Grade Social Studies', due: off(-12, 23, 59), status: 'zeroed', points: 50, grade: '0', source: 'api' },
      { id: 'd2', title: 'Cells & Organelles Diagram', course: '7th Grade Life Science', due: off(-8, 23, 59), status: 'zeroed', points: 30, grade: '0', source: 'api' },
      { id: 'd3', title: 'Chapter 9 Reading Response', course: '7th Grade ELA', due: off(-5, 23, 59), status: 'missing', points: 20, source: 'api' },
      { id: 'd4', title: 'Fractions & Decimals Practice — Unit 4', course: '7th Grade Math', due: off(-3, 8, 0), status: 'missing', points: 15, source: 'api' },
      { id: 'd5', title: 'Spanish Vocabulary Flash Cards', course: 'Spanish I', due: off(-1, 23, 59), status: 'missing', points: 10, source: 'api' },
      { id: 'd6', title: 'Persuasive Essay — First Draft', course: '7th Grade ELA', due: off(0, 23, 59), status: 'upcoming', points: 40, source: 'api' },
      { id: 'd7', title: 'Matter & Energy — Lab Worksheet', course: '7th Grade Life Science', due: off(0, 8, 0), status: 'upcoming', points: 20, source: 'api' },
      { id: 'd8', title: 'Pythagorean Theorem — Problem Set', course: '7th Grade Math', due: off(1, 23, 59), status: 'upcoming', points: 25, source: 'api' },
      { id: 'd9', title: 'Colonial America — Compare & Contrast', course: '7th Grade Social Studies', due: off(2, 23, 59), status: 'upcoming', points: 35, source: 'api' },
      { id: 'd10', title: 'Spanish I — Chapter 4 Workbook', course: 'Spanish I', due: off(3, 23, 59), status: 'upcoming', points: 20, source: 'api' },
      { id: 'd11', title: 'Ecosystems Research Project', course: '7th Grade Life Science', due: off(7, 23, 59), status: 'upcoming', points: 100, source: 'api' },
      { id: 'd12', title: 'The Outsiders — Book Report', course: '7th Grade ELA', due: off(8, 23, 59), status: 'upcoming', points: 60, source: 'api' },
      { id: 'd13', title: 'Integers & Rational Numbers — Unit Test', course: '7th Grade Math', due: off(9, 23, 59), status: 'upcoming', points: 50, source: 'api' },
      { id: 'd14', title: 'PE Fitness Log — Week 6', course: 'Physical Education', due: off(10, 23, 59), status: 'upcoming', points: 10, source: 'api' },
      { id: 'd15', title: 'Art Portfolio — Mixed Media Piece', course: 'Art', due: off(14, 23, 59), status: 'upcoming', points: 75, source: 'api' },
      { id: 'd16', title: 'Revolutionary War — Timeline Project', course: '7th Grade Social Studies', due: off(18, 23, 59), status: 'upcoming', points: 40, source: 'api' },
    ];
    setAssignments(demoAssignments);
    setStudentChecked({ d8: true });
    setStudentSubTypes({
      d1: { type: 'online_upload', note: '' },
      d2: { type: 'online_text_entry', note: '' },
      d3: { type: 'online_quiz', note: '' },
      d4: { type: 'online_upload', note: '' },
      d5: { type: 'discussion_topic', note: '' },
      d6: { type: 'online_text_entry', note: '' },
      d7: { type: 'online_upload', note: '' },
      d8: { type: 'online_quiz', note: '' },
      d9: { type: 'discussion_topic', note: '' },
      d10: { type: 'media_recording', note: '' },
      d11: { type: 'online_upload', note: '' },
      d12: { type: 'online_text_entry', note: '' },
      d13: { type: 'online_quiz', note: '' },
      d14: { type: 'none', note: '' },
      d15: { type: 'not_graded', note: '' },
      d16: { type: 'online_upload', note: '' },
    });
    setCompletedSubs([
      { title: 'Civil War Causes — DBQ Essay', course: '7th Grade Social Studies', due: off(-13, 23, 59).toISOString(), submitted_at: off(-12, 14, 30).toISOString(), score: 45, points: 50 },
      { title: 'Cells & Organelles Diagram', course: '7th Grade Life Science', due: off(-9, 23, 59).toISOString(), submitted_at: off(-9, 10, 15).toISOString(), score: 28, points: 30 },
      { title: 'Chapter 8 Reading Response', course: '7th Grade ELA', due: off(-15, 23, 59).toISOString(), submitted_at: off(-14, 20, 0).toISOString(), score: 18, points: 20 },
      { title: 'Fractions Quiz — Unit 3', course: '7th Grade Math', due: off(-16, 23, 59).toISOString(), submitted_at: off(-15, 9, 0).toISOString(), score: 14, points: 15 },
      { title: 'Spanish Vocabulary Quiz — Ch 3', course: 'Spanish I', due: off(-20, 23, 59).toISOString(), submitted_at: off(-19, 15, 30).toISOString(), score: 9, points: 10 },
      { title: 'Plate Tectonics — Lab Report', course: '7th Grade Life Science', due: off(-22, 23, 59).toISOString(), submitted_at: off(-21, 16, 45).toISOString(), score: 19, points: 20 },
      { title: 'Constitution — Study Guide', course: '7th Grade Social Studies', due: off(-25, 23, 59).toISOString(), submitted_at: off(-24, 11, 0).toISOString(), score: 33, points: 35 },
      { title: 'The Giver — Chapter Questions', course: '7th Grade ELA', due: off(-28, 23, 59).toISOString(), submitted_at: off(-27, 19, 30).toISOString(), score: 38, points: 40 },
      { title: 'Percent & Proportions — Problem Set', course: '7th Grade Math', due: off(-30, 23, 59).toISOString(), submitted_at: off(-29, 8, 0).toISOString(), score: 23, points: 25 },
      { title: 'Spanish I — Chapter 3 Workbook', course: 'Spanish I', due: off(-32, 23, 59).toISOString(), submitted_at: off(-31, 13, 15).toISOString(), score: 19, points: 20 },
      { title: 'PE Fitness Log — Week 5', course: 'Physical Education', due: off(-35, 23, 59).toISOString(), submitted_at: off(-34, 10, 0).toISOString(), score: 10, points: 10 },
      { title: 'Art Portfolio — Sketch Study', course: 'Art', due: off(-38, 23, 59).toISOString(), submitted_at: off(-37, 14, 30).toISOString(), score: 68, points: 75 },
      { title: 'Ecosystems — Vocabulary Quiz', course: '7th Grade Life Science', due: off(-40, 23, 59).toISOString(), submitted_at: off(-39, 9, 45).toISOString(), score: 8, points: 10 },
      { title: 'Revolutionary War — Map Activity', course: '7th Grade Social Studies', due: off(-42, 23, 59).toISOString(), submitted_at: off(-41, 15, 0).toISOString(), score: 35, points: 40 },
    ]);
    setSyncedAt('');
    setStudentName('Alex');
    setActiveUserId('demo');
    showToast('Demo loaded — 16 assignments across 7 courses', 'ok');
  };

  const toggleParentDone = (id: string) => {
    const newDone = { ...parentDone };
    if (newDone[id]) delete newDone[id];
    else newDone[id] = true;
    setParentDone(newDone);
    localStorage.setItem('nhq_parent_done', JSON.stringify(newDone));
    showToast(newDone[id] ? 'Marked done ✓' : 'Unmarked', 'ok');
    scheduleCloudPush(activeUserId);
  };

  const handleNoteChange = (id: string, note: string) => {
    const newNotes = { ...parentNotes, [id]: note };
    setParentNotes(newNotes);
    localStorage.setItem('nhq_parent_notes', JSON.stringify(newNotes));
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => scheduleCloudPush(activeUserId), 600);
  };

  const sendNudge = async (id: string, isMissing: boolean) => {
    const sid = restoreCredential('tw-sid');
    const token = restoreCredential('tw-token');
    const from = restoreCredential('tw-from');
    const to = restoreCredential('tw-to');
    if (!sid || !token || !from || !to) {
      showToast('Fill in Twilio credentials in Settings first.', 'err');
      setSettingsOpen(true);
      return;
    }
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    const name = restoreCredential('student-name') || 'Hey';
    const msg = isMissing ? buildMissingMsg(a, name) : buildEncMsg(a, name);
    const ok = await twilioSend(sid, token, from, to, msg);
    if (ok) {
      setNudgeSentIds(prev => new Set([...prev, id]));
      showToast('Text sent! 📲', 'ok');
    } else {
      showToast('SMS failed. Check Twilio credentials.', 'err');
    }
  };

  const sendGeneralReminder = async () => {
    const sid = restoreCredential('tw-sid');
    const token = restoreCredential('tw-token');
    const from = restoreCredential('tw-from');
    const to = restoreCredential('tw-to');
    if (!sid || !token || !from || !to) {
      showToast('Fill in Twilio credentials in Settings first.', 'err');
      setSettingsOpen(true);
      return;
    }
    const name = restoreCredential('student-name') || 'Hey';
    const msg = `Hey ${name}! Just a quick reminder to check Canvas for any assignments due soon. You've got this! ❤️`;
    const ok = await twilioSend(sid, token, from, to, msg);
    showToast(ok ? 'Reminder sent! 📲' : 'SMS failed.', ok ? 'ok' : 'err');
  };

  // Filtered assignments for display
  const filteredAssignments = assignments.filter(a => {
    const u = urgency(a);
    const pDone = parentDone[a.id];
    const sDone = studentChecked[a.id] === true;
    if (activeCourseFilter && a.course !== activeCourseFilter) return false;
    if (activeFilter === 'all') return !pDone;
    if (activeFilter === 'done') return pDone;
    if (activeFilter === 'missing') return a.status === 'missing' && !pDone;
    if (activeFilter === 'student-done') return sDone && !pDone;
    return u === activeFilter && a.status !== 'missing' && !pDone;
  });

  // Course filter options
  const courseMap = activeUserId ? getCourseMap(activeUserId) : {};
  const allCourseNames = Object.values(courseMap).filter(Boolean).sort();
  const assignmentCourses = new Set(assignments.filter(a => !parentDone[a.id]).map(a => a.course).filter(Boolean));
  const courseOptions = allCourseNames.length ? allCourseNames : [...assignmentCourses].sort();

  // Group assignments for display
  const gradedUpcoming = filteredAssignments.filter(a => a.status === 'upcoming' && a.postToSis !== false);
  const practiceUpcoming = filteredAssignments.filter(a => a.status === 'upcoming' && a.postToSis === false);
  const nonUpcoming = filteredAssignments.filter(a => a.status !== 'upcoming');
  const reorderedList: (Assignment | { __sectionHeader: string })[] = [...nonUpcoming];
  if (gradedUpcoming.length && practiceUpcoming.length) reorderedList.push({ __sectionHeader: '📊 Graded Assignments' });
  reorderedList.push(...gradedUpcoming);
  if (practiceUpcoming.length) {
    reorderedList.push({ __sectionHeader: '📝 Practice & Formative' });
    reorderedList.push(...practiceUpcoming);
  }

  // Missing banner
  const missingItems = assignments.filter(a =>
    (a.status === 'missing' || a.status === 'zeroed') && !parentDone[a.id] && studentChecked[a.id] !== true
  );
  const stuChecked = assignments.filter(a => studentChecked[a.id] === true && a.status !== 'missing');

  const syncDisplay = syncedAt ? 'Synced · ' + new Date(syncedAt).toLocaleTimeString() : 'Not yet synced';

  const selectStyle: React.CSSProperties = {
    padding: '6px 14px', border: '1px solid var(--border)', borderRadius: '20px',
    fontSize: '0.87rem', fontFamily: 'inherit', color: 'var(--subink)',
    background: 'var(--bg)', cursor: 'pointer', outline: 'none',
  };

  const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    padding: '8px 14px', fontFamily: 'inherit', fontSize: '0.92rem',
    color: isActive ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer',
    transition: 'all 0.15s', marginBottom: '-1px',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile header */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ☰
            </button>
            <h1 style={{ fontWeight: 300, fontStyle: 'italic', fontSize: '1.3rem' }}>
              Nudge <strong style={{ fontWeight: 600, color: 'var(--accent)', fontStyle: 'normal' }}>HQ</strong>
            </h1>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--subink)', cursor: 'pointer' }}
          >
            ⚙
          </button>
        </div>
      )}

      {/* Sidebar — desktop static, mobile drawer */}
      {isMobile ? (
        sidebarOpen && (
          <>
            <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,22,16,0.45)' }} />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 201, width: '280px', maxWidth: '85vw', overflowY: 'auto', animation: 'slideIn 0.25s ease', transform: 'translateX(0)' }}>
              <Sidebar
                assignments={assignments}
                parentDone={parentDone}
                userIds={userIds}
                activeUserId={activeUserId}
                studentName={studentName}
                isMobile={true}
                onSwitchChild={(id) => { doLoadFromExtension(id); setSidebarOpen(false); }}
                onLoadFromExtension={() => { doLoadFromExtension(); setSidebarOpen(false); }}
                onLoadAllFromCloud={() => { handleLoadAllFromCloud(); setSidebarOpen(false); }}
                onLoadHAC={() => { handleLoadHAC(); setSidebarOpen(false); }}
                onSendGeneralReminder={sendGeneralReminder}
                onLoadDemo={() => { loadDemo(); setSidebarOpen(false); }}
                onOpenSettings={() => { setSettingsOpen(true); setSidebarOpen(false); }}
              />
            </div>
          </>
        )
      ) : (
        <div style={{ width: '310px', flexShrink: 0 }}>
          <Sidebar
            assignments={assignments}
            parentDone={parentDone}
            userIds={userIds}
            activeUserId={activeUserId}
            studentName={studentName}
            isMobile={false}
            onSwitchChild={(id) => doLoadFromExtension(id)}
            onLoadFromExtension={() => doLoadFromExtension()}
            onLoadAllFromCloud={handleLoadAllFromCloud}
            onLoadHAC={handleLoadHAC}
            onSendGeneralReminder={sendGeneralReminder}
            onLoadDemo={loadDemo}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '60px 12px 20px' : '28px 26px', overflowY: 'auto' }}>
        {/* Top bar with tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', flexWrap: 'wrap' }}>
            {!isMobile && <h2 style={{ margin: 0, fontWeight: 300, fontStyle: 'italic', fontSize: '1.4rem' }}>Assignments</h2>}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', paddingBottom: 0, overflowX: 'auto', maxWidth: isMobile ? '100%' : 'none' }}>
              <button style={tabBtnStyle(activeTab === 'assignments')} onClick={() => setActiveTab('assignments')}>📋 Assignments</button>
              <button style={tabBtnStyle(activeTab === 'hac')} onClick={() => setActiveTab('hac')}>📊 HAC Grades</button>
              <button style={tabBtnStyle(activeTab === 'completed')} onClick={() => setActiveTab('completed')}>✅ Completed</button>
            </div>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{syncDisplay}</span>
              <button onClick={() => setSettingsOpen(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--subink)', cursor: 'pointer', whiteSpace: 'nowrap' }}>⚙ Settings</button>
            </div>
          )}
        </div>

        {isMobile && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '10px' }}>{syncDisplay}</div>
        )}

        {/* Assignments tab */}
        {activeTab === 'assignments' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} style={selectStyle}>
                <option value="all">Course Status</option>
                <option value="missing">⚠️ Missing</option>
                <option value="fire">🔴 Due Today</option>
                <option value="soon">🟠 This Week</option>
                <option value="student-done">✅ Submitted</option>
                <option value="done">✓ Parent Done</option>
              </select>
              <select value={activeCourseFilter || ''} onChange={e => setActiveCourseFilter(e.target.value || null)} style={selectStyle}>
                <option value="">Course Name</option>
                {courseOptions.map(c => <option key={c} value={c}>{c.split('-')[0].trim()}</option>)}
              </select>
            </div>

            {/* Missing banner */}
            {missingItems.length > 0 && (
              <div style={{ background: '#fdf0fb', border: '1px solid #d9aee8', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <strong style={{ color: 'var(--missing)', fontSize: '0.9rem', display: 'block', marginBottom: '3px' }}>
                    {missingItems.filter(a => a.status === 'zeroed').length > 0 && missingItems.filter(a => a.status === 'missing').length > 0
                      ? `${missingItems.filter(a => a.status === 'zeroed').length} graded zero, ${missingItems.filter(a => a.status === 'missing').length} missing`
                      : missingItems.filter(a => a.status === 'zeroed').length > 0
                        ? `${missingItems.filter(a => a.status === 'zeroed').length} assignment${missingItems.filter(a => a.status === 'zeroed').length > 1 ? 's' : ''} graded as zero`
                        : `⚠️ ${missingItems.filter(a => a.status === 'missing').length} assignment${missingItems.filter(a => a.status === 'missing').length > 1 ? 's are' : ' is'} officially missing`}
                  </strong>
                  <span style={{ fontSize: '0.92rem', color: 'var(--subink)', lineHeight: 1.55 }}>
                    {missingItems.map(a => `"${a.title}"`).join(' · ')}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const sid = restoreCredential('tw-sid');
                    const token = restoreCredential('tw-token');
                    const from = restoreCredential('tw-from');
                    const to = restoreCredential('tw-to');
                    if (!sid || !token || !from || !to) { showToast('Fill in Twilio credentials in Settings first.', 'err'); setSettingsOpen(true); return; }
                    const miss = assignments.filter(a => a.status === 'missing');
                    if (!miss.length) return;
                    const name = restoreCredential('student-name') || 'Hey';
                    const ok = await twilioSend(sid, token, from, to, buildAllMissingMsg(miss, name));
                    showToast(ok ? `Sent combined text for ${miss.length} assignments!` : 'SMS failed.', ok ? 'ok' : 'err');
                  }}
                  style={{ background: 'var(--missing)', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px 15px', fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  📲 Text all missing
                </button>
              </div>
            )}

            {/* Student checked banner */}
            {stuChecked.length > 0 && (
              <div style={{ background: '#fffbf0', border: '1px solid #f0d090', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <strong style={{ color: 'var(--student)', fontSize: '0.87rem', display: 'block', marginBottom: '3px' }}>
                  ✅ He checked off {stuChecked.length} assignment{stuChecked.length > 1 ? 's' : ''}
                </strong>
                <span style={{ fontSize: '0.92rem', color: 'var(--subink)', lineHeight: 1.55 }}>
                  {stuChecked.map(a => `"${a.title}"`).join(' · ')}
                </span>
              </div>
            )}

            {/* Cards */}
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.95rem', letterSpacing: '0.12em' }}>
                <span className="animate-pulse-soft">Connecting to Canvas…</span>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 20px', color: 'var(--muted)' }}>
                <div style={{ fontStyle: 'italic', fontSize: isMobile ? '2rem' : '2.8rem', marginBottom: '10px' }}>🎒</div>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.75 }}>No assignments to show.<br />Load from Canvas API or try demo data.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '8px' : '12px' }}>
                {reorderedList.map((item, idx) => {
                  if ('__sectionHeader' in item) {
                    return (
                      <div key={`section-${idx}`} style={{ gridColumn: '1 / -1', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--subink)', padding: '12px 2px 6px', borderBottom: '1px solid var(--border)', background: '#f8f9fa', marginTop: idx > 0 ? '12px' : '0' }}>
                        {item.__sectionHeader}
                      </div>
                    );
                  }
                  const a = item as Assignment;
                  const dateLabel = getDateLabel(a);
                  const prevItem = idx > 0 ? reorderedList[idx - 1] : null;
                  const showDateHeader = !prevItem || ('__sectionHeader' in prevItem) || getDateLabel(prevItem as Assignment) !== dateLabel;
                  return (
                    <Fragment key={a.id}>
                      {showDateHeader && (
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--subink)', padding: '16px 2px 6px', borderBottom: '1px solid var(--border)', marginBottom: '2px' }}>
                          {dateLabel}
                        </div>
                      )}
                      <AssignmentCard
                        assignment={a}
                        isParentDone={!!parentDone[a.id]}
                        isStudentChecked={studentChecked[a.id] === true}
                        studentSubType={studentSubTypes[a.id]}
                        parentNote={parentNotes[a.id] || ''}
                        isMobile={isMobile}
                        onToggleDone={() => toggleParentDone(a.id)}
                        onNudge={() => sendNudge(a.id, a.status === 'missing')}
                        onNoteChange={(note) => handleNoteChange(a.id, note)}
                        nudgeSent={nudgeSentIds.has(a.id)}
                      />
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HAC tab */}
        {activeTab === 'hac' && <HACTab zeros={hacZeros} syncedAt={hacSyncedAt} />}

        {/* Completed tab */}
        {activeTab === 'completed' && <CompletedTab subs={completedSubs} />}
      </main>

      {/* Settings drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onClearCreds={() => showToast('Credentials cleared.', '')} />

      {/* Toast */}
      <Toast />
    </div>
  );
}
