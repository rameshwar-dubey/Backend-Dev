const mongoose = require("mongoose");

const DataSchema = new mongoose.Schema({
  name: String,
  value: Number
});

module.exports = mongoose.model("Data", DataSchema);