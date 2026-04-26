const mongoose = require("mongoose");

async function connectDb(mongoUri) {
  mongoose.set("strictQuery", true);
  mongoose.set("sanitizeFilter", true);

  await mongoose.connect(mongoUri, {
    autoIndex: false,
  });

  return mongoose.connection;
}

module.exports = { connectDb };
