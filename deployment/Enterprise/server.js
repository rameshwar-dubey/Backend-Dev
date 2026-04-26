require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`
});

const express = require("express");
const connectDB = require("./config/db");
const logger = require("./config/logger");

const app = express();

connectDB();

app.use(express.json());

app.use("/health", require("./routes/health"));
app.use("/data", require("./routes/data"));

app.listen(process.env.PORT, () => {
  logger.info(`Server running on ${process.env.PORT}`);
});