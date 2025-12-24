// src/utils/subdomain.js (or .ts)

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname;

  // 1. Handle Localhost / IP
  // If you are using "localhost", there is no subdomain.
  // If you use "demo.localhost", this will correctly return "demo".
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');

  // 2. Safety Check: If there are no parts (shouldn't happen)
  if (parts.length < 2) {
    return null;
  }

  // 3. Handle "www" prefix (e.g., www.demo.hrumbles.ai)
  if (parts[0] === 'www') {
    return parts[1];
  }

  // 4. ✅ THE FIX: Always take the very first part
  // e.g., "demo.dev.xrilic.ai" -> returns "demo"
  // e.g., "demo.hrumbles.ai"   -> returns "demo"
  return parts[0];
};