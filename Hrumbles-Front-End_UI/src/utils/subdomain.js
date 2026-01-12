// src/utils/subdomain.js

export const getOrganizationSubdomain = () => {
  const hostname = window.location.hostname.trim().toLowerCase();
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
  if (parts.length < 2) return null;

  const tld = parts[parts.length - 1];
  const domain = parts[parts.length - 2];
  const root = domain + "." + tld;

  // Known main root domains
  const knownRoots = new Set(["hrumbles.ai", "xrilic.ai"]);

  let potentialSubdomain;

  if (knownRoots.has(root)) {
    if (parts.length >= 3) {
      potentialSubdomain = parts[0];
    } else {
      return null;
    }
  } else {
    potentialSubdomain = parts[0];
  }

  const platformPrefixes = new Set([
    "app", "www", "api", "admin", "portal", "auth",
    "dev", "development", "stage", "staging", "test", "preview", "qa", "ci"
  ]);

  if (platformPrefixes.has(potentialSubdomain)) {
    return null;
  }

  if (potentialSubdomain.length < 2) return null;

  return potentialSubdomain;
};