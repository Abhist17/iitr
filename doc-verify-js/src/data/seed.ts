import { Application, Document, ExtractedField, ValidationResult } from "@/types/docverify";

export const seedExtractedFields: Record<string, ExtractedField[]> = {
  // App 1001 - Aadhaar
  "doc-1001-aadhaar": [
    { id: "ef-1", document_id: "doc-1001-aadhaar", field_name: "Name", field_value: "RAHUL KUMAR", confidence_score: 96 },
    { id: "ef-2", document_id: "doc-1001-aadhaar", field_name: "DOB", field_value: "15/08/1990", confidence_score: 94 },
    { id: "ef-3", document_id: "doc-1001-aadhaar", field_name: "Address", field_value: "42, MG Road, Lucknow", confidence_score: 88 },
    { id: "ef-4", document_id: "doc-1001-aadhaar", field_name: "District", field_value: "Lucknow", confidence_score: 97 },
    { id: "ef-5", document_id: "doc-1001-aadhaar", field_name: "Aadhaar Number", field_value: "9234 5678 1234", confidence_score: 99 },
  ],
  // App 1001 - PAN
  "doc-1001-pan": [
    { id: "ef-6", document_id: "doc-1001-pan", field_name: "Name", field_value: "RAHUL KUMAR", confidence_score: 95 },
    { id: "ef-7", document_id: "doc-1001-pan", field_name: "DOB", field_value: "15/08/1990", confidence_score: 93 },
    { id: "ef-8", document_id: "doc-1001-pan", field_name: "PAN Number", field_value: "ABCPK1234E", confidence_score: 98 },
  ],
  // App 1001 - Domicile
  "doc-1001-domicile": [
    { id: "ef-9", document_id: "doc-1001-domicile", field_name: "Name", field_value: "RAHUL KUMAR", confidence_score: 91 },
    { id: "ef-10", document_id: "doc-1001-domicile", field_name: "District", field_value: "Lucknow", confidence_score: 95 },
    { id: "ef-11", document_id: "doc-1001-domicile", field_name: "Address", field_value: "42, MG Road, Lucknow", confidence_score: 85 },
  ],
  // App 1002 - Aadhaar
  "doc-1002-aadhaar": [
    { id: "ef-12", document_id: "doc-1002-aadhaar", field_name: "Name", field_value: "PRIYA SHARMA", confidence_score: 94 },
    { id: "ef-13", document_id: "doc-1002-aadhaar", field_name: "DOB", field_value: "22/03/1995", confidence_score: 92 },
    { id: "ef-14", document_id: "doc-1002-aadhaar", field_name: "District", field_value: "Varanasi", confidence_score: 96 },
    { id: "ef-15", document_id: "doc-1002-aadhaar", field_name: "Aadhaar Number", field_value: "8123 4567 8901", confidence_score: 98 },
  ],
  // App 1002 - PAN
  "doc-1002-pan": [
    { id: "ef-16", document_id: "doc-1002-pan", field_name: "Name", field_value: "P. SHARMA", confidence_score: 89 },
    { id: "ef-17", document_id: "doc-1002-pan", field_name: "DOB", field_value: "22/03/1995", confidence_score: 91 },
    { id: "ef-18", document_id: "doc-1002-pan", field_name: "PAN Number", field_value: "DEFPS5678G", confidence_score: 97 },
  ],
  // App 1003 - Aadhaar
  "doc-1003-aadhaar": [
    { id: "ef-19", document_id: "doc-1003-aadhaar", field_name: "Name", field_value: "AMIT VERMA", confidence_score: 72 },
    { id: "ef-20", document_id: "doc-1003-aadhaar", field_name: "DOB", field_value: "10/12/1988", confidence_score: 68 },
    { id: "ef-21", document_id: "doc-1003-aadhaar", field_name: "District", field_value: "Kanpur", confidence_score: 75 },
  ],
  // App 1003 - Income Certificate
  "doc-1003-income": [
    { id: "ef-22", document_id: "doc-1003-income", field_name: "Name", field_value: "AMIT VERM", confidence_score: 38 },
    { id: "ef-23", document_id: "doc-1003-income", field_name: "Income", field_value: "₹2,40,000", confidence_score: 42 },
    { id: "ef-24", document_id: "doc-1003-income", field_name: "District", field_value: "Kanp", confidence_score: 31 },
  ],
};

