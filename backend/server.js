// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const documentRoutes = require("./src/routes/document.route");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || "uploads";
  fs.mkdirSync(uploadDir, { recursive: true });

// Routes
app.use("/api", documentRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Aadhaar OCR API is running" });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
