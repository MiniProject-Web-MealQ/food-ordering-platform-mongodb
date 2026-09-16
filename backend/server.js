const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");

const app = express();

app.use(express.json());

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});