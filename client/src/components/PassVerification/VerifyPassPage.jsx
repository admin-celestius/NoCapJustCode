// client/src/components/PassVerification/VerifyPassPage.jsx
import React, { useEffect, useState } from 'react';
import styles from './VerifyPass.module.css';
import { verifyPass } from '../../services/api.js';
import celestiusLogoWebp from '../../assets/celestius-transparent.webp';
import celestiusLogoPng from '../../assets/celestius-transparent.png';
import locLogoWebp from '../../assets/logo-transparent.webp';
import locLogoPng from '../../assets/logo-transparent.png';
import { ORGANISERS, WHATSAPP_GROUP_URL } from '../../data/event.js';

const DEFAULT_ORGANISERS = ORGANISERS;

function OrganisersHelpline({ organisers = DEFAULT_ORGANISERS, animClass }) {
  const orgList = organisers && organisers.length > 0 ? organisers : DEFAULT_ORGANISERS;

  return (
    <div className={`${styles.sectionCluster} ${animClass || ''}`}>
      <div className={styles.sectionHeaderLine}>
        <svg
          className={styles.sectionIcon}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <span className={styles.sectionTitleText}>EVENT ORGANISERS HELPLINE</span>
      </div>

      <div className={styles.helplineGridRow}>
        {orgList.map((org, idx) => (
          <div key={idx} className={styles.cardBlock}>
            <div className={styles.cardTabTag}>
              <span>ORGANISER</span>
            </div>
            <div className={styles.cyberCardWrapper}>
              <div className={styles.cyberCardInnerContact}>
                <div className={styles.contactMetaBlock}>
                  <div className={styles.contactName}>{org.name}</div>
                  <div className={styles.contactPhone}>{org.phone}</div>
                </div>
                <div className={styles.contactActionButtons}>
                  {/* Call Button */}
                  <a
                    href={`tel:${org.phone.replace(/\s+/g, '')}`}
                    className={styles.phoneSquareButton}
                    aria-label={`Call ${org.name}`}
                    title="Call Phone"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      aria-hidden="true"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </a>

                  {/* WhatsApp Chat Button */}
                  <a
                    href={`https://wa.me/${org.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.whatsappSquareButton}
                    aria-label={`Chat with ${org.name} on WhatsApp`}
                    title="WhatsApp Chat"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      aria-hidden="true"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VerifyPassPage({ regCode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadVerification() {
      try {
        setLoading(true);
        setError(null);
        const result = await verifyPass(regCode);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Pass verification failed. Please check the code.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (regCode) {
      loadVerification();
    } else {
      setLoading(false);
      setError('No registration code provided in the verification URL.');
    }

    return () => {
      isMounted = false;
    };
  }, [regCode]);

  return (
    <div className={styles.verifyPageContainer}>
      {/* Background Cyberpunk Grid & Ambient Glow */}
      <div className={styles.ambientGrid} />
      <div className={styles.ambientGlow} />

      {/* ========================================================
          TICKET PASS OUTER CHASSIS (Pixel-Stepped Cyber Frame)
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
              1. TOP HEADER HERO: CELESTIUS | LOC LOGO
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
              2. SUB-HEADER: OFFICIAL ENTRY BADGE + SLANTED EVENT TAG
              ======================================================== */}
          <div className={`${styles.subHeaderRow} ${styles.animSlideIn}`}>
            <span className={styles.officialBadgeLabel}>OFFICIAL ENTRY BADGE</span>
            <div className={styles.eventSlantedPill}>
              <div className={styles.hazardSlashesLeft}>
                <span className={styles.hazardSlashBar} />
                <span className={styles.hazardSlashBar} />
              </div>
              <span className={styles.eventPillTitle}>LARPER OR CODER</span>
              <div className={styles.checkerMatrix}>
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
                <span className={styles.checkDot} />
              </div>
            </div>
          </div>

          {/* ========================================================
              MAIN PASS CONTENT
              ======================================================== */}
          {/* A. LOADING STATE */}
          {loading && (
            <div className={styles.stateNoticeBox}>
              <p className={styles.stateNoticeText}>
                Authenticating entry credentials with event registry...
              </p>
            </div>
          )}

          {/* B. ERROR / NOT FOUND STATE (WITH CONTACT HELPLINE) */}
          {!loading && error && (
            <>
              <div className={styles.errorNoticeBox}>
                <p className={styles.errorTitle}>{error}</p>
                <p className={styles.errorSub}>
                  If payment was recently completed, please contact the organizers to get help.
                </p>
              </div>

              {/* Organisers Helpline is prominently available in Error State */}
              <OrganisersHelpline
                organisers={DEFAULT_ORGANISERS}
                animClass={styles.animCascade2}
              />
            </>
          )}

          {/* C. CONFIRMED ENTRY PASS STATE */}
          {!loading && data && !error && (
            <>
              {/* 3. DUO CODENAME HERO CARD */}
              <div className={`${styles.cardBlock} ${styles.animCascade1}`}>
                <div className={styles.cardTabTag}>
                  <span className={styles.tabSlash}>//</span>
                  <span>DUO CODENAME</span>
                  <span className={styles.tabSlash}>//</span>
                </div>
                <div className={styles.cyberCardWrapper}>
                  <div className={styles.cyberCardInnerDuo}>
                    <div className={styles.duoNameText}>{data.teamName}</div>
                    <div className={styles.duoRegCodePill}>{data.regCode}</div>
                  </div>
                </div>
              </div>

              {/* 4. REGISTERED DUO CODERS SECTION */}
              <div className={`${styles.sectionCluster} ${styles.animCascade2}`}>
                <div className={styles.sectionHeaderLine}>
                  <svg
                    className={styles.sectionIcon}
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className={styles.sectionTitleText}>REGISTERED DUO CODERS</span>
                </div>

                <div className={styles.codersGridRow}>
                  {data.members?.map((member, idx) => (
                    <div key={idx} className={styles.cardBlock}>
                      <div className={styles.cardTabTag}>
                        <span>{member.role === 'leader' || idx === 0 ? 'MEMBER 1 (LEADER)' : 'MEMBER 2'}</span>
                      </div>
                      <div className={styles.cyberCardWrapper}>
                        <div className={styles.cyberCardInnerCoder}>
                          <div className={styles.coderName}>{member.name}</div>
                          <div className={styles.coderDept}>{member.department || 'CSE'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. VENUE INFORMATION */}
              <div className={`${styles.cardBlock} ${styles.animCascade3}`}>
                <div className={styles.cardTabTag}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>VENUE INFORMATION</span>
                </div>
                <div className={styles.cyberCardWrapper}>
                  <div className={styles.cardCornerChecker}>
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                    <span className={styles.checkDot} />
                  </div>
                  <div className={styles.cyberCardInnerVenue}>
                    <p className={styles.venueNoticeText}>
                      Venue will be conveyed through official WhatsApp group. Kindly make sure both members of the team joined this WhatsApp group.
                    </p>
                    <a
                      href={WHATSAPP_GROUP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.venueWhatsappJoinBtn}
                    >
                      <svg
                        className={styles.venueWhatsappIcon}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span className={styles.venueWhatsappText}>Join Official WhatsApp Group</span>
                      <svg
                        className={styles.venueWhatsappArrow}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* 6. OFFICIAL ENTRY CONFIRMATION BANNER */}
              <div className={`${styles.cyberCardWrapper} ${styles.animCascade4}`}>
                <div className={styles.cyberCardInnerConfirmation}>
                  {/* Pixel Art Hex Checkmark Icon with Stamp Animation */}
                  <div className={`${styles.pixelCheckBadge} ${styles.animStampIn}`}>
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 44 44"
                      fill="none"
                      shapeRendering="crispEdges"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 0 H32 V4 H38 V10 H42 V14 H44 V30 H42 V34 H38 V40 H32 V44 H12 V40 H6 V34 H2 V30 H0 V14 H2 V10 H6 V4 H12 V0 Z"
                        fill="url(#goldHexGradient)"
                      />
                      <path
                        d="M12 0 H32 V4 H38 V10 H42 V14 H44 V30 H42 V34 H38 V40 H32 V44 H12 V40 H6 V34 H2 V30 H0 V14 H2 V10 H6 V4 H12 V0 Z"
                        stroke="#B86E00"
                        strokeWidth="2"
                      />
                      <path
                        d="M18 31 L10 23 L14 19 L18 23 L30 11 L34 15 Z"
                        fill="#0E0A14"
                      />
                      <defs>
                        <linearGradient id="goldHexGradient" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FFCD38" />
                          <stop offset="0.5" stopColor="#FFAE19" />
                          <stop offset="1" stopColor="#F26B3A" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <div className={styles.confirmationText}>
                    {data.message ||
                      'Official Entry Pass Verified. This duo is officially confirmed by Celestius for LARPER OR CODER.'}
                  </div>

                  <div className={styles.confirmationHazardSlashes}>
                    <span className={styles.hazardSlashBar} />
                    <span className={styles.hazardSlashBar} />
                    <span className={styles.hazardSlashBar} />
                    <span className={styles.hazardSlashBar} />
                  </div>
                </div>
              </div>

              {/* 7. EVENT ORGANISERS HELPLINE SECTION (AT THE VERY LAST) */}
              <OrganisersHelpline
                organisers={data.organisers}
                animClass={styles.animCascade5}
              />
            </>
          )}

          {/* ========================================================
              8. PASS FOOTER BAR
              ======================================================== */}
          <div className={`${styles.footerRowBar} ${styles.animCascade6}`}>
            <a href="/" className={styles.returnHomeLink}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Return to LOC Home</span>
            </a>

            <div className={styles.footerHazardSlashes}>
              <span className={styles.hazardSlashBar} />
              <span className={styles.hazardSlashBar} />
              <span className={styles.hazardSlashBar} />
            </div>

            <span className={styles.footerBrandFootprint}>Celestius CIT 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
}
