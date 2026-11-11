// client/src/utils/assetPreloader.js
import logoTypingImg from '../assets/intro/logo-typing.png';
import logoWebp from '../assets/logo-transparent.webp';
import logoPng from '../assets/logo-transparent.png';
import navbarLogoWebp from '../assets/logo-navbar.webp';
import navbarLogoPng from '../assets/logo-navbar.png';
import celestiusWebp from '../assets/celestius-transparent.webp';
import celestiusPng from '../assets/celestius-transparent.png';
import thinkerWebp from '../assets/thinker.webp';
import thinker450Webp from '../assets/thinker-450w.webp';
import blankPassImg from '../assets/entry-pass-blank.png';

import w1 from '../assets/workshop/workshop-1.webp';
import w1_700 from '../assets/workshop/workshop-1-700w.webp';
import w2 from '../assets/workshop/workshop-2.webp';
import w2_700 from '../assets/workshop/workshop-2-700w.webp';
import w3 from '../assets/workshop/workshop-3.webp';
import w3_700 from '../assets/workshop/workshop-3-700w.webp';
import w4 from '../assets/workshop/workshop-4.webp';
import w4_700 from '../assets/workshop/workshop-4-700w.webp';

import { isPromoActive } from '../data/event.js';

// Static public directory assets
const PUBLIC_ASSETS = [
  '/celestius_original.png',
  '/Celestius_modified.png',
  '/icons.svg',
  '/favicon-new.png',
  ...(isPromoActive() ? ['/national-education-day.png'] : []),
];

// Bundled assets
const BUNDLED_ASSETS = [
  logoTypingImg,
  logoWebp,
  logoPng,
  navbarLogoWebp,
  navbarLogoPng,
  celestiusWebp,
  celestiusPng,
  thinkerWebp,
  thinker450Webp,
  blankPassImg,
  w1,
  w1_700,
  w2,
  w2_700,
  w3,
  w3_700,
  w4,
  w4_700,
];

// Deduplicated list of all image URLs to preload
export const ALL_PRELOAD_IMAGES = Array.from(
  new Set([...PUBLIC_ASSETS, ...BUNDLED_ASSETS])
);

/**
 * Preloads a single image and resolves upon load or error.
 * Uses decode() if supported for instantaneous zero-jank painting.
 * Includes a per-asset timeout to guard against slow or hanging requests.
 */
function preloadImage(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') {
      return resolve({ url, success: true });
    }

    let settled = false;
    const img = new Image();

    const onFinish = (success) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ url, success });
    };

    const timer = setTimeout(() => {
      onFinish(false);
    }, timeoutMs);

    img.onload = () => {
      if (img.decode) {
        img.decode().then(
          () => onFinish(true),
          () => onFinish(true) // Even if decode rejects, image is loaded in memory
        );
      } else {
        onFinish(true);
      }
    };

    img.onerror = () => {
      // Gracefully resolve to prevent stalled loaders on 404s or network drops
      onFinish(false);
    };

    img.src = url;

    // Check if image is already cached and loaded
    if (img.complete && img.naturalWidth !== 0) {
      if (img.decode) {
        img.decode().then(
          () => onFinish(true),
          () => onFinish(true)
        );
      } else {
        onFinish(true);
      }
    }
  });
}

/**
 * Ensures web fonts are fully parsed and ready for rendering.
 */
function preloadFonts(timeoutMs = 6000) {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    return Promise.race([
      document.fonts.ready.then(() => true).catch(() => true),
      new Promise((res) => setTimeout(() => res(true), timeoutMs)),
    ]);
  }
  return Promise.resolve(true);
}

/**
 * Initiates concurrent preloading of all site assets with fine-grained progress callbacks.
 * 
 * @param {Function} onProgress Callback called with { loaded, total, percentage, item, success }
 * @returns {Promise<{ loaded: number, total: number, allSucceeded: boolean }>}
 */
export function startAssetPreloader(onProgress) {
  const images = ALL_PRELOAD_IMAGES;
  const total = images.length + 1; // images + fonts
  let loadedCount = 0;
  let allSucceeded = true;

  const handleItemComplete = (item, success) => {
    loadedCount++;
    if (!success) {
      allSucceeded = false;
    }
    const percentage = Math.min(100, Math.round((loadedCount / total) * 100));
    if (typeof onProgress === 'function') {
      onProgress({
        loaded: loadedCount,
        total,
        percentage,
        item,
        success,
      });
    }
  };

  const imagePromises = images.map((url) =>
    preloadImage(url).then(({ success }) => handleItemComplete(url, success))
  );

  const fontPromise = preloadFonts().then((success) =>
    handleItemComplete('system_web_fonts', success)
  );

  return Promise.all([...imagePromises, fontPromise]).then(() => ({
    loaded: loadedCount,
    total,
    allSucceeded,
  }));
}
