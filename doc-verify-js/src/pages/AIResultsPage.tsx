import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowLeft, ShieldCheck, ShieldX } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FIELD_LABELS: Record<string, string> = {
  doc_type: "Document Type",
  name: "Full Name / नाम",
  dob: "Date of Birth / जन्मतिथि",
  gender: "Gender / लिंग",
  aadhaar_number: "Aadhaar Number",
  pan_number: "PAN Number",
  address: "Address / पता",
  pincode: "Pincode",
  district: "District / जिला",
  state: "State / राज्य",
  father_name: "Father's Name / पिता का नाम",
  issue_date: "Issue Date",
  issuing_authority: "Issuing Authority",
  annual_income: "Annual Income / वार्षिक आय",
  confidence: "AI Confidence",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  aadhaar: "AADHAAR CARD",
  pan: "PAN CARD",
  domicile: "DOMICILE CERTIFICATE",
  income_certificate: "INCOME CERTIFICATE",
  driving_licence: "DRIVING LICENCE",
  unknown: "UNKNOWN DOCUMENT",
};

export default function AIResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result, imagePreview } = (location.state as {
    result: {
      application_id: string;
      doc_type: string;
      extracted_fields: Record<string, string | null>;
      validation: { name_match: boolean; dob_match: boolean; district_match: boolean };
      verification_score: number;
      is_verified: boolean;
    };
    imagePreview: string | null;
  }) || { result: null, imagePreview: null };

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container max-w-2xl py-16 text-center">
          <p className="text-muted-foreground mb-4">No verification results found.</p>
          <Button onClick={() => navigate("/ai-verify")}>Go to Verification</Button>
        </main>
      </div>
    );
  }

  const { extracted_fields, validation, verification_score, is_verified, doc_type, application_id } = result;

  const confidenceColor =
    extracted_fields.confidence === "high"
      ? "success"
      : extracted_fields.confidence === "medium"
        ? "warning"
        : "destructive";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/ai-verify")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Status Banner */}
        <Card
          className={`mb-6 border-2 ${
            is_verified ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
          }`}
        >
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={is_verified ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(verification_score / 100) * 251.2} 251.2`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                  {verification_score}%
                </span>
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 mb-2">
                  {is_verified ? (
                    <ShieldCheck className="h-6 w-6 text-success" />
                  ) : (
                    <ShieldX className="h-6 w-6 text-destructive" />
                  )}
                  <h2 className="text-2xl font-bold">
                    {is_verified ? "✓ Document Verified" : "✗ Verification Failed"}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {DOC_TYPE_LABELS[doc_type] || doc_type?.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ID: {application_id}
                  </Badge>
                  <Badge variant={confidenceColor as "success" | "warning" | "destructive"} className="text-xs">
                    {extracted_fields.confidence?.toUpperCase()} confidence
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Extracted Fields */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Extracted Information / निकाली गई जानकारी</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(extracted_fields)
                  .filter(([, v]) => v !== null && v !== "null")
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">
                        {FIELD_LABELS[key] || key}
                      </span>
                      <span className="text-sm font-medium text-right max-w-[60%]">
                        {String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Validation Results / सत्यापन परिणाम</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ValidationRow
                  label="Name Match / नाम"
                  passed={validation.name_match}
                  extracted={extracted_fields.name}
                />
                <ValidationRow
                  label="Date of Birth / जन्मतिथि"
                  passed={validation.dob_match}
                  extracted={extracted_fields.dob}
                />
                <ValidationRow
                  label="District Match / जिला"
                  passed={validation.district_match}
                  extracted={extracted_fields.district || extracted_fields.address}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Preview */}
        {imagePreview && (
          <Card className="mt-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Document Preview / दस्तावेज़ पूर्वावलोकन</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={imagePreview}
                alt="Uploaded document"
                className="max-h-80 mx-auto rounded-lg border"
              />
            </CardContent>
          </Card>
        )}

        <Button
          onClick={() => navigate("/ai-verify")}
          className="w-full mt-6"
          size="lg"
        >
          Verify Another Document / एक और दस्तावेज़ सत्यापित करें
        </Button>
      </main>
    </div>
  );
}

function ValidationRow({
  label,
  passed,
  extracted,
}: {
  label: string;
  passed: boolean;
  extracted: string | null;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${passed ? "bg-success/10" : "bg-destructive/10"}`}>
      {passed ? (
        <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {passed ? "Match confirmed" : "Mismatch detected"}
          {extracted && ` — Found: "${extracted}"`}
        </p>
      </div>
    </div>
  );
}
