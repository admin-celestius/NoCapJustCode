// client/src/utils/timelineLogger.js

const timeline = [];
let t0 = null;

/**
 * Dev-only timeline logger:
 * Records milestones: intro start, each phase start, skip pressed, splash start, splash end, site visible.
 */
export function logTimelineEvent(event, extra = {}) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (t0 === null) {
    t0 = now;
  }
  const relativeMs = Math.round((now - t0) * 10) / 10;
  const relativeSec = (relativeMs / 1000).toFixed(2) + 's';

  const entry = {
    Event: event,
    'Elapsed (s)': relativeSec,
    'Elapsed (ms)': relativeMs,
    ...extra,
  };

  timeline.push(entry);

  if (typeof window !== 'undefined') {
    window.__TIMELINE__ = [...timeline];
  }

  if (event === 'site visible') {
    // Site visible
  }
}

export function resetTimeline() {
  timeline.length = 0;
  t0 = null;
  if (typeof window !== 'undefined') {
    window.__TIMELINE__ = [];
  }
}

export function getTimelineEvents() {
  return [...timeline];
}
