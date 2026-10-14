const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function compressImage(inputPath) {
  try {
    const stats = fs.statSync(inputPath);
    const fileSize = stats.size; // bytes

    console.log("Original Size:", (fileSize / (1024 * 1024)).toFixed(2), "MB");

    // 1 MB = 1048576 bytes
    const MAX_SIZE = 1 * 1024 * 1024;

    // If file is already less than 1MB
    if (fileSize <= MAX_SIZE) {
      console.log("Image already under 1MB. No compression needed.");
      return inputPath;
    }

    // If file > 1MB compress it
    const outputPath = path.join(
      path.dirname(inputPath),
      "compressed-" + path.basename(inputPath)
    );

    await sharp(inputPath)
      .resize(1200) // reduce resolution
      .jpeg({ quality: 70 }) // reduce quality
      .toFile(outputPath);

    const compressedSize = fs.statSync(outputPath).size;

    console.log(
      "Compressed Size:",
      (compressedSize / (1024 * 1024)).toFixed(2),
      "MB"
    );

    return outputPath;
  } catch (error) {
    console.error("Compression Error:", error);
  }
}

module.exports = { compressImage };