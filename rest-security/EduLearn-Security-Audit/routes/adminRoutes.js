const express = require("express");

const {
  requireAuth,
  attachCurrentUser,
  requireRole,
} = require("../middleware/auth");

const router = express.Router();

router.get(
  "/whoami",
  requireAuth,
  attachCurrentUser,
  requireRole(["Admin"]),
  (req, res) => {
    res.json({
      id: req.session.userId,
      role: req.currentUser.role,
      email: req.currentUser.email,
    });
  },
);

module.exports = router;
