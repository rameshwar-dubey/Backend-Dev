const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { getCache, setCache } = require("../cache/cacheService");

router.get("/", async (req, res) => {
  const cached = await getCache("products");

  if (cached) return res.json(cached);

  const products = await Product.find();

  await setCache("products", products, 120);

  res.json(products);
});

module.exports = router;