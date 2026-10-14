// src/routes/document.route.js
const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload.middleware");
const { processDocument, getVerificationStatus } = require("../controllers/document.controller");

router.post("/upload", upload.single("document"), processDocument);
router.get("/status/:applicationId", getVerificationStatus);

module.exports = router;