const express = require("express");
const { z } = require("zod");

const { User, Roles } = require("../models/User");
const DoctorProfile = require("../models/DoctorProfile");
const { validateBody } = require("../middleware/validate");
const { sanitizePlainText, escapeRegex } = require("../utils/sanitizers");

const router = express.Router();

// Search doctors (protect against injection by only allowing string query and safe regex)
const searchSchema = z.object({
  q: z.string().min(1).max(80),
});

router.post("/search", validateBody(searchSchema), async (req, res) => {
  const q = sanitizePlainText(req.body.q, { maxLen: 80 });
  const rx = new RegExp(escapeRegex(q), "i");

  const doctors = await User.find({ role: Roles.Doctor, name: rx })
    .select("name email")
    .limit(20);
  const ids = doctors.map((d) => d._id);
  const profiles = await DoctorProfile.find({ userId: { $in: ids } }).select(
    "userId specialty clinic",
  );
  const map = new Map(profiles.map((p) => [String(p.userId), p]));

  res.json({
    items: doctors.map((d) => ({
      id: String(d._id),
      name: d.name,
      specialty: map.get(String(d._id))?.specialty || "",
      clinic: map.get(String(d._id))?.clinic || "",
    })),
  });
});

module.exports = router;