export const seedDocuments: Document[] = [
  { id: "doc-1001-aadhaar", application_id: "app-1001", doc_type: "Aadhaar", original_size_kb: 4800, compressed_size_kb: 380, storage_path: "", ocr_status: "completed", raw_ocr_text: "RAHUL KUMAR...", created_at: "2025-03-10T10:00:00Z" },
  { id: "doc-1001-pan", application_id: "app-1001", doc_type: "PAN Card", original_size_kb: 3200, compressed_size_kb: 290, storage_path: "", ocr_status: "completed", raw_ocr_text: "RAHUL KUMAR...", created_at: "2025-03-10T10:01:00Z" },
  { id: "doc-1001-domicile", application_id: "app-1001", doc_type: "Domicile Certificate", original_size_kb: 5100, compressed_size_kb: 410, storage_path: "", ocr_status: "completed", raw_ocr_text: "RAHUL KUMAR...", created_at: "2025-03-10T10:02:00Z" },
  { id: "doc-1002-aadhaar", application_id: "app-1002", doc_type: "Aadhaar", original_size_kb: 4200, compressed_size_kb: 350, storage_path: "", ocr_status: "completed", raw_ocr_text: "PRIYA SHARMA...", created_at: "2025-03-11T14:00:00Z" },
  { id: "doc-1002-pan", application_id: "app-1002", doc_type: "PAN Card", original_size_kb: 2900, compressed_size_kb: 260, storage_path: "", ocr_status: "completed", raw_ocr_text: "P. SHARMA...", created_at: "2025-03-11T14:01:00Z" },
  { id: "doc-1003-aadhaar", application_id: "app-1003", doc_type: "Aadhaar", original_size_kb: 6100, compressed_size_kb: 490, storage_path: "", ocr_status: "completed", raw_ocr_text: "AMIT VERMA...", created_at: "2025-03-12T09:00:00Z" },
  { id: "doc-1003-income", application_id: "app-1003", doc_type: "Income Certificate", original_size_kb: 7200, compressed_size_kb: 480, storage_path: "", ocr_status: "completed", raw_ocr_text: "AMIT VERM...", created_at: "2025-03-12T09:01:00Z" },
];

export const seedApplications: Application[] = [
  {
    id: "app-1001",
    citizen_name: "Rahul Kumar",
    district: "Lucknow",
    application_type: "Scholarship",
    status: "verified",
    verification_score: 94,
    officer_notes: "All documents verified. Fields match across documents.",
    created_at: "2025-03-10T10:00:00Z",
  },
  {
    id: "app-1002",
    citizen_name: "Priya Sharma",
    district: "Varanasi",
    application_type: "Certificate Renewal",
    status: "flagged",
    verification_score: 61,
    officer_notes: "",
    created_at: "2025-03-11T14:00:00Z",
  },
  {
    id: "app-1003",
    citizen_name: "Amit Verma",
    district: "Kanpur",
    application_type: "Income Verification",
    status: "pending",
    verification_score: 43,
    officer_notes: "",
    created_at: "2025-03-12T09:00:00Z",
  },
];

export const seedValidationResults: ValidationResult[] = [
  // App 1001 - all match
  { id: "vr-1", application_id: "app-1001", field_name: "Name", status: "match", details: "All documents show 'RAHUL KUMAR'", values_found: { "Aadhaar": "RAHUL KUMAR", "PAN Card": "RAHUL KUMAR", "Domicile": "RAHUL KUMAR" } },
  { id: "vr-2", application_id: "app-1001", field_name: "DOB", status: "match", details: "Date of birth consistent: 15/08/1990", values_found: { "Aadhaar": "15/08/1990", "PAN Card": "15/08/1990" } },
  { id: "vr-3", application_id: "app-1001", field_name: "District", status: "match", details: "District 'Lucknow' consistent across documents", values_found: { "Aadhaar": "Lucknow", "Domicile": "Lucknow" } },
  // App 1002 - name mismatch
  { id: "vr-4", application_id: "app-1002", field_name: "Name", status: "mismatch", details: "Name mismatch — PAN shows abbreviated form 'P. SHARMA' vs Aadhaar 'PRIYA SHARMA'", values_found: { "Aadhaar": "PRIYA SHARMA", "PAN Card": "P. SHARMA" } },
  { id: "vr-5", application_id: "app-1002", field_name: "DOB", status: "match", details: "Date of birth consistent: 22/03/1995", values_found: { "Aadhaar": "22/03/1995", "PAN Card": "22/03/1995" } },
  { id: "vr-6", application_id: "app-1002", field_name: "District", status: "match", details: "District 'Varanasi' found in Aadhaar", values_found: { "Aadhaar": "Varanasi" } },
  // App 1003 - low confidence
  { id: "vr-7", application_id: "app-1003", field_name: "Name", status: "mismatch", details: "Low confidence OCR — Income cert shows truncated 'AMIT VERM' vs Aadhaar 'AMIT VERMA'", values_found: { "Aadhaar": "AMIT VERMA", "Income Certificate": "AMIT VERM" } },
  { id: "vr-8", application_id: "app-1003", field_name: "District", status: "mismatch", details: "Low confidence OCR — Income cert shows truncated 'Kanp' vs Aadhaar 'Kanpur'", values_found: { "Aadhaar": "Kanpur", "Income Certificate": "Kanp" } },
  { id: "vr-9", application_id: "app-1003", field_name: "DOB", status: "match", details: "DOB found only in Aadhaar: 10/12/1988", values_found: { "Aadhaar": "10/12/1988" } },
];

export function getApplicationById(id: string): Application | undefined {
  return seedApplications.find(a => a.id === id);
}

export function getDocumentsByApplicationId(appId: string): Document[] {
  return seedDocuments.filter(d => d.application_id === appId);
}

export function getExtractedFieldsByDocumentId(docId: string): ExtractedField[] {
  return seedExtractedFields[docId] || [];
}

export function getValidationResultsByApplicationId(appId: string): ValidationResult[] {
  return seedValidationResults.filter(v => v.application_id === appId);
}
