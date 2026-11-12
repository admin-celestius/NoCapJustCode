// client/src/components/PassVerification/AttendanceRosterPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './AttendanceRoster.module.css';
import celestiusLogoWebp from '../../assets/celestius-transparent.webp';
import celestiusLogoPng from '../../assets/celestius-transparent.png';
import locLogoWebp from '../../assets/logo-navbar.webp';
import locLogoPng from '../../assets/logo-navbar.png';
import { verifyAdminPasskey, getAttendanceRoster, updateAdminSettings } from '../../services/api.js';

export default function AttendanceRosterPage() {
  // Passkey security gate
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authenticatedPasskey, setAuthenticatedPasskey] = useState(
    () => sessionStorage.getItem('loc_admin_passkey') || ''
  );
  const [authError, setAuthError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Roster data
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ total: 0, workshopAttended: 0, competitionAttended: 0 });
  const [eventSettings, setEventSettings] = useState({ promoActive: true, registrationsClosed: false });
  const [savingSetting, setSavingSetting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'WORKSHOP' | 'COMPETITION' | 'BOTH' | 'NONE'

  // Fetch roster with passkey
  const fetchRoster = useCallback(async (key) => {
    const activeKey = key || authenticatedPasskey;
    if (!activeKey) return;

    try {
      setLoading(true);
      setError(null);
      const res = await getAttendanceRoster(activeKey);
      if (res.success && Array.isArray(res.teams)) {
        setTeams(res.teams);
        setStats({
          total: res.totalTeams || res.teams.length,
          workshopAttended: res.workshopAttendedCount || 0,
          competitionAttended: res.competitionAttendedCount || 0,
        });
        if (res.settings) {
          setEventSettings({
            promoActive: res.settings.promoActive ?? true,
            registrationsClosed: Boolean(res.settings.registrationsClosed),
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance roster.');
      if (err.status === 401) {
        sessionStorage.removeItem('loc_admin_passkey');
        setAuthenticatedPasskey('');
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedPasskey]);

  // Initial load if passkey is already in sessionStorage
  useEffect(() => {
    if (authenticatedPasskey) {
      fetchRoster(authenticatedPasskey);
    }
  }, [authenticatedPasskey, fetchRoster]);

  // Passkey Login Submit
  const handlePasskeyLogin = async (e) => {
    e?.preventDefault();
    const cleanKey = passkeyInput.trim();
    if (!cleanKey || cleanKey.length !== 6) {
      setAuthError('Please enter a valid 6-digit security passkey.');
      return;
    }

    try {
      setCheckingAuth(true);
      setAuthError(null);
      await verifyAdminPasskey(cleanKey);
      sessionStorage.setItem('loc_admin_passkey', cleanKey);
      setAuthenticatedPasskey(cleanKey);
      setPasskeyInput('');
      await fetchRoster(cleanKey);
    } catch (err) {
      setAuthError(err.message || 'Invalid security passkey. Access denied.');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('loc_admin_passkey');
    setAuthenticatedPasskey('');
    setTeams([]);
  };

  const handleToggleSetting = async (field) => {
    if (!authenticatedPasskey || savingSetting) return;
    const nextValue = !eventSettings[field];

    if (field === 'registrationsClosed') {
      const confirmMsg = nextValue
        ? 'Close all student registrations? Every Register button on the site will be disabled and new checkouts will be blocked.'
        : 'Reopen student registrations across the site?';
      if (!window.confirm(confirmMsg)) return;
    }

    try {
      setSavingSetting(field);
      setError(null);
      const res = await updateAdminSettings(authenticatedPasskey, { [field]: nextValue });
      if (res.success && res.settings) {
        setEventSettings({
          promoActive: res.settings.promoActive ?? true,
          registrationsClosed: Boolean(res.settings.registrationsClosed),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to update event setting.');
      if (err.status === 401) {
        sessionStorage.removeItem('loc_admin_passkey');
        setAuthenticatedPasskey('');
      }
    } finally {
      setSavingSetting(null);
    }
  };

  // Filtered and searched list
  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teams.filter((team) => {
      // Search matches
      const matchesSearch =
        !q ||
        team.teamName?.toLowerCase().includes(q) ||
        team.mem1Name?.toLowerCase().includes(q) ||
        team.mem2Name?.toLowerCase().includes(q) ||
        team.regCode?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter modes
      if (filterMode === 'WORKSHOP') return team.workshopStatus === 'attended';
      if (filterMode === 'COMPETITION') return team.competitionStatus === 'attended';
      if (filterMode === 'BOTH') {
        return team.workshopStatus === 'attended' && team.competitionStatus === 'attended';
      }
      if (filterMode === 'NONE') {
        return team.workshopStatus !== 'attended' && team.competitionStatus !== 'attended';
      }
      return true;
    });
  }, [teams, searchQuery, filterMode]);

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.ambientGrid} />
      <div className={styles.ambientGlow} />

      <div className={styles.rosterOuterWrapper}>
        <div className={styles.rosterInnerFrame}>
          {/* Top Brand Capsule */}
          <div className={styles.headerBrandContainer}>
            <div className={styles.headerBrandChassis}>
              <a
                href="https://celestius.in"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.celestiusPillBadge}
                aria-label="Celestius website"
              >
                <picture>
                  <source srcSet={celestiusLogoWebp} type="image/webp" />
                  <img src={celestiusLogoPng} alt="Celestius" className={styles.celestiusLogoImg} />
                </picture>
              </a>

              <div className={styles.headerVerticalDivider} />

              <div className={styles.locLogoBox}>
                <picture>
                  <source srcSet={locLogoWebp} type="image/webp" />
                  <img src={locLogoPng} alt="LARPER OR CODER" className={styles.locLogoImg} />
                </picture>
              </div>
            </div>
          </div>

          {/* Sub Header */}
          <div className={styles.subHeaderRow}>
            <div className={styles.subHeaderLeft}>
              <span className={styles.officialTitle}>LOC ATTENDANCE ROSTER</span>
              <span className={styles.officialSubtitle}>CONFIRMED DUOS LIVE CHECK-IN STATUS</span>
            </div>

            <div className={styles.subHeaderActions}>
              <a href="/admin/scan" className={styles.navActionButton}>
                <span>Scanner Desk</span>
              </a>
              <a href="/admin/pass" className={styles.navActionButton}>
                <span>Pass Desk</span>
              </a>

              {authenticatedPasskey && (
                <>
                  <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={() => fetchRoster()}
                    disabled={loading}
                    title="Refresh attendance records"
                  >
                    <span>{loading ? 'Refreshing...' : '↻ Refresh'}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Passkey Security Gate */}
          {!authenticatedPasskey ? (
            <div className={styles.securityGateWrapper}>
              <div className={styles.gateCard}>
                <div className={styles.lockIconWrap}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFAE19" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <h2 className={styles.gateTitle}>SECURITY PASSKEY REQUIRED</h2>
                <p className={styles.gateDescription}>
                  Enter the 6-digit organiser passkey to view the live attendance roster.
                </p>

                <form onSubmit={handlePasskeyLogin} className={styles.passkeyForm}>
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={styles.passkeyInput}
                    placeholder="******"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    autoComplete="one-time-code"
                  />

                  {authError && <p className={styles.errorMessage}>{authError}</p>}

                  <button
                    type="submit"
                    className={styles.submitGateButton}
                    disabled={checkingAuth || passkeyInput.length !== 6}
                  >
                    {checkingAuth ? 'Verifying...' : 'Unlock Attendance Roster'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Total Duos</span>
                  <span className={styles.statNumber}>{stats.total}</span>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Workshop</span>
                  <span className={`${styles.statNumber} ${styles.statHighlight}`}>
                    {stats.workshopAttended} / {stats.total}
                  </span>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Competition</span>
                  <span className={`${styles.statNumber} ${styles.statGreen}`}>
                    {stats.competitionAttended} / {stats.total}
                  </span>
                </div>
              </div>

              {/* Event Controls */}
              <div className={styles.controlsRow}>
                <div className={styles.controlCard}>
                  <div className={styles.controlInfo}>
                    <span className={styles.controlTitle}>NATIONAL EDUCATION DAY OFFER</span>
                    <span className={styles.controlSubtitle}>
                      {eventSettings.promoActive
                        ? 'Active · ₹199 duo pricing & promo popup enabled'
                        : 'Disabled · Regular ₹298 duo pricing active'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.controlToggleBtn} ${
                      eventSettings.promoActive ? styles.controlBtnAmber : styles.controlBtnMuted
                    }`}
                    onClick={() => handleToggleSetting('promoActive')}
                    disabled={savingSetting !== null}
                  >
                    {savingSetting === 'promoActive'
                      ? 'Saving...'
                      : eventSettings.promoActive
                      ? 'Disable Offer'
                      : 'Enable Offer'}
                  </button>
                </div>

                <div className={styles.controlCard}>
                  <div className={styles.controlInfo}>
                    <span className={styles.controlTitle}>STUDENT REGISTRATIONS</span>
                    <span className={styles.controlSubtitle}>
                      {eventSettings.registrationsClosed
                        ? 'Closed · Register buttons disabled & checkout blocked'
                        : 'Open · Students can register normally'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.controlToggleBtn} ${
                      eventSettings.registrationsClosed ? styles.controlBtnGreen : styles.controlBtnDanger
                    }`}
                    onClick={() => handleToggleSetting('registrationsClosed')}
                    disabled={savingSetting !== null}
                  >
                    {savingSetting === 'registrationsClosed'
                      ? 'Updating...'
                      : eventSettings.registrationsClosed
                      ? 'Reopen Registrations'
                      : 'Close Registrations'}
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className={styles.filterBar}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search team or participant name..."
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.filterPills}>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'WORKSHOP', label: 'Workshop Attended' },
                    { id: 'COMPETITION', label: 'Competition Attended' },
                    { id: 'BOTH', label: 'Both' },
                    { id: 'NONE', label: 'Pending Both' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`${styles.filterPill} ${filterMode === tab.id ? styles.filterPillActive : ''}`}
                      onClick={() => setFilterMode(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className={styles.errorMessage}>{error}</p>}

              {/* Table View */}
              <div className={styles.tableWrapper}>
                <table className={styles.rosterTable}>
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Member 1 Name</th>
                      <th>Member 2 Name</th>
                      <th>Workshop Status</th>
                      <th>Competition Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.length > 0 ? (
                      filteredTeams.map((team, idx) => (
                        <tr key={team.regCode || idx}>
                          <td>
                            <div className={styles.teamNameCell}>
                              <span>{team.teamName}</span>
                              <span className={styles.regCodeMini}>#{team.regCode}</span>
                            </div>
                          </td>
                          <td className={styles.memberNameCell}>{team.mem1Name}</td>
                          <td className={styles.memberNameCell}>{team.mem2Name}</td>
                          <td>
                            {team.workshopStatus === 'attended' ? (
                              <span className={styles.statusBadgeAttended}>
                                <span className={styles.statusDotGreen} />
                                <span>attended</span>
                              </span>
                            ) : (
                              <span className={styles.statusBadgeNotAttended}>
                                <span className={styles.statusDotDim} />
                                <span>not_attended</span>
                              </span>
                            )}
                          </td>
                          <td>
                            {team.competitionStatus === 'attended' ? (
                              <span className={styles.statusBadgeAttended}>
                                <span className={styles.statusDotGreen} />
                                <span>attended</span>
                              </span>
                            ) : (
                              <span className={styles.statusBadgeNotAttended}>
                                <span className={styles.statusDotDim} />
                                <span>not_attended</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={styles.emptyStateBlock}>
                          {loading ? 'Fetching attendance records...' : 'No matching teams found in roster.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
