// client/src/components/ui/Chip.jsx
import React from 'react';
import styles from './Chip.module.css';

export default function Chip({ icon, children, className = '', title }) {
  return (
    <div className={`${styles.chip} ${className}`} title={title}>
      {icon && <span className={styles.chipIcon}>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
