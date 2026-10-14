const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const documentRoutes = require("./src/routes/document.route");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/documents", documentRoutes);

app.get("/", (req, res) => res.json({ message: "Server is running" }));

module.exports = app;
