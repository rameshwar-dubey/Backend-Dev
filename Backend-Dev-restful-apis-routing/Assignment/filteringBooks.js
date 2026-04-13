const express = require("express");
const app = express();

let books = [
  { id: 1, title: "Java", author: "James", year: 2005 },
  { id: 2, title: "Spring", author: "Rod", year: 2018 },
  { id: 3, title: "Clean Code", author: "Robert", year: 2009 },
];

app.get("/books", (req, res) => {
  const { author, year } = req.query;

  let result = books;

  if (author)
    result = result.filter((b) => b.author.toLowerCase() === author.toLowerCase());
  if (year) 
    result = result.filter((b) => b.year == year);
    res.json(result);
});

app.listen(8000, () => {
  console.log("Server started successfully..");
});
