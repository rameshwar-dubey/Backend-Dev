const router = require("express").Router();
const xss = require("xss");

router.post("/", (req, res) => {
  const clean = xss(req.body.text);

  // save clean review
});