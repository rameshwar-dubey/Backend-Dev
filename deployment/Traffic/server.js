const express = require("express");
const connectDB = require("./config/db");

const app = express();
app.use(express.json());

connectDB();

app.use("/products", require("./routes/product"));
app.use("/checkout", require("./routes/checkout"));

app.listen(3000, () => console.log("Server running"));