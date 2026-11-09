// client/src/components/Navbar/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Navbar.module.css';
import navbarLogoWebp from '../../assets/logo-navbar.webp';
import navbarLogoPng from '../../assets/logo-navbar.png';
import Button from '../ui/Button.jsx';
import { useScrollSpy } from '../../hooks/useScrollSpy.js';

export default function Navbar({ onOpenRegister, animateIn }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuActive, setMenuActive] = useState(false);

  // Celestius logo reveal state: starts hidden, then reveals and loops continuously
  const [celestiusRevealed, setCelestiusRevealed] = useState(false);

  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const firstLinkRef = useRef(null);

  const activeSection = useScrollSpy(['hero', 'about', 'schedule', 'events']);

  const navItems = [
    { label: 'The Lore', href: '#about', id: 'about' },
    { label: 'The Game Plan', href: '#schedule', id: 'schedule' },
    { label: 'The Lineup', href: '#events', id: 'events' },
  ];

  // Sequence: LOC logo displays immediately; divider & Celestius logo expand after short delay
  // and then Celestius logo continuously glitches back and forth between new curved & old logos
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCelestiusRevealed(true);
      return;
    }

    if (!animateIn) {
      setCelestiusRevealed(false);
      return;
    }

    const timer = setTimeout(() => {
      setCelestiusRevealed(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [animateIn]);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setMenuActive(false);
    setTimeout(() => {
      setMenuMounted(false);
      toggleRef.current?.focus();
    }, 180);
  }, []);

  const openMenu = () => {
    setMobileMenuOpen(true);
    setMenuMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMenuActive(true);
        firstLinkRef.current?.focus();
      });
    });
  };

  const toggleMenu = () => {
    if (mobileMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Pointerdown outside to close
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handlePointerDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [mobileMenuOpen, closeMenu]);

  // Escape key to close
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeMenu]);

  // Scroll > 40px closes menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const startY = window.scrollY;
    const handleScroll = () => {
      if (Math.abs(window.scrollY - startY) > 40) {
        closeMenu();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen, closeMenu]);

  // Window resize to >= 1024px closes menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMenu();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen, closeMenu]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    closeMenu();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`${styles.headerWrapper} ${animateIn ? styles.navEntrance : ''}`}>
      {/* Mobile full-screen backdrop */}
      {menuMounted && (
        <div
          className={`${styles.menuBackdrop} ${menuActive ? styles.backdropActive : ''}`}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <nav className={styles.navbar} aria-label="Main Navigation">
        {/* Brand: LOC Logo (Stable) + Constantly Glitching Celestius Logos (New <-> Old) */}
        <div className={styles.brand}>
          {/* LOC Logo: Steady, never glitches */}
          <a
            href="#hero"
            className={styles.brandLogoWrapper}
            onClick={(e) => handleNavClick(e, '#hero')}
            aria-label="Larper or Coder - Back to top"
          >
            <picture>
              <source srcSet={navbarLogoWebp} type="image/webp" />
              <img
                src={navbarLogoPng}
                alt="Larper or Coder"
                className={styles.brandLogo}
                width={320}
                height={163}
                style={{ aspectRatio: '320 / 163' }}
              />
            </picture>
          </a>

          {/* Animated Vertical Divider */}
          <span
            className={`${styles.brandDivider} ${
              celestiusRevealed ? styles.brandDividerVisible : styles.brandDividerHidden
            }`}
            aria-hidden="true"
          />

          {/* Celestius Glitch Arena: Constantly Glitches Alternatively Between New Curved & Old Logos */}
          <a
            href="https://celestius.in"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.celestiusLogoWrapper} ${
              celestiusRevealed ? styles.celestiusActiveLoop : styles.celestiusHidden
            }`}
            aria-label="Celestius website (opens in a new tab)"
          >
            {/* Digital Scanline Noise Layer */}
            <div className={styles.glitchNoiseOverlay} aria-hidden="true" />

            {/* RGB Chromatic Aberration Slices (Cyan & Red) */}
            <img
              src="/Celestius_modified_curved.png"
              alt=""
              className={`${styles.celestiusImg} ${styles.glitchSliceCyan}`}
              aria-hidden="true"
            />
            <img
              src="/celestius_original.png"
              alt=""
              className={`${styles.celestiusImg} ${styles.glitchSliceRed}`}
              aria-hidden="true"
            />

            {/* Alternating Base Logo Layers (Curved Modified <-> Original) */}
            <img
              src="/Celestius_modified_curved.png"
              alt="Celestius Modified"
              className={`${styles.celestiusImg} ${styles.celestiusNewLoop}`}
            />
            <img
              src="/celestius_original.png"
              alt="Celestius Original"
              className={`${styles.celestiusImg} ${styles.celestiusOldLoop}`}
            />
          </a>
        </div>

        {/* Desktop Links (>= 1024px) */}
        <ul className={styles.navLinks}>
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                className={`${styles.navLink} ${activeSection === item.id ? styles.active : ''}`}
                onClick={(e) => handleNavClick(e, item.href)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.registerBtnDesktop}>
            <Button size="sm" variant="primary" onClick={() => onOpenRegister()} title="Your homie better be ready.">
              Register With Your Homie
            </Button>
          </div>

          {/* Mobile Hamburger Toggle (48px tap target) */}
          <button
            ref={toggleRef}
            type="button"
            className={styles.mobileToggle}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu (Mounts when toggled) */}
      {menuMounted && (
        <div
          ref={menuRef}
          id="mobile-nav-menu"
          className={`${styles.mobileMenu} ${menuActive ? styles.menuActive : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div className={styles.mobileMenuHeader}>
            <span className={styles.mobileMenuTitle}>NAVIGATION</span>
            <button
              type="button"
              className={styles.mobileCloseBtn}
              onClick={closeMenu}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ul className={styles.mobileNavLinks}>
            {navItems.map((item, idx) => (
              <li key={item.id}>
                <a
                  ref={idx === 0 ? firstLinkRef : null}
                  href={item.href}
                  className={`${styles.mobileNavLink} ${activeSection === item.id ? styles.active : ''}`}
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className={styles.mobileActions}>
            <Button
              size="lg"
              variant="primary"
              className={styles.mobileRegisterBtn}
              onClick={() => {
                closeMenu();
                onOpenRegister();
              }}
            >
              Register With Your Homie
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
