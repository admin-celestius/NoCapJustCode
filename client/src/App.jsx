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
import Quote from './components/Quote/Quote.jsx';
import RegisterModal from './components/Register/RegisterModal.jsx';
import Footer from './components/Footer/Footer.jsx';
import { auditHardwarePlacement } from './utils/hardwareAudit.js';
import { useScrollReveal } from './hooks/useScrollReveal.js';

export default function App() {
  // Always start with 'INTRO' on every reload / visit as requested
  const [appFlow, setAppFlow] = useState('INTRO');
  const [siteRevealed, setSiteRevealed] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

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

  // Lock scroll while intro is active
  useEffect(() => {
    if (appFlow !== 'SITE') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [appFlow]);

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
          <Quote />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Registration Modal / Bottom Sheet */}
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={handleCloseRegister}
      />
    </div>
  );
}
