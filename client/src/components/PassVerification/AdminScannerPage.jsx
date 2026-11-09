// client/src/components/PassVerification/AdminScannerPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './AdminScanner.module.css';
import { verifyPass, checkInAttendance, verifyAdminPasskey } from '../../services/api.js';
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
  const [markedBy, setMarkedBy] = useState('Desk Organiser');

  // Camera State
  const [cameraRunning, setCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);

  // Scanned Duo Pass State
  const [currentDuo, setCurrentDuo] = useState(null);
  const [fetchingDuo, setFetchingDuo] = useState(false);
  const [duoError, setDuoError] = useState(null);

  // Session-bound round marking restriction
  const [markedRoundInSession, setMarkedRoundInSession] = useState(null); // 'round1' | 'round2' | null
  const [markingAttendance, setMarkingAttendance] = useState(false);

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
      setDuoError(err.message || 'No confirmed pass found for this code.');
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
              2. SUB-HEADER: LOC ORGANISER DESK + STATUS BADGE + LOGOUT
              ======================================================== */}
          <div className={`${styles.subHeaderRow} ${styles.animSlideIn}`}>
            <div className={styles.subHeaderLeft}>
              <span className={styles.officialDeskTitle}>LOC ORGANISER</span>
              <span className={styles.officialDeskSubtitle}>ATTENDANCE CONTROL DESK</span>
            </div>

            <div className={styles.subHeaderRight}>
              <span className={authenticatedPasskey ? styles.statusOnlineBadge : styles.statusLockedBadge}>
                <span className={styles.statusDot} />
                {authenticatedPasskey ? 'DESK ONLINE' : 'LOCKED'}
              </span>

              {authenticatedPasskey && (
                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              )}
            </div>
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
              {/* Desk Staff Meta */}
              <div className={`${styles.cardBlock} ${styles.animCascade1}`}>
                <div className={styles.cardTabTag}>
                  <span>ACTIVE ORGANISER DESK</span>
                </div>
                <div className={styles.cyberCardWrapper}>
                  <div className={styles.cyberCardInnerMeta}>
                    <div className={styles.deskMetaInfo}>
                      <span className={styles.deskMetaLabel}>Active Station Staff</span>
                      <div className={styles.deskMetaValue}>{markedBy}</div>
                    </div>
                    <input
                      type="text"
                      value={markedBy}
                      onChange={(e) => setMarkedBy(e.target.value)}
                      className={styles.deskStaffInput}
                      placeholder="Staff Name"
                    />
                  </div>
                </div>
              </div>

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
                      onClick={() => setActiveTab('manual')}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
                      </svg>
                      <span>Manual Code</span>
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

                  {/* MANUAL CODE ENTRY TAB */}
                  {activeTab === 'manual' && !fetchingDuo && (
                    <div className={`${styles.cardBlock} ${styles.animCascade3}`}>
                      <div className={styles.cardTabTag}>
                        <span>MANUAL CODE ENTRY</span>
                      </div>
                      <div className={styles.cyberCardWrapper}>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleScannedCode(manualCode);
                          }}
                          className={styles.cyberCardInnerManual}
                        >
                          <input
                            type="text"
                            className={styles.manualCodeInput}
                            placeholder="e.g. TEAM-6CDC4E"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            autoFocus
                          />
                          <button
                            type="submit"
                            className={styles.amberActionButton}
                            disabled={!manualCode.trim()}
                          >
                            Fetch Duo Pass
                          </button>
                        </form>
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
                        {/* Round 1 Check-In Item */}
                        <div className={styles.attendanceActionRow}>
                          <div className={styles.attendanceRowMeta}>
                            <span className={styles.roundTitleText}>Round 1: The Training Arc</span>
                            <span className={styles.roundStatusText}>
                              Status:{' '}
                              {currentDuo.attendance?.round1?.attended ? (
                                <span className={styles.statusMarked}>Marked</span>
                              ) : (
                                <span className={styles.statusNotMarked}>Not Marked</span>
                              )}
                            </span>
                          </div>

                          {currentDuo.attendance?.round1?.attended ? (
                            <span className={styles.checkedInBadge}>
                              Marked
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.markRoundButton}
                              onClick={() => handleMarkRound('round1')}
                              disabled={markingAttendance || markedRoundInSession !== null}
                            >
                              {markingAttendance && markedRoundInSession === 'round1'
                                ? 'Recording...'
                                : 'Mark Round 1'}
                            </button>
                          )}
                        </div>

                        <div className={styles.attendanceDivider} />

                        {/* Round 2 Check-In Item */}
                        <div className={styles.attendanceActionRow}>
                          <div className={styles.attendanceRowMeta}>
                            <span className={styles.roundTitleText}>Round 2: TLE</span>
                            <span className={styles.roundStatusText}>
                              Status:{' '}
                              {currentDuo.attendance?.round2?.attended ? (
                                <span className={styles.statusMarked}>Marked</span>
                              ) : (
                                <span className={styles.statusNotMarked}>Not Marked</span>
                              )}
                            </span>
                          </div>

                          {currentDuo.attendance?.round2?.attended ? (
                            <span className={styles.checkedInBadge}>
                              Marked
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.markRoundButton}
                              onClick={() => handleMarkRound('round2')}
                              disabled={markingAttendance || markedRoundInSession !== null}
                            >
                              {markingAttendance && markedRoundInSession === 'round2'
                                ? 'Recording...'
                                : 'Mark Round 2'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notice when attendance was recorded */}
                  {markedRoundInSession && (
                    <div className={`${styles.sessionLockedNotice} ${styles.animCascade4}`}>
                      Attendance for {markedRoundInSession === 'round1' ? 'Round 1' : 'Round 2'} recorded successfully. To scan the next duo, tap below.
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
