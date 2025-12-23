// src/utils/subdomain.js (FINAL & ROBUST VERSION)

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname;

  // This environment variable is the key. It's set during the build process
  // from your .env files (.env.dev, .env.production, etc.).
  const rootDomain = import.meta.env.VITE_APP_ROOT_DOMAIN;

  // --- Case 1: Local Development (localhost) ---
  // This logic runs first and is self-contained.
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    // Handles 'technoladders.localhost:5173' -> returns 'technoladders'
    // Ignores 'localhost:5173'
    if (parts.length > 1 && parts[1] === 'localhost') {
      return parts[0];
    }
    // If it's just 'localhost', we need to show the domain verification page.
    return null;
  }

  // --- Case 2: Deployed Environments (hrumbles.ai, xrilic.ai, etc.) ---
  // If the rootDomain is not defined in the build, we can't proceed.
  if (!rootDomain) {
    console.error("VITE_APP_ROOT_DOMAIN is not defined in the environment variables!");
    return null;
  }

  // A) The user is on the root domain itself (e.g., "xrilic.ai", "www.xrilic.ai", "dev.xrilic.ai").
  // This means no organization is specified, so we must show the verification page.
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  // B) The hostname ends with the root domain. This is the main logic.
  // It handles "demo.xrilic.ai", "demo.dev.xrilic.ai", and "demo.hrumbles.ai" all correctly.
  if (hostname.endsWith(`.${rootDomain}`)) {
    // This removes the root domain part to isolate the organization's subdomain.
    // Example: "demo.dev.xrilic.ai".slice(0, -"dev.xrilic.ai".length - 1) => "demo"
    const subdomain = hostname.slice(0, hostname.length - rootDomain.length - 1);
    return subdomain;
  }
  
  // If none of the above conditions are met, it's an unknown state.
  return null;
};