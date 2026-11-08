// client/src/components/Hero/Marquee.jsx
import React from 'react';
import styles from './Hero.module.css';

export default function Marquee() {
  const words = ['LOCK IN', 'EXECUTE', 'NO LARPING', 'ONLY CODING'];
  // Repeat words 4 times per group to ensure dense, seamless, uninterrupted loop across all screen sizes (including 4K)
  const sequence = [...words, ...words, ...words, ...words];

  return (
    <div className={styles.marqueeContainer} aria-hidden="true">
      <div className={styles.marqueeTrack}>
        {/* Render 2 identical groups so translateX(-50%) loops infinitely and seamlessly */}
        {[0, 1].map((groupIdx) => (
          <div key={groupIdx} className={styles.marqueeGroup}>
            {sequence.map((word, idx) => (
              <span key={idx} className={styles.marqueeItem}>
                <span className={styles.marqueeWord}>{word}</span>
                <span className={styles.marqueeSeparator}>//</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
