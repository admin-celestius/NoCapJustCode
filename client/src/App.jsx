// client/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { checkHealth } from './services/api.js';
import Scene from './components/Scene/Scene.jsx';
import Intro from './components/Intro/Intro.jsx';
import { logTimelineEvent } from './utils/timelineLogger.js';
import Navbar from './components/Navbar/Navbar.jsx';
import Hero from './components/Hero/Hero.jsx';
import About from './components/About/About.jsx';
import Schedule from './components/Schedule/Schedule.jsx';
import EventCards from './components/Events/EventCards.jsx';
import RegisterModal from './components/Register/RegisterModal.jsx';
import PromoPopup from './components/PromoPopup/PromoPopup.jsx';
import { isPromoActive } from './data/event.js';
import Footer from './components/Footer/Footer.jsx';
import { auditHardwarePlacement } from './utils/hardwareAudit.js';
import { useScrollReveal } from './hooks/useScrollReveal.js';
import VerifyPassPage from './components/PassVerification/VerifyPassPage.jsx';
import AdminScannerPage from './components/PassVerification/AdminScannerPage.jsx';
import AttendanceRosterPage from './components/PassVerification/AttendanceRosterPage.jsx';

export default function App() {
  // Always start with 'INTRO' on every reload / visit as requested
  const [appFlow, setAppFlow] = useState('INTRO');
  const [siteRevealed, setSiteRevealed] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);

  // Show promotional offer popup on every visit/refresh of the root route while active
  useEffect(() => {
    if (!siteRevealed || !isPromoActive()) return;
    const timer = setTimeout(() => {
      setPromoModalOpen(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [siteRevealed]);

  // Activate independent scroll reveals across all site elements
  useScrollReveal(appFlow === 'SITE');

  // Non-blocking background health check
  useEffect(() => {
    checkHealth();
  }, []);

  // Handle tab visibility to pause animations when hidden
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        document.documentElement.classList.add('tab-hidden');
      } else {
        document.documentElement.classList.remove('tab-hidden');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Dev-only hardware placement audit
  useEffect(() => {
    if (import.meta.env.DEV && appFlow === 'SITE') {
      const timer = setTimeout(() => {
        auditHardwarePlacement();
      }, 500);
      const onResize = () => auditHardwarePlacement();
      window.addEventListener('resize', onResize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', onResize);
      };
    }
  }, [appFlow]);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isAdminScan = normalizedPath === '/admin/scan';
  const isAdminRoster = normalizedPath === '/admin/roster' || normalizedPath === '/admin/attendance';
  const isCustomRoute = pathname.startsWith('/verify') || isAdminScan || isAdminRoster;

  // Redirect unauthorized/playful admin path attempts to root URL
  useEffect(() => {
    if (normalizedPath.startsWith('/admin') && !isAdminScan && !isAdminRoster) {
      window.location.replace('/');
    }
  }, [normalizedPath, isAdminScan, isAdminRoster]);

  // Lock scroll while intro is active on main site only
  useEffect(() => {
    if (!isCustomRoute && appFlow !== 'SITE') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [appFlow, isCustomRoute]);

  const handleOpenRegister = () => {
    setRegisterModalOpen(true);
  };

  const handleCloseRegister = () => {
    setRegisterModalOpen(false);
  };

  const handleIntroComplete = useCallback(() => {
    setAppFlow('SITE');
    setSiteRevealed(true);
    logTimelineEvent('site visible');
  }, []);

  // Public QR Pass Verification route (e.g. /verify/123 or /verify?code=123)
  if (pathname === '/verify' || pathname.startsWith('/verify/')) {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const codeFromPath = pathname.replace(/^\/verify\/?/, '').replace(/\/+$/, '').trim();
    const code = codeFromPath || urlParams?.get('code') || '';
    return <VerifyPassPage regCode={code} />;
  }

  // Organiser Check-In / Attendance Scanner Desk - strictly matches /admin/scan only
  if (isAdminScan) {
    return <AdminScannerPage />;
  }

  // Organiser Attendance Live Roster - strictly matches /admin/roster (or /admin/attendance)
  if (isAdminRoster) {
    return <AttendanceRosterPage />;
  }

  // Any other playful/probing admin attempts redirect to root URL
  if (normalizedPath.startsWith('/admin')) {
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
    return null;
  }

  return (
    <div className="appWrapper">
      {/* Background Coding Scene (Dot Grid, Ambient Glows, Rising Embers) */}
      <Scene />

      {/* Story Introduction Overlay: runs every time on reload */}
      {appFlow === 'INTRO' && (
        <Intro onComplete={handleIntroComplete} />
      )}

      {/* Main Site Container: inert while intro active */}
      <div
        className={`siteWrapper ${siteRevealed ? 'siteRevealed' : ''}`}
        inert={appFlow !== 'SITE'}
        aria-hidden={appFlow !== 'SITE'}
      >
        {/* Floating Pill Navbar */}
        <Navbar onOpenRegister={handleOpenRegister} animateIn={siteRevealed} />

        {/* Main Sections */}
        <main className="mainContent">
          <Hero onOpenRegister={handleOpenRegister} animateIn={siteRevealed} />
          <About />
          <Schedule />
          <EventCards onOpenRegister={handleOpenRegister} />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* National Education Day Promotional Offer Popup (shows on every root visit/refresh while active) */}
      <PromoPopup
        isOpen={promoModalOpen && !registerModalOpen}
        onClose={() => setPromoModalOpen(false)}
        onRegister={handleOpenRegister}
      />

      {/* Registration Modal / Bottom Sheet */}
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={handleCloseRegister}
      />
    </div>
  );
}
