const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "UP",
    env: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

module.exports = router;