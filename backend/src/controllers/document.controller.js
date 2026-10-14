// src/controllers/document.controller.js
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const { compressImage }      = require("../services/compression.service");
const { preprocessImage }    = require("../services/preprocessing.service");
const { extractText }        = require("../services/ocr.service");
const { extractAadhaarData } = require("../services/extraction.service");
const { validateDocuments }  = require("../services/validation.service");

// Uncomment these once IPFS + Blockchain keys are in .env
// const { uploadToIPFS, uploadJSONToIPFS }            = require("../services/ipfs.service");
// const { submitDocumentToBlockchain, getDocumentRecord } = require("../services/blockchain.service");

async function processDocument(req, res) {
  try {

    // ── Guard: file must exist ──────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. In Thunder Client → Body → Form, set the 'document' field type to File.",
      });
    }

    const filePath      = req.file.path;
    const applicationData = req.body;          // name, dob, gender from form
    const applicationId   = uuidv4();

    console.log("\n=== STARTING DOCUMENT PIPELINE ===");
    console.log("Application ID :", applicationId);
    console.log("File Path      :", filePath);
    console.log("Form Data      :", applicationData);

    // ── STEP 1 — Compression ───────────────────────────────────────────────
    console.log("\n[1/5] Compressing...");
    const compressedPath = await compressImage(filePath);
    console.log("Compressed path:", compressedPath);

    // ── STEP 2 — Preprocessing ─────────────────────────────────────────────
    console.log("\n[2/5] Preprocessing...");
    const processedPath = await preprocessImage(compressedPath);
    console.log("Processed path:", processedPath);

    // ── STEP 3 — PaddleOCR ─────────────────────────────────────────────────
    console.log("\n[3/5] Running PaddleOCR...");
    const ocrRawOutput = await extractText(processedPath);

    let ocrResult;
    try {
      ocrResult = JSON.parse(ocrRawOutput);
    } catch {
      // fallback if paddle_ocr.py returns plain text instead of JSON
      ocrResult = { raw_text: ocrRawOutput, structured: [] };
    }

    console.log("OCR Raw Text:\n", ocrResult.raw_text);

    // ── STEP 4 — Field Extraction ──────────────────────────────────────────
    console.log("\n[4/5] Extracting Aadhaar fields...");
    const extractedData = extractAadhaarData(ocrResult.raw_text);
    console.log("Extracted Data:", extractedData);

    // Average OCR confidence across all words
    const avgConfidence =
      ocrResult.structured.length
        ? ocrResult.structured.reduce((sum, w) => sum + w.confidence, 0) /
          ocrResult.structured.length
        : 0.85;

    // ── STEP 5 — Cross-Document Validation ────────────────────────────────
    console.log("\n[5/5] Validating fields against form data...");
    const validationResult = validateDocuments(extractedData, applicationData);
    console.log("Validation Status :", validationResult.status);
    console.log("Overall Score     :", validationResult.overall_score);

    console.log("\n=== PIPELINE COMPLETE ===\n");

    // ── Response ──────────────────────────────────────────────────────────
    return res.json({
      success: true,
      application_id: applicationId,
      ocr: {
        raw_text:       ocrResult.raw_text,
        avg_confidence: parseFloat(avgConfidence.toFixed(4)),
        word_count:     ocrResult.structured.length,
      },
      extracted_data: extractedData,
      validation:     validationResult,

      // ── Uncomment after IPFS + Blockchain are configured ──
      // ipfs: {
      //   document_cid: ipfsResult.cid,
      //   document_url: ipfsResult.ipfsUrl,
      //   record_cid:   ipfsJsonResult.cid,
      //   record_url:   ipfsJsonResult.ipfsUrl,
      // },
      // blockchain: {
      //   tx_hash:       blockchainResult.txHash,
      //   block_number:  blockchainResult.blockNumber,
      //   document_hash: blockchainResult.documentHash,
      // },
    });

  } catch (error) {
    console.error("\nPIPELINE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getVerificationStatus(req, res) {
  try {
    // const { applicationId } = req.params;
    // const record = await getDocumentRecord(applicationId);
    // return res.json({ success: true, record });

    // Placeholder until blockchain is configured
    return res.json({
      success: true,
      message: "Blockchain not configured yet. Add CONTRACT_ADDRESS and PRIVATE_KEY to .env",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { processDocument, getVerificationStatus };