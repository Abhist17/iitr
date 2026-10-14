// src/services/preprocessing.service.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

async function preprocessImage(imagePath) {
  const processedDir = path.join(__dirname, "../../processed");

  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  const outputPath = path.join(
    processedDir,
    "processed_" + Date.now() + "_" + path.basename(imagePath)
  );

  await sharp(imagePath)
    .grayscale()
    .normalize()
    .sharpen()
    .toFile(outputPath);

  return outputPath;
}

module.exports = { preprocessImage };