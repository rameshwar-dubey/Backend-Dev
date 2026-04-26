const Data = require("../models/Data");

exports.getAllData = async (req, res) => {
  const data = await Data.find();
  res.json(data);
};

exports.getDataById = async (req, res) => {
  const data = await Data.findById(req.params.id);
  res.json(data);
};