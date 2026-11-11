// client/src/components/PassVerification/AdminPassGeneratorPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './AdminPassGenerator.module.css';
import celestiusLogoWebp from '../../assets/celestius-transparent.webp';
import celestiusLogoPng from '../../assets/celestius-transparent.png';
import locLogoWebp from '../../assets/logo-navbar.webp';
import locLogoPng from '../../assets/logo-navbar.png';
import { verifyAdminPasskey, getAttendanceRoster, lookupAdminPass } from '../../services/api.js';
import { generatePassCanvas, downloadPassImage, downloadPassPdf } from '../../services/passGenerator.js';

export default function AdminPassGeneratorPage() {
  // Passkey security gate (shared with /admin/scan and /admin/roster)
  const [passkeyInput, setPasskeyInput] = useState('');
  const [authenticatedPasskey, setAuthenticatedPasskey] = useState(
    () => sessionStorage.getItem('loc_admin_passkey') || ''
  );
  const [authError, setAuthError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Confirmed teams cache for instant live filtering
  const [rosterTeams, setRosterTeams] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Lookup state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  // Selected team & generated preview state
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null); // 'png' | 'pdf' | 'share' | null
  const [copiedLink, setCopiedLink] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  // Unlock full-page vertical scroll cleanly
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

  // Check Web Share file support (mobile WhatsApp / Share Sheet)
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const testFile = new File([''], 'test.png', { type: 'image/png' });
        setCanShareFiles(navigator.canShare({ files: [testFile] }));
      }
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  const loadRoster = useCallback(async (key) => {
    const activeKey = key || authenticatedPasskey;
    if (!activeKey) return;
    try {
      setLoadingRoster(true);
      const res = await getAttendanceRoster(activeKey);
      if (res.success && Array.isArray(res.teams)) {
        setRosterTeams(
          res.teams.map((t) => ({
            regCode: t.regCode,
            teamName: t.teamName,
            members: [
              { name: t.mem1Name, role: 'leader' },
              { name: t.mem2Name, role: 'member' },
            ],
          }))
        );
      }
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.removeItem('loc_admin_passkey');
        setAuthenticatedPasskey('');
      }
    } finally {
      setLoadingRoster(false);
    }
  }, [authenticatedPasskey]);

  useEffect(() => {
    if (authenticatedPasskey) {
      loadRoster(authenticatedPasskey);
    }
  }, [authenticatedPasskey, loadRoster]);

  // Generate high-res pass preview whenever selectedTeam changes
  useEffect(() => {
    let active = true;
    if (!selectedTeam) {
      setPreviewUrl('');
      return;
    }

    async function renderPreview() {
      try {
        setGeneratingPreview(true);
        const canvas = await generatePassCanvas({
          regCode: selectedTeam.regCode,
          teamName: selectedTeam.teamName,
          members: selectedTeam.members,
        });
        if (active) {
          setPreviewUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Pass preview generation error:', err);
        if (active) setLookupError('Unable to render pass preview.');
      } finally {
        if (active) setGeneratingPreview(false);
      }
    }

    renderPreview();
    return () => {
      active = false;
    };
  }, [selectedTeam]);

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
      await loadRoster(cleanKey);
    } catch (err) {
      setAuthError(err.message || 'Invalid security passkey. Access denied.');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('loc_admin_passkey');
    setAuthenticatedPasskey('');
    setRosterTeams([]);
    setSelectedTeam(null);
    setLookupResults(null);
    setQuery('');
  };

  // Enrich team via /admin/pass-lookup so member phones/emails are loaded if picked from quick list
  const selectAndEnrichTeam = async (team) => {
    setSelectedTeam(team);
    setLookupError(null);
    setCopiedLink(false);

    if (team?.regCode && authenticatedPasskey && !team.members?.[0]?.phone) {
      try {
        const res = await lookupAdminPass(authenticatedPasskey, team.regCode);
        if (res.success && Array.isArray(res.teams) && res.teams.length > 0) {
          setSelectedTeam(res.teams[0]);
        }
      } catch {
        // Basic roster details still work for pass generation
      }
    }
  };

  const handleLookupSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setLookupError('Enter a team name or team code (e.g. TEAM-3F9A1C).');
      return;
    }

    try {
      setSearching(true);
      setLookupError(null);
      setCopiedLink(false);

      const res = await lookupAdminPass(authenticatedPasskey, trimmed);
      const matches = res.teams || [];
      setLookupResults(matches);

      if (matches.length === 0) {
        setSelectedTeam(null);
        setLookupError(`No confirmed registration found matching "${trimmed}".`);
      } else if (matches.length === 1) {
        setSelectedTeam(matches[0]);
      } else {
        // Auto-select exact match if present, otherwise let organiser pick from matches
        const upper = trimmed.toUpperCase().replace(/^#/, '');
        const exact = matches.find(
          (t) =>
            t.regCode?.toUpperCase() === upper ||
            t.regCode?.toUpperCase() === `TEAM-${upper}` ||
            t.teamName?.toLowerCase() === trimmed.toLowerCase()
        );
        if (exact) {
          setSelectedTeam(exact);
        }
      }
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.removeItem('loc_admin_passkey');
        setAuthenticatedPasskey('');
      }
      setLookupError(err.message || 'Lookup failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Live filtered suggestions from roster while typing
  const filteredQuickTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = lookupResults !== null ? lookupResults : rosterTeams;
    if (!q) return list;
    return list.filter(
      (t) =>
        t.teamName?.toLowerCase().includes(q) ||
        t.regCode?.toLowerCase().includes(q) ||
        t.members?.some((m) => m.name?.toLowerCase().includes(q))
    );
  }, [query, rosterTeams, lookupResults]);

  const handleDownloadPng = async () => {
    if (!selectedTeam || downloadingType) return;
    try {
      setDownloadingType('png');
      await downloadPassImage(selectedTeam);
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedTeam || downloadingType) return;
    try {
      setDownloadingType('pdf');
      await downloadPassPdf(selectedTeam);
    } finally {
      setDownloadingType(null);
    }
  };

  const handleSharePass = async () => {
    if (!selectedTeam || downloadingType || !navigator.share) return;
    try {
      setDownloadingType('share');
      const canvas = await generatePassCanvas(selectedTeam);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const cleanCode = (selectedTeam.regCode || 'TEAM').replace(/[^a-zA-Z0-9_-]/g, '');
      const file = new File([blob], `LOC_Entry_Pass_${cleanCode}.png`, { type: 'image/png' });
      const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(selectedTeam.regCode)}`;
      await navigator.share({
        title: `LARPER OR CODER Pass · ${selectedTeam.teamName}`,
        text: `Official Entry Pass for ${selectedTeam.teamName} (${selectedTeam.regCode}). Verify: ${verifyUrl}`,
        files: [file],
      });
    } catch {
      // User cancelled share or browser blocked
    } finally {
      setDownloadingType(null);
    }
  };

  const verifyUrl = selectedTeam
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://loc.celestius.in'}/verify/${encodeURIComponent(selectedTeam.regCode)}`
    : '';

  const handleCopyVerifyLink = async () => {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setLookupError('Clipboard copy unavailable; open or share the link manually.');
    }
  };

  const leaderPhone = selectedTeam?.members?.[0]?.phone?.replace(/\D/g, '').slice(-10) || '';
  const whatsappSendUrl =
    selectedTeam && leaderPhone.length === 10
      ? `https://wa.me/91${leaderPhone}?text=${encodeURIComponent(
          `Hi ${selectedTeam.members?.[0]?.name || 'coder'}! Here is your official LARPER OR CODER entry pass link for team "${selectedTeam.teamName}" (${selectedTeam.regCode}): ${verifyUrl}`
        )}`
      : '';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.ambientGrid} />
      <div className={styles.ambientGlow} />

      <div className={styles.outerWrapper}>
        <div className={styles.innerFrame}>
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
              <span className={styles.officialTitle}>LOC PASS DESK</span>
              <span className={styles.officialSubtitle}>RECOVER &amp; GENERATE OFFICIAL DUO PASSES</span>
            </div>

            <div className={styles.subHeaderActions}>
              <a href="/admin/scan" className={styles.navActionButton}>
                <span>Scanner Desk</span>
              </a>
              <a href="/admin/roster" className={styles.navActionButton}>
                <span>Live Roster</span>
              </a>
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
                  Enter the 6-digit organiser passkey to look up teams and regenerate entry passes.
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
                    {checkingAuth ? 'Verifying...' : 'Unlock Pass Generator'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.workspaceGrid}>
              {/* Left Column: Search + Confirmed Teams List */}
              <div className={styles.lookupColumn}>
                <form onSubmit={handleLookupSubmit} className={styles.searchCard}>
                  <label htmlFor="admin-pass-query" className={styles.cardLabel}>
                    FIND BY TEAM NAME OR TEAM CODE
                  </label>
                  <div className={styles.searchInputRow}>
                    <input
                      id="admin-pass-query"
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (lookupResults !== null) setLookupResults(null);
                        if (lookupError) setLookupError(null);
                      }}
                      placeholder="e.g. RuntimeTerrors or TEAM-3F9A1C"
                      className={styles.searchInput}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className={styles.searchSubmitBtn}
                      disabled={searching}
                    >
                      {searching ? 'Finding...' : 'Find Pass'}
                    </button>
                  </div>
                  {lookupError && <p className={styles.errorMessage}>{lookupError}</p>}
                </form>

                {/* Quick Pick / Search Results List */}
                <div className={styles.teamListCard}>
                  <div className={styles.teamListHeader}>
                    <span className={styles.cardLabel}>
                      {lookupResults !== null
                        ? `MATCHING DUOS (${filteredQuickTeams.length})`
                        : `CONFIRMED DUOS (${filteredQuickTeams.length})`}
                    </span>
                    {loadingRoster && <span className={styles.loadingTag}>Syncing...</span>}
                  </div>

                  <div className={styles.teamListScroll}>
                    {filteredQuickTeams.length > 0 ? (
                      filteredQuickTeams.map((team) => {
                        const isSelected = selectedTeam?.regCode === team.regCode;
                        return (
                          <button
                            key={team.regCode}
                            type="button"
                            onClick={() => selectAndEnrichTeam(team)}
                            className={`${styles.teamPickRow} ${isSelected ? styles.teamPickRowActive : ''}`}
                          >
                            <div className={styles.teamPickMain}>
                              <span className={styles.teamPickName}>{team.teamName}</span>
                              <span className={styles.teamPickMembers}>
                                {team.members?.[0]?.name || 'Player 1'} &amp; {team.members?.[1]?.name || 'Player 2'}
                              </span>
                            </div>
                            <span className={styles.teamPickCode}>{team.regCode}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className={styles.emptyListState}>
                        {loadingRoster ? 'Loading confirmed registrations...' : 'No confirmed teams match your search.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Pass Preview & Export/Send Controls */}
              <div className={styles.previewColumn}>
                {selectedTeam ? (
                  <div className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                      <div>
                        <span className={styles.previewEyebrow}>OFFICIAL ENTRY PASS</span>
                        <h2 className={styles.previewTeamTitle}>{selectedTeam.teamName}</h2>
                      </div>
                      <span className={styles.previewCodeBadge}>{selectedTeam.regCode}</span>
                    </div>

                    <div className={styles.membersSummaryRow}>
                      <div className={styles.memberChip}>
                        <span className={styles.memberRoleTag}>PLAYER 1</span>
                        <span className={styles.memberName}>{selectedTeam.members?.[0]?.name || 'Player 1'}</span>
                        {selectedTeam.members?.[0]?.phone && (
                          <span className={styles.memberContact}>{selectedTeam.members[0].phone}</span>
                        )}
                      </div>
                      <div className={styles.memberChip}>
                        <span className={styles.memberRoleTag}>PLAYER 2</span>
                        <span className={styles.memberName}>{selectedTeam.members?.[1]?.name || 'Player 2'}</span>
                        {selectedTeam.members?.[1]?.phone && (
                          <span className={styles.memberContact}>{selectedTeam.members[1].phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Canvas Image Preview */}
                    <div className={styles.canvasFrame}>
                      {generatingPreview ? (
                        <div className={styles.previewLoading}>Rendering Pass...</div>
                      ) : previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={`Entry pass for ${selectedTeam.teamName}`}
                          className={styles.passPreviewImg}
                        />
                      ) : null}
                    </div>

                    {/* Download & Share Actions */}
                    <div className={styles.actionsGrid}>
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        disabled={!!downloadingType || generatingPreview}
                        className={styles.primaryDownloadBtn}
                      >
                        {downloadingType === 'png' ? 'Generating PNG...' : 'Download PNG Pass'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={!!downloadingType || generatingPreview}
                        className={styles.secondaryActionBtn}
                      >
                        {downloadingType === 'pdf' ? 'Generating PDF...' : 'Download PDF Pass'}
                      </button>

                      {canShareFiles && (
                        <button
                          type="button"
                          onClick={handleSharePass}
                          disabled={!!downloadingType || generatingPreview}
                          className={styles.shareActionBtn}
                        >
                          {downloadingType === 'share' ? 'Opening Share...' : 'Share PNG File'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCopyVerifyLink}
                        className={styles.secondaryActionBtn}
                      >
                        {copiedLink ? 'Verify Link Copied' : 'Copy Verify Link'}
                      </button>

                      {whatsappSendUrl && (
                        <a
                          href={whatsappSendUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.whatsappSendBtn}
                        >
                          Send Link on WhatsApp (Player 1)
                        </a>
                      )}

                      <a
                        href={`/verify/${encodeURIComponent(selectedTeam.regCode)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.verifyOpenLink}
                      >
                        Open Public Verification Page &rarr;
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className={styles.placeholderCard}>
                    <div className={styles.placeholderIcon}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <rect x="7" y="8" width="5" height="5" />
                        <path d="M15 9h2M15 13h2M7 16h10" />
                      </svg>
                    </div>
                    <h3 className={styles.placeholderTitle}>Select or Search a Team</h3>
                    <p className={styles.placeholderText}>
                      Enter a team codename or team code (like TEAM-3F9A1C) on the left to generate and download their official PNG/PDF entry pass.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Bar */}
          <div className={styles.footerRowBar}>
            <a href="/" className={styles.returnHomeLink}>
              &larr; Return to LOC Home
            </a>
            <span className={styles.footerBrandText}>Celestius CIT 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
