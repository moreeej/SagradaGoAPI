require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const allRoutes = require("./routes/routes");

const MONGO_URL = process.env.MONGO;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const data = ["jerome", "bryan", "virgo", "gege"];
app.get("/api/tryserver", (req, res) => {
  res.json({ message: data });
});

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch(err => console.error("MongoDB connection error:", err));

app.use("/api", allRoutes);

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
