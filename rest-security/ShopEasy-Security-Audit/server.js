const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const helmet = require("helmet");

const app = express();

app.use(express.json());

// Helmet
app.use(helmet());

// Session
app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 15,
    },
  }),
);

// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/products", require("./routes/productRoutes"));
app.use("/reviews", require("./routes/reviewRoutes"));

app.listen(3000, () => console.log("Server running"));
