const express = require("express");
const app = express();

app.use(express.json());

let authors = [];


// GET ALL
app.get("/authors", (req, res) => {
  res.json(authors);
});


// GET BY ID 
app.get("/authors/:id", (req, res) => {
  const id = Number(req.params.id);
  const author = authors.find(a => a.id === id);

  if (!author) return res.status(404).json({ message: "Author not found.." });

  res.json(author);
});


// POST req
app.post("/authors", (req, res) => {
  const author = {
    id: authors.length + 1,
    name: req.body.name
  };

  authors.push(author);

  res.status(201).json({
    message: "Author added successfully..",
    author
  });
});


// PUT req (FULL UPDATE) 
app.put("/authors/:id", (req, res) => {
  const id = Number(req.params.id);
  const author = authors.find(a => a.id === id);

  if (!author) return res.status(404).json({ message: "Author not found.." });

  author.name = req.body.name;

  res.json({
    message: "Author fully updated..",
    author
  });
});


// PATCH req (PARTIAL UPDATE)
app.patch("/authors/:id", (req, res) => {
  const id = Number(req.params.id);
  const author = authors.find(a => a.id === id);

  if (!author) return res.status(404).json({ message: "Author not found.." });

  Object.assign(author, req.body);

  res.json({
    message: "Author partially updated..",
    author
  });
});


// DELETE req
app.delete("/authors/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = authors.findIndex(a => a.id === id);

  if (index === -1)
    return res.status(404).json({ message: "Author not found.." });

  authors.splice(index, 1);

  res.json({ message: "Author deleted successfully.." });
});


app.listen(8000, () => {
  console.log("Server started successfully..");
});
