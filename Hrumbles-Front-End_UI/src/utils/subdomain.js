// src/utils/subdomain.js (FINAL CORRECTED VERSION)

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname;
  
  // This is loaded from your .env files (.env.dev, .env.staging, etc.)
  const rootDomain = import.meta.env.VITE_APP_ROOT_DOMAIN;

  console.log("RUNNING NEW SUBDOMAIN LOGIC - V2"); 

  // --- Case 1: Handle Local Development ---
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    // For "demo.localhost:8081", this returns "demo"
    if (parts.length > 1 && parts[1] === 'localhost') {
      return parts[0];
    }
    // For "localhost:8081", this returns null
    return null;
  }

  // If we are in a deployed environment, rootDomain MUST be set.
  if (!rootDomain) {
    console.error("VITE_APP_ROOT_DOMAIN is not set in the environment variables!");
    return null;
  }

  // --- Case 2: Handle Deployed Environments ---

  // A) Check if the user is on the root domain itself (e.g., "xrilic.ai", "www.xrilic.ai", "dev.xrilic.ai")
  // These should all trigger the domain verification page.
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  // B) This is the core logic. Check if the hostname ends with the root domain.
  if (hostname.endsWith(`.${rootDomain}`)) {
    // This robustly removes the root domain and the preceding dot.
    // Example 1: "demo.dev.xrilic.ai".replace(".dev.xrilic.ai", "") => "demo"
    // Example 2: "demo.xrilic.ai".replace(".xrilic.ai", "") => "demo"
    const subdomain = hostname.replace(`.${rootDomain}`, '');
    return subdomain;
  }
  
  // If no other condition matches, return null.
  return null;
};