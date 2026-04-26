const express = require("express");
const router = express.Router();
const controller = require("../controllers/dataController");

router.get("/", controller.getAllData);
router.get("/:id", controller.getDataById);

module.exports = router;