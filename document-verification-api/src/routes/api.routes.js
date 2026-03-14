// // src/routes/api.routes.js
// const express = require("express");
// const router = express.Router();
// const upload = require("../config/multer.config");

// const { uploadDocument } = require("../controllers/upload.controller");
// const { processDocument } = require("../controllers/process.controller");
// const { extractFields } = require("../controllers/extract.controller");
// const { verifyDocumentHandler } = require("../controllers/verify.controller");

// router.post("/upload", upload.single("document"), uploadDocument);
// router.post("/process", upload.single("document"), processDocument);
// router.post("/extract", upload.single("document"), extractFields);

// // ✅ NO upload middleware — verify accepts JSON body only
// router.post("/verify", verifyDocumentHandler);

// router.get("/status/:document_id", (req, res) => {
//   const fs = require("fs");
//   const path = require("path");
//   const docId = req.params.document_id;

//   const files = {
//     report:       path.join("processed", `${docId}_report.json`),
//     fields:       path.join("processed", `${docId}_extracted.json`),
//     vision_fields:path.join("processed", `${docId}_vision_fields.json`),
//     form_data:    path.join("processed", `${docId}_formdata.json`),
//     ocr_text:     path.join("processed", `${docId}_ocr.txt`),
//   };

//   const result = { document_id: docId };

//   for (const [key, filePath] of Object.entries(files)) {
//     if (fs.existsSync(filePath)) {
//       const content = fs.readFileSync(filePath, "utf-8");
//       try { result[key] = JSON.parse(content); }
//       catch { result[key] = content; }
//     }
//   }

//   if (Object.keys(result).length === 1) {
//     return res.status(404).json({ success: false, error: `No data found for document ID: ${docId}` });
//   }

//   return res.json({ success: true, ...result });
// });

// module.exports = router;



// src/routes/api.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");

const { uploadDocument }      = require("../controllers/upload.controller");
const { processDocument }     = require("../controllers/process.controller");
const { extractFields }       = require("../controllers/extract.controller");
const { verifyDocumentHandler } = require("../controllers/verify.controller");

/**
 * PIPELINE (run in order):
 *
 *  1. POST /api/upload   — upload file → get document_id
 *  2. POST /api/process  — { document_id } → preprocess + OCR
 *  3. POST /api/extract  — { document_id } → structured fields
 *  4. POST /api/verify   — { document_id, name, dob, ... } → verification report
 */

// Step 1 — file upload only (multer handles multipart)
router.post("/upload", upload.single("document"), uploadDocument);

// Steps 2-4 — JSON body only, no file needed
router.post("/process", processDocument);
router.post("/extract", extractFields);
router.post("/verify",  verifyDocumentHandler);

/**
 * GET /api/status/:document_id
 * Retrieve any saved artefacts for a document
 */
router.get("/status/:document_id", (req, res) => {
  const fs   = require("fs");
  const path = require("path");
  const docId = req.params.document_id;

  const files = {
    meta:         path.join("processed", `${docId}_meta.json`),
    form_data:    path.join("processed", `${docId}_formdata.json`),
    ocr:          path.join("processed", `${docId}_ocr.json`),
    variants:     path.join("processed", `${docId}_variants.json`),
    extracted:    path.join("processed", `${docId}_extracted.json`),
    report:       path.join("processed", `${docId}_report.json`),
  };

  const result = { document_id: docId };

  for (const [key, filePath] of Object.entries(files)) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      try { result[key] = JSON.parse(content); }
      catch { result[key] = content; }
    }
  }

  if (Object.keys(result).length === 1) {
    return res.status(404).json({
      success: false,
      error: `No data found for document_id: ${docId}`,
    });
  }

  return res.json({ success: true, ...result });
});

module.exports = router;