// client/src/hooks/useScrollReveal.js
import { useEffect } from 'react';

/**
 * useScrollReveal:
 * High-performance scroll animation system.
 * Elements with .scrollReveal start translated downward and transparent,
 * and animate into view smoothly with independent stagger delays when scrolled into view.
 */
export function useScrollReveal(active = true) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const elements = Array.from(document.querySelectorAll('.scrollReveal, [data-reveal]'));
    if (!elements.length) return;

    if (prefersReducedMotion) {
      elements.forEach((el) => {
        el.classList.add('isRevealed');
        el.setAttribute('data-revealed', 'true');
      });
      return;
    }

    const checkReveal = (el) => {
      if (el.classList.contains('isRevealed')) return true;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      // Trigger when element's top is within 88% of the viewport height
      if (rect.top <= windowHeight * 0.88 && rect.bottom >= 0) {
        el.classList.add('isRevealed');
        el.setAttribute('data-revealed', 'true');
        return true;
      }
      return false;
    };

    // 1. Initial check: ONLY reveal elements already inside initial viewport (e.g. top of page)
    elements.forEach((el) => {
      checkReveal(el);
    });

    // 2. IntersectionObserver for off-screen elements as the user scrolls down
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('isRevealed');
              entry.target.setAttribute('data-revealed', 'true');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '0px 0px -40px 0px',
          threshold: 0.05,
        }
      );

      elements.forEach((el) => {
        if (!el.classList.contains('isRevealed')) {
          observer.observe(el);
        }
      });
    }

    // 3. Scroll & resize listener as guarantee for smooth interactive triggers
    const onScrollOrResize = () => {
      elements.forEach((el) => {
        if (!el.classList.contains('isRevealed')) {
          const revealed = checkReveal(el);
          if (revealed && observer) {
            observer.unobserve(el);
          }
        }
      });
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (observer) observer.disconnect();
    };
  }, [active]);
}
