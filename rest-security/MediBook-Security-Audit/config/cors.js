function parseOriginList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildAllowedOriginsFromEnv(env) {
  return [
    ...parseOriginList(env.WEB_ORIGINS),
    ...parseOriginList(env.MOBILE_ORIGINS),
  ];
}

module.exports = { parseOriginList, buildAllowedOriginsFromEnv };
