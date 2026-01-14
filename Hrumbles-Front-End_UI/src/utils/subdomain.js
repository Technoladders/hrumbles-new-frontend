// src/utils/subdomain.js

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname.trim().toLowerCase();
  
  // 1. Handle localhost / IPs
  const hostWithoutPort = hostname.split(":")[0];
  if (
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort.startsWith("192.168.") ||
    hostWithoutPort.startsWith("10.")
  ) {
    return null;
  }

  const parts = hostWithoutPort.split(".");
  // Need at least domain + tld (e.g. xrilic.ai)
  if (parts.length < 2) return null;

  // 2. Define Platform Prefixes (Reserved Subdomains)
  // These should NEVER be considered an organization name
  const platformPrefixes = new Set([
    "app", "www", "api", "admin", "portal", "auth",
    "dev", "development", "stage", "staging", "test", "preview", "qa", "ci",
  
  ]);

  // 3. Extract Potential Subdomain
  const tld = parts[parts.length - 1];
  const domain = parts[parts.length - 2];
  const root = domain + "." + tld;

  const knownRoots = new Set(["hrumbles.ai", "xrilic.ai"]);
  let potentialSubdomain = null;

  if (knownRoots.has(root)) {
    // Case: app.xrilic.ai -> parts: ['app', 'xrilic', 'ai']
    // We only care if there are exactly 3 parts (subdomain + domain + tld)
    // or more if handling deep nesting, but usually 3.
    if (parts.length >= 3) {
      potentialSubdomain = parts[0]; 
    } else {
      return null; // Just xrilic.ai
    }
  } else {
    // Unknown root (e.g. custom domain), take the first part
    potentialSubdomain = parts[0];
  }

  // 4. Validate Subdomain
  if (!potentialSubdomain) return null;

  // If the found subdomain is reserved (e.g. "app"), return null
  if (platformPrefixes.has(potentialSubdomain)) {
    return null;
  }

  return potentialSubdomain;
};