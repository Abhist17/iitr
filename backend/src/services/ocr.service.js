const { spawn } = require("child_process");
const path = require("path");

async function extractText(imagePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../../ocr_service/paddle_ocr.py");
    const pythonPath = "/home/abhi/Desktop/iitr/backend/venv/bin/python3";

    console.log("Starting PaddleOCR on:", imagePath);

    const child = spawn(pythonPath, [scriptPath, imagePath]);

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => { output += data.toString(); });
    child.stderr.on("data", (data) => { errorOutput += data.toString(); });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("PaddleOCR stderr:", errorOutput);
        return reject(new Error(`PaddleOCR failed with code ${code}: ${errorOutput}`));
      }
      console.log("PaddleOCR complete.");
      resolve(output.trim());
    });
  });
}

module.exports = { extractText };
