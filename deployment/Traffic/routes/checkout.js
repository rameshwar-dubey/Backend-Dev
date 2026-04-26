const express = require("express");
const router = express.Router();
const orderQueue = require("../queue/orderQueue");

router.post("/", async (req, res) => {
  await orderQueue.add("order", req.body);
  res.json({ message: "Order queued" });
});

module.exports = router;