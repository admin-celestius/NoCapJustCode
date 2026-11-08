// client/src/components/Register/ColorOSDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './Register.module.css';

export default function ColorOSDropdown({
  id,
  value,
  onChange,
  options = [],
  hasError = false,
  onFocus,
  ariaLabel = 'Select option',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Auto-detect whether to open downward or upward based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > 250) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className={`${styles.colorOSSelectContainer} ${isOpen ? styles.dropdownOpen : ''}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        className={`${styles.colorOSSelectTrigger} ${hasError ? styles.hasError : ''} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && onFocus) onFocus();
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={styles.selectedLabel}>
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${styles.colorOSChevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ColorOS Context Menu Popup */}
      {isOpen && (
        <div
          className={`${styles.colorOSContextMenu} ${openUpward ? styles.menuOpenUpward : styles.menuOpenDownward}`}
          role="listbox"
          aria-activedescendant={value}
        >
          <div className={styles.colorOSMenuList}>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.colorOSMenuItem} ${isSelected ? styles.menuItemSelected : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className={styles.menuItemLabel}>{opt.label}</span>
                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.itemCheckmark}
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
