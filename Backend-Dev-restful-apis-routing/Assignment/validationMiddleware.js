const express = require("express");
const app = express();

app.use(express.json());

const validateYear = (req, res, next) => {
  const year = req.body.year;
  const current = new Date().getFullYear();

  if (isNaN(year) || year < 1500 || year > current)
    return res.status(400).json({ error: "Invalid year" });

  next();
};

app.post("/books", validateYear, (req, res) => {
  res.json({ message: "Book added", data: req.body });
});

app.listen(8000, () => {
  console.log("Server started successfully..");
});
