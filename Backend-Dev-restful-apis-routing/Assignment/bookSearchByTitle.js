const express = require("express");
const app = express();

let books = [
  { id: 1, title: "Java Basics" },
  { id: 2, title: "Spring Boot" },
  { id: 3, title: "Clean Code" }
];

app.get("/books/search", (req, res) => {
  const { title } = req.query;

  const result = books.filter(b =>
    b.title.toLowerCase().includes(title.toLowerCase())
  );

  res.json(result);
});

app.listen(8000, () => {
  console.log("Server started successfully..");
});
