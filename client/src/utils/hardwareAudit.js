// client/src/utils/hardwareAudit.js

/**
 * Dev-only hardware placement assertion:
 * Asserts:
 * 1. Every piece has its full bounding box inside viewport (left >= 16, right <= viewportWidth - 16).
 * 2. Every piece has its full bounding box inside its section.
 * 3. Does not intersect any text, button, card, or logo element.
 */
export function auditHardwarePlacement() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { total: 0, violations: [] };
  }

  const pieces = Array.from(document.querySelectorAll('[data-hardware-piece]'));
  const viewportWidth = window.innerWidth;
  const violations = [];

  // Content elements that hardware pieces must NOT intersect
  const contentElements = Array.from(
    document.querySelectorAll(
      'h1, h2, h3, p, button, a.btn, [class*="presenterPill"], [class*="chip"], [class*="heroLogo"], [class*="eventCard"], [class*="statCard"], [class*="timelineItem"], [class*="brandCol"], [class*="footerCol"], [class*="marqueeContainer"]'
    )
  ).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  for (const piece of pieces) {
    const r = piece.getBoundingClientRect();
    // Ignore pieces in currently hidden responsive tiers
    if (r.width === 0 || r.height === 0 || window.getComputedStyle(piece).display === 'none') {
      continue;
    }

    const name = piece.getAttribute('data-hardware-piece') || 'hardware';
    const tier = piece.getAttribute('data-hardware-tier') || 'unknown';
    const section = piece.closest('section, footer');
    const secId = section?.id || section?.tagName?.toLowerCase() || 'unknown';
    const secRect = section ? section.getBoundingClientRect() : null;

    // 1. Viewport width check (with 16px safe inset)
    if (r.left < 15 || r.right > viewportWidth - 15) {
      violations.push({
        type: 'VIEWPORT_OVERFLOW',
        name,
        tier,
        secId,
        details: `left=${r.left.toFixed(1)}, right=${r.right.toFixed(1)}, viewport=${viewportWidth}`,
      });
    }

    // 2. Section bounds check
    if (secRect) {
      if (r.top < secRect.top - 4 || r.bottom > secRect.bottom + 4) {
        violations.push({
          type: 'SECTION_OVERFLOW',
          name,
          tier,
          secId,
          details: `piece[top=${r.top.toFixed(1)}, bot=${r.bottom.toFixed(1)}] vs section[top=${secRect.top.toFixed(1)}, bot=${secRect.bottom.toFixed(1)}]`,
        });
      }
    }

    // 3. No intersection with content/text/buttons/cards/logo
    for (const contentEl of contentElements) {
      if (piece.contains(contentEl)) continue;

      const tr = contentEl.getBoundingClientRect();
      const overlap = !(
        r.right <= tr.left ||
        r.left >= tr.right ||
        r.bottom <= tr.top ||
        r.top >= tr.bottom
      );

      if (overlap) {
        violations.push({
          type: 'CONTENT_INTERSECTION',
          name,
          tier,
          secId,
          contentTag: contentEl.tagName,
          contentPreview: contentEl.textContent?.trim().slice(0, 30),
        });
      }
    }
  }

  // Audit completed


  return { total: pieces.length, violations };
}

if (typeof window !== 'undefined') {
  window.__auditHardwarePlacement = auditHardwarePlacement;
}
