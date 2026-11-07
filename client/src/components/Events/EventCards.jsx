// client/src/components/Events/EventCards.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './Events.module.css';
import { eventData } from '../../data/event.js';
import EventCard from './EventCard.jsx';
import EventDetailPanel from './EventDetailPanel.jsx';
import { SectionScene } from '../Scene/index.js';

export default function EventCards({ onOpenRegister }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [triggerRef, setTriggerRef] = useState(null);
  const [activeFlippedId, setActiveFlippedId] = useState(null);
  const [animationStage, setAnimationStage] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return 'ready';
    }
    return 'idle';
  });
  const sectionRef = useRef(null);

  // IntersectionObserver to trigger the 3D spin and split entrance animation sequence on scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 1. Enter and start 3D spin together in the center
          setAnimationStage('spinning');

          // 2. After 900ms of spinning, split smoothly apart to left and right columns
          const splitTimer = setTimeout(() => {
            setAnimationStage('splitting');
          }, 900);

          // 3. Settle in place and mark ready for interactive card-turning clicks
          const readyTimer = setTimeout(() => {
            setAnimationStage('ready');
          }, 1650);

          observer.disconnect();

          return () => {
            clearTimeout(splitTimer);
            clearTimeout(readyTimer);
          };
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // When a card is clicked: turn this card forward, and turn any previously turned card back!
  const handleCardClick = (eventId) => {
    setActiveFlippedId((prev) => (prev === eventId ? null : eventId));
  };

  const handleOpenDetails = (event, btnRef) => {
    setSelectedEvent(event);
    setTriggerRef(btnRef);
  };

  const handleCloseDetails = () => {
    setSelectedEvent(null);
  };

  return (
    <section ref={sectionRef} id="events" className={`section ${styles.eventsSection}`}>
      <SectionScene section="events" />
      <div className={`container ${styles.eventsContainer}`}>
        <div className={styles.eventsHeader}>
          <div className="section-tag scrollReveal" style={{ transitionDelay: '0ms' }}>
            // 03. TRACKS & COMPETITIONS
          </div>
          <h2 className="section-title scrollReveal" style={{ transitionDelay: '80ms' }}>
            Choose Your Arena
          </h2>
          <p className="section-subtitle scrollReveal" style={{ transitionDelay: '160ms' }}>
            Two distinct tracks. Level up your algorithmic toolkit in the morning, then put your aura on the line in the afternoon.
          </p>
        </div>

        <div className={styles.cardsGrid}>
          {eventData.events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              isFlipped={activeFlippedId === event.id}
              animationStage={animationStage}
              onCardClick={() => handleCardClick(event.id)}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </div>

        {/* Expanded Detail Panel */}
        <EventDetailPanel
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={handleCloseDetails}
          onRegister={(eventId) => onOpenRegister(eventId)}
          triggerRef={triggerRef}
        />
      </div>
    </section>
  );
}
