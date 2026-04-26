const crypto = require("crypto");

function getClientIp(req) {
  const raw = (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    ""
  ).toString();
  return raw.split(",")[0].trim();
}

function deviceFingerprint(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  const al = req.headers["accept-language"] || "";
  const chua = req.headers["sec-ch-ua"] || "";
  const platform = req.headers["sec-ch-ua-platform"] || "";
  const ip = getClientIp(req);

  const fpSource = [ua, al, chua, platform, ip].join("|");
  req.deviceFingerprint = crypto
    .createHash("sha256")
    .update(fpSource)
    .digest("hex");
  req.clientIp = ip;
  next();
}

module.exports = { deviceFingerprint, getClientIp };
