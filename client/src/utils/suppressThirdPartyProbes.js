// client/src/utils/suppressThirdPartyProbes.js

/**
 * Suppresses benign third-party debugger / anti-fraud console noise generated
 * by external payment SDK dependencies (e.g. Sardine.ai probing localhost:7071
 * and Razorpay reading unexposed CORS headers).
 */
export function initThirdPartyInterceptors() {
  if (typeof window === 'undefined') return;

  // 1. Intercept localhost port scanning by anti-fraud telemetry (e.g. api.sardine.ai / loader.min.js)
  // Sardine creates `new Image()` and sets `img.src = 'http://localhost:7071/*.png'` to check for local debuggers.
  // Intercepting this avoids `net::ERR_CONNECTION_REFUSED` in console while cleanly returning the expected onerror callback.
  try {
    const imgProto = window.HTMLImageElement?.prototype;
    const desc = Object.getOwnPropertyDescriptor(imgProto, 'src');
    if (desc && desc.set) {
      const origSet = desc.set;
      Object.defineProperty(imgProto, 'src', {
        set(url) {
          if (typeof url === 'string' && (url.includes(':7071') || url.includes('localhost:7071') || url.includes('127.0.0.1:7071'))) {
            setTimeout(() => {
              try {
                const errEvent = new Event('error');
                this.dispatchEvent(errEvent);
                if (typeof this.onerror === 'function') {
                  this.onerror(errEvent);
                }
              } catch {
                // Ignore probe errors
              }
            }, 0);
            return;
          }
          return origSet.call(this, url);
        },
        get: desc.get,
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // Graceful fallback
  }

  // 2. Suppress "Refused to get unsafe header" warning when Razorpay reads CORS-unexposed telemetry headers
  try {
    const origGetResponseHeader = window.XMLHttpRequest?.prototype?.getResponseHeader;
    if (origGetResponseHeader) {
      window.XMLHttpRequest.prototype.getResponseHeader = function (header) {
        try {
          const allHeaders = this.getAllResponseHeaders() || '';
          if (!allHeaders.toLowerCase().includes(String(header).toLowerCase())) {
            return null;
          }
          return origGetResponseHeader.call(this, header);
        } catch {
          return null;
        }
      };
    }
  } catch {
    // Graceful fallback
  }
}
