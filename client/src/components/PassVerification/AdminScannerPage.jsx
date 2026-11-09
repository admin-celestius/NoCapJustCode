// client/src/components/PassVerification/AdminScannerPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './AdminScanner.module.css';
import { verifyPass, checkInAttendance, verifyAdminPasskey, getAttendanceRoster } from '../../services/api.js';
import celestiusLogoWebp from '../../assets/celestius-transparent.webp';
import celestiusLogoPng from '../../assets/celestius-transparent.png';
import locLogoWebp from '../../assets/logo-transparent.webp';
import locLogoPng from '../../assets/logo-transparent.png';

/**
 * Audio feedback chime synthesized natively via Web Audio API.
 */
function playChime(type = 'success') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    if (type === 'success') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.28);
    }
  } catch {
    // Audio gesture may be restricted; safe to ignore
  }
}

export default function AdminScannerPage() {
  // Session Authentication State
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authenticatedPasskey, setAuthenticatedPasskey] = useState(
    () => sessionStorage.getItem('loc_admin_passkey') || ''
  );
  const [authError, setAuthError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Scanner UI State
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const markedBy = 'Organiser Desk';

  // Live Roster Search & Quick Mark State
  const [rosterTeams, setRosterTeams] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'needs_workshop' | 'needs_competition'
  const [markingTeamKey, setMarkingTeamKey] = useState(null); // `${regCode}-${round}`

  // Camera State
  const [cameraRunning, setCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);

  // Scanned Duo Pass State
  const [currentDuo, setCurrentDuo] = useState(null);
  const [fetchingDuo, setFetchingDuo] = useState(false);
  const [duoError, setDuoError] = useState(null);

  // Session-bound round marking restriction
  const [markedRoundInSession, setMarkedRoundInSession] = useState(null); // 'workshop' | 'competition' | null
  const [markingAttendance, setMarkingAttendance] = useState(false);

  // Load roster of confirmed teams
  const loadRoster = async (passkeyToUse = authenticatedPasskey) => {
    if (!passkeyToUse) return;
    try {
      setLoadingRoster(true);
      setRosterError(null);
      const data = await getAttendanceRoster(passkeyToUse);
      if (data?.teams) {
        setRosterTeams(data.teams);
      }
    } catch (err) {
      console.error('Failed to load roster:', err);
      setRosterError(err.message || 'Failed to load teams list.');
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (authenticatedPasskey) {
      loadRoster(authenticatedPasskey);
    }
  }, [authenticatedPasskey]);

  // Guarantee clean single-track window scrolling
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    };
  }, []);

  // Handle 6-digit passkey login
  const handlePasskeyLogin = async (e) => {
    e?.preventDefault();
    const cleanPasskey = passkeyInput.trim();
    if (!cleanPasskey || cleanPasskey.length !== 6) {
      setAuthError('Please enter a valid 6-digit security passkey.');
      return;
    }

    try {
      setCheckingAuth(true);
      setAuthError(null);
      await verifyAdminPasskey(cleanPasskey);
      sessionStorage.setItem('loc_admin_passkey', cleanPasskey);
      setAuthenticatedPasskey(cleanPasskey);
      setPasskeyInput('');
      playChime('success');
      loadRoster(cleanPasskey);
    } catch (err) {
      setAuthError(err.message || 'Invalid security passkey. Access denied.');
      playChime('error');
    } finally {
      setCheckingAuth(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await stopCamera();
    sessionStorage.removeItem('loc_admin_passkey');
    setAuthenticatedPasskey('');
    setCurrentDuo(null);
    setMarkedRoundInSession(null);
    setAuthError(null);
    setRosterTeams([]);
    setSearchQuery('');
    setRosterError(null);
  };

  // Stop camera helper
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // Safe to ignore teardown errors
      }
      html5QrCodeRef.current = null;
      setCameraRunning(false);
    }
  };

  // Query duo information when a QR code is detected or entered
  const handleScannedCode = async (rawCode) => {
    let code = (rawCode || '').trim();
    if (!code) return;

    // Parse code from URL or raw TEAM code
    const match = code.match(/verify\/([a-zA-Z0-9_-]+)/i) || code.match(/TEAM-[a-zA-Z0-9]+/i);
    if (match) {
      code = match[1] || match[0];
    }
    code = code.toUpperCase();

    // Stop camera as soon as ticket is detected
    await stopCamera();

    try {
      setFetchingDuo(true);
      setDuoError(null);
      setCurrentDuo(null);
      setMarkedRoundInSession(null);

      const duoData = await verifyPass(code);
      setCurrentDuo(duoData);
      playChime('success');
    } catch (err) {
      setDuoError(err.message || 'No confirmed pass found.');
      playChime('error');
    } finally {
      setFetchingDuo(false);
    }
  };

  // Start live camera scanner
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const qrScanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScannedCode(decodedText);
        },
        () => {
          // Per-frame non-match; safe to ignore
        }
      );

      setCameraRunning(true);
    } catch (err) {
      console.error('Camera startup failed:', err);
      setCameraError(
        err.message || 'Camera permission denied or camera not found. You can use manual code entry.'
      );
      setCameraRunning(false);
    }
  };

  // Mark attendance for either Round 1 or Round 2
  const handleMarkRound = async (round) => {
    if (!currentDuo || markingAttendance || markedRoundInSession) return;

    try {
      setMarkingAttendance(true);
      const res = await checkInAttendance(currentDuo.regCode, {
        round,
        passcode: authenticatedPasskey,
        markedBy: markedBy.trim(),
      });

      // Update current duo local state
      setCurrentDuo((prev) => ({
        ...prev,
        attendance: res.attendance || {
          ...prev.attendance,
          [round]: { attended: true, markedAt: new Date(), markedBy },
        },
      }));

      // Keep rosterTeams list synchronized in real time
      setRosterTeams((prev) =>
        prev.map((t) => {
          if (t.regCode === currentDuo.regCode) {
            return {
              ...t,
              workshopStatus: round === 'workshop' ? 'attended' : t.workshopStatus,
              competitionStatus: round === 'competition' ? 'attended' : t.competitionStatus,
            };
          }
          return t;
        })
      );

      // Lock other round marking for this session
      setMarkedRoundInSession(round);
      playChime('success');
    } catch (err) {
      alert(err.message || 'Failed to mark attendance.');
      playChime('error');
    } finally {
      setMarkingAttendance(false);
    }
  };

  // Mark attendance directly from a search result card
  const handleDirectCardMark = async (team, round) => {
    const key = `${team.regCode}-${round}`;
    if (markingTeamKey) return;
    try {
      setMarkingTeamKey(key);
      await checkInAttendance(team.regCode, {
        round,
        passcode: authenticatedPasskey,
        markedBy,
      });

      // Update roster state locally
      setRosterTeams((prev) =>
        prev.map((t) => {
          if (t.regCode === team.regCode) {
            return {
              ...t,
              workshopStatus: round === 'workshop' ? 'attended' : t.workshopStatus,
              competitionStatus: round === 'competition' ? 'attended' : t.competitionStatus,
            };
          }
          return t;
        })
      );
      playChime('success');
    } catch (err) {
      alert(err.message || 'Failed to mark attendance.');
      playChime('error');
    } finally {
      setMarkingTeamKey(null);
    }
  };

  // Filtered teams list based on search query and status filter
  const filteredTeams = rosterTeams.filter((team) => {
    const q = searchQuery.trim().toLowerCase();
    let matchesText = true;
    if (q) {
      const teamName = (team.teamName || '').toLowerCase();
      const mem1 = (team.mem1Name || '').toLowerCase();
      const mem2 = (team.mem2Name || '').toLowerCase();
      const code = (team.regCode || '').toLowerCase();
      matchesText =
        teamName.includes(q) ||
        mem1.includes(q) ||
        mem2.includes(q) ||
        code.includes(q);
    }
    if (!matchesText) return false;

    if (statusFilter === 'needs_workshop') {
      return team.workshopStatus !== 'attended';
    }
    if (statusFilter === 'needs_competition') {
      return team.competitionStatus !== 'attended';
    }
    return true;
  });

  // Handle search or direct code submit
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (!q) return;

    // If exactly one match in filtered list, load that duo directly
    if (filteredTeams.length === 1) {
      handleScannedCode(filteredTeams[0].regCode);
    } else {
      handleScannedCode(q);
    }
  };

  // Reset and prepare for the next scan
  const handleScanNext = async () => {
    setCurrentDuo(null);
    setMarkedRoundInSession(null);
    setDuoError(null);
    setManualCode('');
    if (activeTab === 'camera') {
      await startCamera();
    }
  };

  // Auto teardown camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'manual') {
      stopCamera();
    }
  }, [activeTab]);

  return (
    <div className={styles.scannerContainer}>
      {/* Background Cyber Ambient Grid & Glow */}
      <div className={styles.ambientGrid} />
      <div className={styles.ambientGlow} />

      {/* ========================================================
          TICKET OUTER CHASSIS (Pixel-Stepped Cyber Frame)
          ======================================================== */}
      <div className={styles.ticketOuterWrapper}>
        
        {/* Floating Decorative Pixel Clusters (Confined to Chassis) */}
        <div className={styles.floatingPixelsTR}>
          <span className={styles.floatPixelDot} style={{ top: 0, right: 0 }} />
          <span className={styles.floatPixelDot} style={{ top: 7, right: 0 }} />
          <span className={styles.floatPixelDot} style={{ top: 7, right: 7 }} />
          <span className={styles.floatPixelDot} style={{ top: 14, right: 14 }} />
        </div>
        <div className={styles.floatingPixelsBL}>
          <span className={styles.floatPixelDot} style={{ bottom: 0, left: 0 }} />
          <span className={styles.floatPixelDot} style={{ bottom: 7, left: 0 }} />
          <span className={styles.floatPixelDot} style={{ bottom: 7, left: 7 }} />
          <span className={styles.floatPixelDot} style={{ bottom: 14, left: 14 }} />
        </div>

        <div className={styles.ticketInnerChassis}>
          
          {/* ========================================================
              1. TOP HEADER HERO: CELESTIUS | LOC LOGO CAPSULE
              ======================================================== */}
          <div className={`${styles.headerBrandContainer} ${styles.animFadeDown}`}>
            <div className={styles.headerBrandChassis}>
              {/* Celestius Brand */}
              <a
                href="https://celestius.in"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.celestiusPillBadge}
                aria-label="Celestius website (opens in a new tab)"
              >
                <picture>
                  <source srcSet={celestiusLogoWebp} type="image/webp" />
                  <img
                    src={celestiusLogoPng}
                    alt="Celestius"
                    className={styles.celestiusLogoImg}
                  />
                </picture>
              </a>

              {/* Glowing Amber Vertical Divider */}
              <div className={styles.headerVerticalDivider} />

              {/* LOC Event Brand Logo */}
              <div className={styles.locLogoBox}>
                <picture>
                  <source srcSet={locLogoWebp} type="image/webp" />
                  <img
                    src={locLogoPng}
                    alt="LARPER OR CODER"
                    className={styles.locLogoImg}
                  />
                </picture>
              </div>
            </div>
          </div>

          {/* ========================================================
              2. SUB-HEADER: LOC ORGANISER DESK + ROSTER LINK + LOGOUT
              ======================================================== */}
          <div className={`${styles.subHeaderRow} ${styles.animSlideIn}`}>
            <div className={styles.subHeaderLeft}>
              <span className={styles.officialDeskTitle}>LOC ORGANISER</span>
              <span className={styles.officialDeskSubtitle}>ATTENDANCE CONTROL DESK</span>
            </div>

            {authenticatedPasskey && (
              <div className={styles.subHeaderActionsRow}>
                <a
                  href="/admin/roster"
                  className={styles.viewRosterButton}
                  title="View Full Live Attendance Roster"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <span>Live Roster</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={handleLogout}
                  title="Log Out of Organiser Desk"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              STAGE 1: 6-DIGIT PASSKEY GATE (LOGIN)
              ======================================================== */}
          {!authenticatedPasskey ? (
            <div className={`${styles.cardBlock} ${styles.animCascade1}`}>
              <div className={styles.cardTabTag}>
                <span className={styles.tabSlash}>//</span>
                <span>DESK SECURITY GATE</span>
                <span className={styles.tabSlash}>//</span>
              </div>
              <div className={styles.cyberCardWrapper}>
                <div className={styles.cyberCardInnerPasskey}>
                  <div className={styles.lockIconWrap}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F26B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>

                  <h2 className={styles.gateTitle}>ENTER 6-DIGIT PASSKEY</h2>
                  <p className={styles.gateDescription}>
                    Restricted to authorized Celestius event organizers. Please enter the desk security passkey to unlock attendance marking.
                  </p>

                  <form onSubmit={handlePasskeyLogin} className={styles.passkeyForm}>
                    <input
                      type="password"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={styles.passkeyInputElement}
                      placeholder="******"
                      value={passkeyInput}
                      onChange={(e) => setPasskeyInput(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      autoComplete="one-time-code"
                    />

                    {authError && <p className={styles.gateErrorMessage}>{authError}</p>}

                    <button
                      type="submit"
                      className={styles.amberActionButton}
                      disabled={checkingAuth || passkeyInput.length !== 6}
                    >
                      {checkingAuth ? 'Verifying Passkey...' : 'Unlock Organiser Desk'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               STAGE 2: AUTHENTICATED SCANNER DESK
               ======================================================== */
            <>
              {/* If no duo is currently loaded, show scanner interface */}
              {!currentDuo && (
                <>
                  {/* Mode Tabs: Camera vs Manual Code */}
                  <div className={`${styles.modeTabsRow} ${styles.animCascade2}`}>
                    <button
                      type="button"
                      className={`${styles.modeTabButton} ${activeTab === 'camera' ? styles.modeTabActive : ''}`}
                      onClick={() => setActiveTab('camera')}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>Camera Scanner</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.modeTabButton} ${activeTab === 'manual' ? styles.modeTabActive : ''}`}
                      onClick={() => {
                        setActiveTab('manual');
                        if (!rosterTeams.length && authenticatedPasskey) {
                          loadRoster(authenticatedPasskey);
                        }
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>Search & Code</span>
                    </button>
                  </div>

                  {/* Loading Duo Query */}
                  {fetchingDuo && (
                    <div className={styles.stateNoticeBox}>
                      <p className={styles.stateNoticeText}>
                        Retrieving duo registration information...
                      </p>
                    </div>
                  )}

                  {/* Error Banner */}
                  {duoError && (
                    <div className={styles.errorNoticeBox}>
                      <p className={styles.errorTitle}>{duoError}</p>
                      <button
                        type="button"
                        className={styles.clearRetryButton}
                        onClick={() => setDuoError(null)}
                      >
                        Clear and try again
                      </button>
                    </div>
                  )}

                  {/* CAMERA SCANNER TAB */}
                  {activeTab === 'camera' && !fetchingDuo && (
                    <div className={`${styles.cardBlock} ${styles.animCascade3}`}>
                      <div className={styles.cardTabTag}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span>CAMERA SCANNER</span>
                      </div>
                      <div className={styles.cyberCardWrapper}>
                        <div className={styles.cyberCardInnerCamera}>
                          <div id="qr-reader" style={{ width: '100%' }} />

                          {!cameraRunning && (
                            <div className={styles.cameraPromptContainer}>
                              <div className={styles.cameraPromptIconPulse}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                  <circle cx="12" cy="13" r="4" />
                                </svg>
                              </div>
                              <p className={styles.cameraPromptText}>
                                Tap below to open device camera and scan participant entry passes.
                              </p>
                              {cameraError && (
                                <p className={styles.cameraErrorMessage}>{cameraError}</p>
                              )}
                              <button
                                type="button"
                                className={styles.greenActionButton}
                                onClick={startCamera}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>Open Camera Scanner</span>
                              </button>
                            </div>
                          )}

                          {cameraRunning && (
                            <div className={styles.cameraActiveControls}>
                              <div className={styles.scanningPulsePill}>
                                <span className={styles.pulseGreenDot} />
                                Point camera at Entry Pass QR
                              </div>
                              <button
                                type="button"
                                className={styles.cameraStopButton}
                                onClick={stopCamera}
                              >
                                Close Camera
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MANUAL SEARCH & QUICK ATTENDANCE TAB */}
                  {activeTab === 'manual' && !fetchingDuo && (
                    <div className={`${styles.cardBlock} ${styles.animCascade3}`}>
                      <div className={styles.cardTabTag}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>SEARCH & MARK ATTENDANCE</span>
                      </div>
                      <div className={styles.cyberCardWrapper}>
                        <div className={styles.cyberCardInnerSearch}>
                          {/* Search Input Bar */}
                          <form onSubmit={handleSearchSubmit} className={styles.searchBarForm}>
                            <div className={styles.searchInputWrapper}>
                              <svg
                                className={styles.searchBarIcon}
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                aria-hidden="true"
                              >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                              <input
                                type="text"
                                className={styles.searchBarInput}
                                placeholder="Search by team, member, or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                              />
                              {searchQuery && (
                                <button
                                  type="button"
                                  className={styles.clearSearchButton}
                                  onClick={() => setSearchQuery('')}
                                  aria-label="Clear search query"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </form>

                          {/* Quick Filter Chips Bar */}
                          <div className={styles.filterStatsBar}>
                            <div className={styles.filterChipsRow}>
                              <button
                                type="button"
                                className={`${styles.filterChip} ${statusFilter === 'all' ? styles.filterChipActive : ''}`}
                                onClick={() => setStatusFilter('all')}
                              >
                                All ({rosterTeams.length})
                              </button>
                              <button
                                type="button"
                                className={`${styles.filterChip} ${statusFilter === 'needs_workshop' ? styles.filterChipActive : ''}`}
                                onClick={() => setStatusFilter('needs_workshop')}
                              >
                                Need Workshop
                              </button>
                              <button
                                type="button"
                                className={`${styles.filterChip} ${statusFilter === 'needs_competition' ? styles.filterChipActive : ''}`}
                                onClick={() => setStatusFilter('needs_competition')}
                              >
                                Need Competition
                              </button>
                            </div>

                            <button
                              type="button"
                              className={styles.syncRefreshButton}
                              onClick={() => loadRoster()}
                              title="Refresh teams list"
                              aria-label="Refresh roster"
                              disabled={loadingRoster}
                            >
                              {loadingRoster ? '...' : '↻'}
                            </button>
                          </div>

                          {/* Search Results / Scrollable Teams List */}
                          <div className={styles.teamsResultsScroll}>
                            {loadingRoster && rosterTeams.length === 0 ? (
                              <div className={styles.rosterLoadingState}>
                                <div className={styles.rosterLoadingSpinner} />
                                <p>Loading confirmed teams...</p>
                              </div>
                            ) : rosterError ? (
                              <div className={styles.rosterErrorState}>
                                <p>{rosterError}</p>
                                <button
                                  type="button"
                                  className={styles.clearRetryButton}
                                  onClick={() => loadRoster()}
                                >
                                  Retry loading teams
                                </button>
                              </div>
                            ) : filteredTeams.length === 0 ? (
                              <div className={styles.emptyResultsState}>
                                <p>No teams matching &ldquo;{searchQuery}&rdquo;</p>
                                <button
                                  type="button"
                                  className={styles.resetSearchLink}
                                  onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                  }}
                                >
                                  Reset filters
                                </button>
                              </div>
                            ) : (
                              filteredTeams.map((team) => {
                                const isWorkshopDone = team.workshopStatus === 'attended';
                                const isCompDone = team.competitionStatus === 'attended';
                                const isMarkingWorkshop = markingTeamKey === `${team.regCode}-workshop`;
                                const isMarkingComp = markingTeamKey === `${team.regCode}-competition`;

                                return (
                                  <div key={team.regCode} className={styles.teamResultCard}>
                                    {/* Card Header: Team Name & Reg Code + Pass Button */}
                                    <div className={styles.teamCardTopRow}>
                                      <div className={styles.teamCardMeta}>
                                        <span className={styles.teamCardName}>{team.teamName}</span>
                                        <span className={styles.teamCardCodeBadge}>{team.regCode}</span>
                                      </div>
                                      <button
                                        type="button"
                                        className={styles.inspectPassButton}
                                        onClick={() => handleScannedCode(team.regCode)}
                                        title="Open full duo ticket"
                                      >
                                        Pass ↗
                                      </button>
                                    </div>

                                    {/* Card Members (Compact Inline) */}
                                    <div className={styles.teamCardMembersRow}>
                                      <span className={styles.memberPrefixIcon}>👥</span>
                                      <span className={styles.memberTextName}>
                                        {team.mem1Name} <span className={styles.memberDivider}>•</span> {team.mem2Name}
                                      </span>
                                    </div>

                                    {/* Card Attendance Controls: 2 Columns Side-by-Side */}
                                    <div className={styles.teamCardAttendanceRow}>
                                      {/* Workshop Button / Badge */}
                                      {isWorkshopDone ? (
                                        <div className={styles.attendanceDoneBadge}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                          <span>✓ Workshop</span>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className={styles.markWorkshopDirectButton}
                                          onClick={() => handleDirectCardMark(team, 'workshop')}
                                          disabled={Boolean(markingTeamKey)}
                                        >
                                          {isMarkingWorkshop ? 'Marking...' : '+ Workshop'}
                                        </button>
                                      )}

                                      {/* Competition Button / Badge */}
                                      {isCompDone ? (
                                        <div className={styles.attendanceDoneBadge}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                          <span>✓ Competition</span>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className={styles.markCompDirectButton}
                                          onClick={() => handleDirectCardMark(team, 'competition')}
                                          disabled={Boolean(markingTeamKey)}
                                        >
                                          {isMarkingComp ? 'Marking...' : '+ Competition'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ========================================================
                  STAGE 3: SCANNED DUO PASS CARD & ATTENDANCE ACTIONS
                  ======================================================== */}
              {currentDuo && (
                <>
                  {/* Duo Hero Box */}
                  <div className={`${styles.cardBlock} ${styles.animCascade1}`}>
                    <div className={styles.cardTabTag}>
                      <span className={styles.tabSlash}>//</span>
                      <span>CONFIRMED DUO ENTRY</span>
                      <span className={styles.tabSlash}>//</span>
                    </div>
                    <div className={styles.cyberCardWrapper}>
                      <div className={styles.cyberCardInnerDuo}>
                        <div className={styles.duoNameText}>{currentDuo.teamName}</div>
                        <div className={styles.duoRegCodePill}>{currentDuo.regCode}</div>
                      </div>
                    </div>
                  </div>

                  {/* Duo Members */}
                  <div className={`${styles.sectionCluster} ${styles.animCascade2}`}>
                    <div className={styles.codersGridRow}>
                      {currentDuo.members?.map((m, idx) => (
                        <div key={idx} className={styles.cardBlock}>
                          <div className={styles.cardTabTag}>
                            <span>{m.role === 'leader' || idx === 0 ? 'MEMBER 1 (LEADER)' : 'MEMBER 2'}</span>
                          </div>
                          <div className={styles.cyberCardWrapper}>
                            <div className={styles.cyberCardInnerCoder}>
                              <div className={styles.coderName}>{m.name}</div>
                              <div className={styles.coderDept}>{m.department || 'CSE'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Controls */}
                  <div className={`${styles.cardBlock} ${styles.animCascade3}`}>
                    <div className={styles.cardTabTag}>
                      <span>ATTENDANCE CHECK-IN DESK</span>
                    </div>
                    <div className={styles.cyberCardWrapper}>
                      <div className={styles.cyberCardInnerAttendance}>
                        {/* Workshop Check-In Item */}
                        <div className={styles.attendanceActionRow}>
                          <div className={styles.attendanceRowMeta}>
                            <span className={styles.roundTitleText}>Workshop: The Training Arc</span>
                            <span className={styles.roundStatusText}>
                              Status:{' '}
                              {currentDuo.attendance?.workshop?.attended || currentDuo.attendance?.round1?.attended ? (
                                <span className={styles.statusMarked}>Marked</span>
                              ) : (
                                <span className={styles.statusNotMarked}>Not Marked</span>
                              )}
                            </span>
                          </div>

                          {currentDuo.attendance?.workshop?.attended || currentDuo.attendance?.round1?.attended ? (
                            <span className={styles.checkedInBadge}>
                              Marked
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.markRoundButton}
                              onClick={() => handleMarkRound('workshop')}
                              disabled={markingAttendance || markedRoundInSession !== null}
                            >
                              {markingAttendance && markedRoundInSession === 'workshop'
                                ? 'Recording...'
                                : 'Mark Workshop'}
                            </button>
                          )}
                        </div>

                        <div className={styles.attendanceDivider} />

                        {/* Competition Check-In Item */}
                        <div className={styles.attendanceActionRow}>
                          <div className={styles.attendanceRowMeta}>
                            <span className={styles.roundTitleText}>Competition: TLE</span>
                            <span className={styles.roundStatusText}>
                              Status:{' '}
                              {currentDuo.attendance?.competition?.attended || currentDuo.attendance?.round2?.attended ? (
                                <span className={styles.statusMarked}>Marked</span>
                              ) : (
                                <span className={styles.statusNotMarked}>Not Marked</span>
                              )}
                            </span>
                          </div>

                          {currentDuo.attendance?.competition?.attended || currentDuo.attendance?.round2?.attended ? (
                            <span className={styles.checkedInBadge}>
                              Marked
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.markRoundButton}
                              onClick={() => handleMarkRound('competition')}
                              disabled={markingAttendance || markedRoundInSession !== null}
                            >
                              {markingAttendance && markedRoundInSession === 'competition'
                                ? 'Recording...'
                                : 'Mark Competition'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notice when attendance was recorded */}
                  {markedRoundInSession && (
                    <div className={`${styles.sessionLockedNotice} ${styles.animCascade4}`}>
                      Attendance for {markedRoundInSession === 'workshop' ? 'The Training Arc (Workshop)' : 'TLE (Competition)'} recorded successfully. To scan the next duo, tap below.
                    </div>
                  )}

                  {/* Scan Next Pass Button */}
                  <button
                    type="button"
                    className={`${styles.scanNextButton} ${styles.animCascade5}`}
                    onClick={handleScanNext}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    <span>Scan Next Pass</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* ========================================================
              FOOTER ROW
              ======================================================== */}
          <div className={`${styles.footerRowBar} ${styles.animCascade6}`}>
            <a href="/" className={styles.returnHomeLink}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Return to Main Website</span>
            </a>

            <div className={styles.footerHazardSlashes}>
              <span className={styles.hazardSlashBar} />
              <span className={styles.hazardSlashBar} />
              <span className={styles.hazardSlashBar} />
            </div>

            <span className={styles.footerBrandFootprint}>Celestius LOC Desk 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
}
