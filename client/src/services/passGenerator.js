// client/src/services/passGenerator.js
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import blankTemplateUrl from '../assets/entry-pass-blank.png';

const PASS_FONT_FAMILY = '"Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/**
 * Ensures the grotesque sans fonts are fully loaded before drawing to canvas.
 */
async function ensureFontReady() {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('700 24px "Space Grotesk"'),
        document.fonts.load('700 24px "Inter"'),
      ]);
      await document.fonts.ready;
    } catch {
      // Graceful fallback to system sans-serif
    }
  }
}

/**
 * Loads an image from URL into an HTMLImageElement.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load entry pass template image.'));
    img.src = src;
  });
}

/**
 * Calculates responsive font size to fit inside capsule width without spilling.
 */
function fitText(ctx, text, maxWidth, initialSize = 25, minSize = 13) {
  let size = initialSize;
  ctx.font = `700 ${size}px ${PASS_FONT_FAMILY}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `700 ${size}px ${PASS_FONT_FAMILY}`;
  }
  return size;
}

/**
 * Generates an ultra-high resolution HTML5 Canvas of the entry pass
 * with dynamic Duo Codename, Member Names, and a scannable QR Code.
 */
export async function generatePassCanvas(data) {
  await ensureFontReady();

  const regCode = (data.regCode || 'TEAM-000000').toUpperCase();
  const teamName = (data.teamName || 'Duo Team').trim();
  const m1 = (data.members?.[0]?.name || data.members?.[0]?.fullName || 'Player 1').trim();
  const m2 = (data.members?.[1]?.name || data.members?.[1]?.fullName || 'Player 2').trim();

  // Public QR verification URL (opens in Google Lens, camera apps, or scanner)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://loc.celestius.in';
  const qrUrl = `${baseUrl}/verify/${encodeURIComponent(regCode)}`;

  // 1. Generate crisp QR Code Image Data URL (Error Correction Level H, margin: 0 for uniform centering)
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 0,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0C0A10',
      light: '#FFFFFF',
    },
  });

  const [templateImg, qrImg] = await Promise.all([
    loadImage(blankTemplateUrl),
    loadImage(qrDataUrl),
  ]);

  // 2. Setup master canvas (768 x 1024)
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Draw master template
  ctx.drawImage(templateImg, 0, 0, 768, 1024);

  // 3. Draw dynamic QR Code inside yellow brackets (White box bounds: X: 484..694, Y: 466..670)
  // Perfectly centered with uniform padding
  ctx.drawImage(qrImg, 489, 471, 200, 200);

  // 4. Configure text styling
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const maxPillWidth = 310;

  // 5. Draw Duo Codename inside Capsule 1 (Inner Center: Y=497)
  fitText(ctx, teamName, maxPillWidth, 25, 14);
  ctx.fillText(teamName, 96, 497);

  // 6. Draw Member 1 Name inside Capsule 2 (Inner Center: Y=587)
  fitText(ctx, m1, maxPillWidth, 24, 13);
  ctx.fillText(m1, 96, 587);

  // 7. Draw Member 2 Name inside Capsule 3 (Inner Center: Y=672)
  fitText(ctx, m2, maxPillWidth, 24, 13);
  ctx.fillText(m2, 96, 672);

  return canvas;
}

/**
 * Downloads the entry pass as a pixel-exact high-resolution PNG image.
 */
export async function downloadPassImage(data) {
  const canvas = await generatePassCanvas(data);
  const regCode = (data.regCode || 'TEAM').replace(/[^a-zA-Z0-9_-]/g, '');

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LOC_Entry_Pass_${regCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve(true);
    }, 'image/png');
  });
}

/**
 * Downloads the entry pass as a robust, single-page print-ready PDF.
 * Uses direct canvas image embedding for 100% rendering accuracy across all browsers.
 */
export async function downloadPassPdf(data) {
  const canvas = await generatePassCanvas(data);
  const regCode = (data.regCode || 'TEAM').replace(/[^a-zA-Z0-9_-]/g, '');

  // Exact 3:4 aspect ratio (105mm x 140mm ticket badge)
  const pdfWidth = 105;
  const pdfHeight = 140;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
    compress: true,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  pdf.save(`LOC_Entry_Pass_${regCode}.pdf`);
  return true;
}
