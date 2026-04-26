const net = require("net");

function isPrivateIp(ip) {
  // ipv4 only (good enough for typical dev); if it's not ipv4, treat as unsafe
  if (!net.isIP(ip) || net.isIP(ip) !== 4) return true;

  const [a, b] = ip.split(".").map((x) => Number.parseInt(x, 10));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isSafeExternalUrl(input) {
  try {
    const url = new URL(input);

    if (url.username || url.password) return false;
    if (url.protocol !== "https:") return false;
    if (!url.hostname) return false;

    const host = url.hostname.toLowerCase();
    if (host === "localhost") return false;

    // block direct IPs (helps reduce SSRF/malicious redirects)
    if (net.isIP(host)) {
      if (isPrivateIp(host)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

module.exports = { isSafeExternalUrl };
