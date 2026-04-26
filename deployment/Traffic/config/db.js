const mongoose = require("mongoose");

module.exports = async () => {
  await mongoose.connect(process.env.DB_URI, {
    maxPoolSize: 100
  });
  console.log("DB connected");
};