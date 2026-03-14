export interface Application {
  id: string;
  citizen_name: string;
  district: string;
  application_type: string;
  status: "verified" | "flagged" | "pending";
  verification_score: number;
  officer_notes: string;
  created_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  doc_type: string;
  original_size_kb: number;
  compressed_size_kb: number;
  storage_path: string;
  ocr_status: string;
  raw_ocr_text: string;
  created_at: string;
}

export interface ExtractedField {
  id: string;
  document_id: string;
  field_name: string;
  field_value: string;
  confidence_score: number;
}

export interface ValidationResult {
  id: string;
  application_id: string;
  field_name: string;
  status: "match" | "mismatch";
  details: string;
  values_found: Record<string, string>;
}
