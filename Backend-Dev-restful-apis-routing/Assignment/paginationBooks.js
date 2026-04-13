const express = require("express");
const app = express();

let books = [];

for (let i = 1; i <= 50; i++) {
  books.push({
    id: i,
    title: "Book " + i,
    author: "Author " + i,
    year: 2000 + (i % 20)
  });
}

app.get("/books", (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;

  let result = [];

  let start = (page - 1) * limit;

  for (let i = start; i < start + limit && i < books.length; i++) {
    result.push(books[i]);
  }

  res.json(result);
});

app.listen(8000, () => {
  console.log("Server started successfully..");
});
