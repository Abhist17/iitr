# DigiPramaan API
## Demo Video

[![Watch the Demo](https://img.youtube.com/vi/9aPlsfNwyk0/0.jpg)](https://youtu.be/9aPlsfNwyk0)

**Intelligent Document Processing & Upload Optimization Engine**

> IIT Roorkee Blockathon · Problem Statement 01 · Apuni Sarkar, Uttarakhand

---

## What This Is

A REST API that accepts Indian government identity documents (Aadhaar, PAN, Domicile, Income Certificate, Driving Licence, Caste Certificate), automatically processes them, and returns:

1. **Optimized files** — compressed + resolution-enhanced images ready for storage
2. **Structured extracted data** — all document fields parsed by AI
3. **Verification assessment** — field-level confidence scores + officer report

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Open .env and set AI_BACKEND + the matching API key (see below)

# 3. Run
npm run dev
```

Server starts at **http://localhost:3000**

Test it immediately — no file upload needed:

```bash
curl http://localhost:3000/api/demo | python3 -m json.tool
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/info` | API schema and configuration |
| `GET` | `/api/demo` | Full example response (no upload needed) |
| `POST` | `/api/verify` | **Main endpoint** — process documents |

---

## POST /api/verify

### Request

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `documents` | `File[]` | ✅ | JPG, PNG, or PDF. Up to 5 files. Max 15 MB each. |
| `application_id` | `string` | ✅ | Unique ID for this application |
| `name` | `string` | | Applicant full name |
| `dob` | `string` | | Date of birth — `DD/MM/YYYY` |
| `district` | `string` | | District name |
| `father_name` | `string` | | Father's name |
| `mobile` | `string` | | Mobile number |

### Test with curl

```bash
# Single document
curl -X POST http://localhost:3000/api/verify \
  -F "documents=@aadhaar.jpg" \
  -F "application_id=APP-001" \
  -F "name=Rahul Kumar" \
  -F "dob=15/08/1990" \
  -F "district=Dehradun"

# Multiple documents (cross-validation kicks in)
curl -X POST http://localhost:3000/api/verify \
  -F "documents=@aadhaar.jpg" \
  -F "documents=@pan.jpg" \
  -F "documents=@domicile.pdf" \
  -F "application_id=APP-001" \
  -F "name=Rahul Kumar" \
  -F "dob=15/08/1990" \
  -F "district=Dehradun"
```

### Response Structure

```json
{
  "application_id": "APP-001",
  "status": "verified",
  "application_score": 87,
  "total_documents": 2,
  "processed_documents": 2,
  "failed_documents": 0,

  "cross_validation": {
    "checked": true,
    "overall_passed": false,
    "passed": 1,
    "total": 2,
    "checks": [
      {
        "check": "name_consistency",
        "label": "Name matches across all documents",
        "passed": true,
        "values": [
          { "doc": "aadhaar", "value": "Rahul Kumar" },
          { "doc": "pan",     "value": "Rahul Kumar" }
        ],
        "flag_reason": null
      },
      {
        "check": "dob_consistency",
        "label": "Date of birth matches across all documents",
        "passed": false,
        "values": [
          { "doc": "aadhaar", "value": "15/08/1990" },
          { "doc": "pan",     "value": "15/08/1991" }
        ],
        "flag_reason": "DOB mismatch — Aadhaar: 15/08/1990, PAN: 15/08/1991"
      }
    ]
  },

  "documents": [
    {
      "document_name": "aadhaar.jpg",
      "doc_type": "aadhaar",
      "optimized_file": "/outputs/APP-001_doc1_optimized.jpg",

      "compression": {
        "original_size_kb": 4200,
        "original_dimensions": "3024x4032",
        "compressed_size_kb": 380,
        "optimized_dimensions": "2000x2667",
        "reduction_percent": 91,
        "upscaled": false,
        "note": "Image dimensions maintained, file size reduced"
      },

      "extracted_data": {
        "doc_type": "aadhaar",
        "name": "Rahul Kumar",
        "dob": "15/08/1990",
        "gender": "MALE",
        "aadhaar_number": "1234 5678 9012",
        "address": "123 Gandhi Nagar, Dehradun, Uttarakhand",
        "district": "Dehradun",
        "state": "Uttarakhand",
        "pincode": "248001",
        "confidence": "high"
      },

      "verification": {
        "is_verified": true,
        "overall_score": 100,
        "flagged_count": 0,
        "officer_summary": "All extracted fields are valid and match application data. Document appears genuine. No manual review required.",
        "fields": [
          {
            "field": "name",
            "label": "Full Name",
            "extracted_value": "Rahul Kumar",
            "form_value": "Rahul Kumar",
            "match": true,
            "confidence": 0.92,
            "confidence_label": "high",
            "flag_reason": null
          },
          {
            "field": "dob",
            "label": "Date of Birth",
            "extracted_value": "15/08/1990",
            "form_value": "15/08/1990",
            "match": true,
            "confidence": 0.92,
            "confidence_label": "high",
            "flag_reason": null
          }
        ]
      },

      "processing_ms": 2341,
      "status": "success"
    }
  ],

  "meta": {
    "processing_time_ms": 4821,
    "latency_target_met": true,
    "ai_backend": "openrouter",
    "processed_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Pipeline

Every uploaded document goes through 7 stages:

```
POST /api/verify
      │
      ▼
[1] PDF → Image (if PDF uploaded)
    pdf2pic renders at 200 DPI
      │
      ▼
[2] Compress + Upscale   (Sharp + Lanczos3)
    • Input < 1800px  →  upscale to 2000px
    • Input 1800-2400px  →  keep dimensions
    • Input > 2400px  →  downscale to 2400px
    • normalize contrast, sharpen edges
    • produces: color file + grayscale OCR file
      │
      ▼
[3] OCR   (Tesseract.js — eng+hin)
    runs on grayscale image
    saves raw text to processed/
      │
      ▼
[4] AI Extraction   (OpenRouter / Gemini / Ollama)
    Step A: detect document type (temp 0.0)
    Step B: extract all fields (temp 0.1)
    fixes OCR errors: 0↔O, 1↔I, @↔a
      │
      ▼
[5] Verification Report
    per-field confidence scores
    match vs application form data
    flag reasons in plain English
    officer summary text
      │
      ▼
[6] Cross-Document Validation
    checks name, DOB, district consistency
    across ALL documents in the application
      │
      ▼
[7] API Response
    optimized file URLs + extracted data + report
```

---

## Compression Logic

This is real compression — not hardcoded values. Sharp reads the actual image dimensions and decides what to do.

| Input image | What happens | Why |
|---|---|---|
| Longest edge **< 1800px** | **Upscaled** to 2000px (Lanczos3) | Cheap phone photos are too small for reliable OCR |
| Longest edge **1800–2400px** | Dimensions unchanged, file compressed | Already good resolution |
| Longest edge **> 2400px** | Downscaled to 2400px | DSLR scans are larger than necessary |

**Applied to every image regardless:**
- `.rotate()` — auto-corrects phone camera EXIF orientation (tilted photos)
- `.normalize()` — stretches contrast so faint text becomes visible
- `.sharpen({ sigma: 1.2 })` — crisps text edges after resize
- Progressive JPEG — smaller file that loads faster in browsers

**Two output files per document:**
- `*_optimized.jpg` — full colour, for human officer review and long-term storage
- `*_ocr.jpg` — grayscale + contrast-boosted, fed into Tesseract for best OCR accuracy

**Real-world result:** A 4 MB blurry phone photo of an Aadhaar card becomes a 380 KB sharp, properly-exposed, high-resolution image — smaller file, better quality for OCR.

---

## AI Backend Options

Set `AI_BACKEND` in `.env`:

| Value | Service | Where to get key | Cost |
|---|---|---|---|
| `openrouter` | OpenRouter.ai | [openrouter.ai](https://openrouter.ai) | Free tier available |
| `gemini` | Google Gemini 1.5 Flash | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free (1500 req/day) |
| `ollama` | Local Ollama | No key needed | Free, runs locally |

**Recommended for hackathon:** `gemini` — free, no rate limit issues, handles Hindi text well.

**Best free OpenRouter model:**
```
OPENROUTER_MODEL=meta-llama/llama-3.2-11b-vision-instruct:free
```

---

## Supported Document Types

Auto-detected — you do not need to tell the API what type you are uploading.

| Document | Fields Extracted |
|---|---|
| Aadhaar Card | name, dob, gender, aadhaar_number, address, district, state, pincode |
| PAN Card | name, dob, pan_number, father_name |
| Domicile Certificate | name, dob, district, state, issue_date, issuing_authority |
| Income Certificate | name, district, annual_income, issue_date, issuing_authority |
| Driving Licence | name, dob, dl_number, valid_until, vehicle_class, address |
| Caste Certificate | name, caste, district, issue_date, issuing_authority |

---

## Environment Variables

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `AI_BACKEND` | Which AI service to use | `openrouter` |
| `OPENROUTER_API_KEY` | OpenRouter API key | — |
| `OPENROUTER_MODEL` | OpenRouter model name | `meta-llama/llama-3.2-11b-vision-instruct:free` |
| `OPENROUTER_SITE_URL` | Your site URL (sent in headers) | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `OLLAMA_API_BASE_URL` | Ollama server URL | `http://localhost:11434/v1` |
| `OLLAMA_MODEL` | Ollama model name | `qwen3` |
| `MAX_FILE_SIZE_MB` | Max upload size per file | `15` |
| `UPLOAD_DIR` | Raw uploads storage path | `./uploads` |
| `PROCESSED_DIR` | OCR + AI debug artifacts path | `./processed` |
| `OUTPUTS_DIR` | Optimized images path | `./outputs` |

---

## Project Structure

```
docuverify-api/
│
├── server.js                          ← starts Express server
├── package.json
├── .env.example                       ← copy to .env and fill in keys
│
├── src/
│   ├── app.js                         ← Express setup, CORS, routes, error handler
│   │
│   ├── config/
│   │   └── multer.config.js           ← file upload (type filter, 15MB limit)
│   │
│   ├── controllers/
│   │   └── verify.controller.js       ← orchestrates the 7-stage pipeline
│   │
│   ├── routes/
│   │   ├── verify.routes.js           ← POST /api/verify
│   │   └── info.routes.js             ← GET /api/health, /api/info, /api/demo
│   │
│   └── services/
│       ├── compression.service.js     ← upscale + compress + normalize (Sharp)
│       ├── pdf.service.js             ← PDF → JPEG (pdf2pic at 200 DPI)
│       ├── ocr.service.js             ← eng+hin text extraction (Tesseract.js)
│       ├── ai.service.js              ← doc detection + field extraction (multi-backend)
│       └── report.service.js          ← field validation, confidence, officer report
│
├── uploads/                           ← raw uploaded files (automatically cleaned)
├── processed/                         ← OCR .txt and AI .json debug files
├── outputs/                           ← optimized images served at /outputs/*
│
└── tests/
    └── test.api.js                    ← basic API smoke tests
```

---

## Error Responses

| HTTP Status | Error | Cause |
|---|---|---|
| `400` | `No documents uploaded` | Request sent without files |
| `400` | `application_id is required` | Missing required body field |
| `415` | `Unsupported file type` | File is not JPG, PNG, or PDF |
| `413` | `File too large` | File exceeds `MAX_FILE_SIZE_MB` |
| `500` | `Pipeline failed unexpectedly` | Unhandled internal error — check server logs |

Individual documents that fail mid-pipeline return `status: "failed"` inside the `documents` array. The API still returns `200` for the overall request with other documents processed successfully.

---

## Performance

PS01 requirement: **processing time under 10 seconds per document set**

Every response includes:

```json
"meta": {
  "processing_time_ms": 4821,
  "latency_target_met": true
}
```

Typical times per document:

| Stage | Time |
|---|---|
| Compression (Sharp) | ~150–300ms |
| OCR (Tesseract eng+hin) | ~2–4s |
| AI extraction (OpenRouter free) | ~1–2s |
| Report generation | ~5ms |
| **Total per document** | **~4–7s** ✅ |

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `sharp` | Image compression, upscaling, normalization |
| `tesseract.js` | OCR — English and Hindi/Devanagari |
| `pdf2pic` | Converts PDF pages to JPEG images |
| `multer` | Multipart file upload handling |
| `node-fetch` | HTTP calls to AI backend APIs |
| `dotenv` | Loads `.env` into `process.env` |
| `cors` | Allows cross-origin requests from frontend |
| `nodemon` | Auto-restarts server during development |

Install all:
```bash
npm install
```

For PDF support, also install GraphicsMagick:
```bash
# Ubuntu / Debian
sudo apt-get install graphicsmagick

# macOS
brew install graphicsmagick
```

---

## Connecting the Frontend

If you are running the Lovable frontend, update its environment:

```bash
# frontend/.env.local
VITE_BACKEND_URL=http://localhost:3000
```

The frontend calls `POST /api/verify` and renders the `documents[].verification.fields` table and `cross_validation.checks` on the dashboard.

---

## Built For

IIT Roorkee Blockathon — Problem Statement 01
Intelligent Document Processing & Upload Optimization Engine
Apuni Sarkar Citizen Services Portal, Uttarakhand
