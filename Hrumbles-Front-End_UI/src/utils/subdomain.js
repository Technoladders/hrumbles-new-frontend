// src/utils/subdomain.js

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname.trim().toLowerCase();

  // Remove port if present (localhost:3000 → localhost)
  const hostWithoutPort = hostname.split(":")[0];

  // Special case: pure localhost / loopback / private IPs
  if (
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort.startsWith("192.168.") ||
    hostWithoutPort.startsWith("10.")
  ) {
    return null;
  }

  const parts = hostWithoutPort.split(".");

  // Need at least domain + tld
  if (parts.length < 2) {
    return null;
  }

  const tld = parts[parts.length - 1];
  const domain = parts[parts.length - 2];
  const root = domain + "." + tld;

  // Your known main root domains
  const knownRoots = new Set(["hrumbles.ai", "xrilic.ai"]);

  let potentialSubdomain;

  if (knownRoots.has(root)) {
    // Standard case: xxx.hrumbles.ai / xxx.xrilic.ai
    if (parts.length === 3) {
      potentialSubdomain = parts[0];
    }
    // More complex: demo.dev.xrilic.ai, staging.company.hrumbles.ai
    else if (parts.length > 3) {
      potentialSubdomain = parts[0];
    } else {
      return null;
    }
  } else {
    // Unknown root domain → conservative: take first part
    potentialSubdomain = parts[0];
  }

  // List of platform/infrastructure prefixes that should NOT be treated as organization subdomains
  const platformPrefixes = new Set([
    "app",
    "www",
    "api",
    "admin",
    "portal",
    "auth",
    "dev",
    "development",
    "stage",
    "staging",
    "test",
    "preview",
    "qa",
    "ci",
    
  ]);

  // If we got a platform prefix → treat as no organization subdomain
  if (platformPrefixes.has(potentialSubdomain)) {
    return null;
  }

  // Optional: minimal sanity check
  if (potentialSubdomain.length < 2) {
    return null;
  }

  return potentialSubdomain;
};