// src/utils/domain.ts  (create this file)

export const getRootDomain = (): string => {
  // 1. First priority: build-time env variable
  if (import.meta.env.VITE_APP_ROOT_DOMAIN) {
    return import.meta.env.VITE_APP_ROOT_DOMAIN;
  }

  // 2. Fallback: try to detect from current location (good for localhost & production)
  const hostname = window.location.hostname;

  // Remove port if present
  const cleanHost = hostname.split(':')[0];

  // Very basic heuristic: assume last two parts are root domain
  // Examples: app.hrumbles.ai → hrumbles.ai
  //           localhost → localhost
  //           staging.xrilic.ai → xrilic.ai
  const parts = cleanHost.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  // Ultimate fallback
  return cleanHost;
};