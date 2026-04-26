const { parseOriginList } = require("./cors");

function buildHelmetConfigFromEnv(env) {
  const s3 = parseOriginList(env.S3_MEDIA_HOSTS);
  const stripe = parseOriginList(env.STRIPE_HOSTS);
  const analytics = parseOriginList(env.ANALYTICS_HOSTS);
  const embed = parseOriginList(env.EMBED_HOSTS);

  // Note: For a pure JSON API, CSP primarily matters if you also render HTML.
  // We still set a conservative CSP suitable for any future server-rendered pages.
  const csp = {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],

      // If you serve any UI from this server later
      scriptSrc: ["'self'", ...stripe, ...analytics],
      connectSrc: ["'self'", ...stripe, ...analytics],
      imgSrc: ["'self'", "data:", ...analytics],

      // Video streaming (S3) and embedded materials
      mediaSrc: ["'self'", ...s3],
      frameSrc: ["'self'", ...embed, ...stripe],

      upgradeInsecureRequests: []
    }
  };

  return { contentSecurityPolicy: csp };
}

module.exports = { buildHelmetConfigFromEnv };
