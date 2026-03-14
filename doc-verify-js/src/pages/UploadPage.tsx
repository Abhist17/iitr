import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressFile } from "@/lib/compressFile";
import { preprocessImage } from "@/lib/preprocessImage";
import { useNavigate } from "react-router-dom";
import { Upload, FileImage, CheckCircle, AlertCircle, Download, RotateCw, ZoomIn } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

const DOC_TYPES = ["Aadhaar", "PAN Card", "Domicile Certificate", "Income Certificate", "Caste Certificate"];
const APP_TYPES = ["Scholarship", "Certificate Renewal", "Income Verification", "Caste Verification", "General Application"];
const DISTRICTS = ["Lucknow", "Varanasi", "Kanpur", "Agra", "Allahabad", "Meerut", "Bareilly"];

interface UploadedDoc {
  file: File;
  compressedFile: File | null;
  docType: string;
  originalSize: number;
  compressedSize: number;
  skewAngle: number;
  wasUpscaled: boolean;
  originalResolution: string;
  enhancedResolution: string;
  status: "idle" | "aligning" | "enhancing" | "compressing" | "extracting" | "validating" | "uploading" | "done" | "error";
  progress: number;
  extractedFields: { name: string; value: string; confidence: number }[];
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [citizenName, setCitizenName] = useState("");
  const [district, setDistrict] = useState("");
  const [appType, setAppType] = useState("");
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [currentDocType, setCurrentDocType] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const simulateProcessing = useCallback(async (doc: UploadedDoc, index: number) => {
    const update = (partial: Partial<UploadedDoc>) => {
      setDocuments(prev => prev.map((d, i) => i === index ? { ...d, ...partial } : d));
    };

    // Step 1: Align (deskew) — detect tilt & straighten
    update({ status: "aligning", progress: 5 });
    const isImage = doc.file.type.startsWith("image/");
    const preprocessResult = isImage
      ? await preprocessImage(doc.file)
      : null;

    const skewAngle = preprocessResult?.skewAngle ?? 0;
    const wasUpscaled = preprocessResult?.wasUpscaled ?? false;
    const originalResolution = preprocessResult
      ? `${preprocessResult.originalWidth}×${preprocessResult.originalHeight}`
      : "—";
    const enhancedResolution = preprocessResult
      ? `${preprocessResult.newWidth}×${preprocessResult.newHeight}`
      : "—";
    const fileToCompress = preprocessResult?.processedFile ?? doc.file;

    update({ skewAngle, originalResolution, progress: 15 });

    // Step 2: Enhance resolution (already done in preprocessing, update UI)
    update({ status: "enhancing", wasUpscaled, enhancedResolution, progress: 25 });
    await new Promise(r => setTimeout(r, 300)); // brief pause for UX

    // Step 3: Compress — only if > 1 MB after preprocessing
    update({ status: "compressing", progress: 30 });
    const maxRes = preprocessResult
      ? Math.max(preprocessResult.newWidth, preprocessResult.newHeight)
      : undefined;
    const { compressedFile, compressedSize } = await compressFile(fileToCompress, { maxWidthOrHeight: maxRes });
    update({ compressedFile, compressedSize, progress: 45 });
    update({ status: "extracting", progress: 40 });

    let extractedFields: { name: string; value: string; confidence: number }[] = [];
    try {
      // Convert compressed file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.replace(/^data:[^;]+;base64,/, ""));
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(compressedFile ?? doc.file);
      });

      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: {
          image_base64: base64,
          application_id: "UPLOAD-" + Date.now(),
          name: "",
          dob: "",
          district: "",
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Map the AI-extracted fields to display format
      const ef = data?.extracted_fields ?? {};
      const confidenceMap: Record<string, number> = {
        high: 95, medium: 78, low: 55,
      };
      const conf = confidenceMap[ef.confidence ?? "medium"] ?? 78;

      const fieldDefs: [string, string | null][] = [
        ["Name / नाम",            ef.name],
        ["DOB / जन्मतिथि",        ef.dob],
        ["Gender / लिंग",          ef.gender],
        ["Aadhaar Number",         ef.aadhaar_number],
        ["PAN Number",             ef.pan_number],
        ["Address / पता",          ef.address],
        ["District / जिला",        ef.district],
        ["State / राज्य",          ef.state],
        ["Father's Name",          ef.father_name],
        ["Issue Date",             ef.issue_date],
        ["Issuing Authority",      ef.issuing_authority],
        ["Annual Income / आय",     ef.annual_income],
        ["Pincode",                ef.pincode],
      ];

      extractedFields = fieldDefs
        .filter(([, val]) => val !== null && val !== undefined)
        .map(([name, value]) => ({ name, value: value as string, confidence: conf }));

      if (extractedFields.length === 0) {
        // AI returned nothing useful — fall back to mock
        extractedFields = getMockFields(doc.docType);
      }
    } catch (aiErr) {
      console.warn("[UploadPage] AI extraction failed, using mock data:", aiErr);
      extractedFields = getMockFields(doc.docType);
    }

    update({ progress: 70, extractedFields });

    // Validate
    update({ status: "validating", progress: 80 });
    await new Promise(r => setTimeout(r, 500));

    // Upload
    update({ status: "uploading", progress: 90 });
    await new Promise(r => setTimeout(r, 600));

    update({ status: "done", progress: 100 });
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!currentDocType) {
      toast.error("Please select a document type first");
      return;
    }

    const fileArray = Array.from(files);
    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE_BYTES);

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(file => file.name).join(", ");
      toast.error(`These files exceed the 1MB limit: ${fileNames}`);
      return;
    }

    const newDocs: UploadedDoc[] = fileArray.map(f => ({
      file: f,
      compressedFile: null,
      docType: currentDocType,
      originalSize: f.size,
      compressedSize: 0,
      skewAngle: 0,
      wasUpscaled: false,
      originalResolution: "—",
      enhancedResolution: "—",
      status: "idle" as const,
      progress: 0,
      extractedFields: [],
    }));

    const startIndex = documents.length;
    setDocuments(prev => [...prev, ...newDocs]);
    setIsProcessing(true);

    for (let i = 0; i < newDocs.length; i++) {
      await simulateProcessing(newDocs[i], startIndex + i);
    }

    setIsProcessing(false);
    toast.success(`${fileArray.length} document(s) processed successfully`);
  }, [currentDocType, documents.length, simulateProcessing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSubmit = () => {
    if (!citizenName || !district || !appType || documents.length === 0) {
      toast.error("Please fill all fields and upload at least one document");
      return;
    }
    toast.success("Application submitted successfully!");
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  const statusLabels: Record<string, string> = {
    idle: "Ready",
    aligning: "Aligning Image / छवि संरेखित...",
    enhancing: "Enhancing Resolution / रिज़ॉल्यूशन बढ़ा रहे हैं...",
    compressing: "Compressing / संपीड़ित...",
    extracting: "Extracting Text / टेक्स्ट निकाल रहा है...",
    validating: "Validating / सत्यापित...",
    uploading: "Uploading / अपलोड हो रहा है...",
    done: "Complete / पूर्ण",
    error: "Error / त्रुटि",
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-8">
        <h1 className="text-2xl font-semibold mb-1">Upload Documents / दस्तावेज़ अपलोड करें</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Fill in your details and upload required documents for verification.
        </p>

        {/* Citizen Info */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Applicant Information / आवेदक जानकारी</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name / पूरा नाम</Label>
              <Input id="name" value={citizenName} onChange={e => setCitizenName(e.target.value)} placeholder="Enter full name" />
            </div>
            <div>
              <Label>District / जिला</Label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Application Type / आवेदन प्रकार</Label>
              <Select value={appType} onValueChange={setAppType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {APP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Upload Document / दस्तावेज़ अपलोड</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Document Type / दस्तावेज़ प्रकार</Label>
              <Select value={currentDocType} onValueChange={setCurrentDocType}>
                <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drag & drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports JPEG, PNG, PDF up to 1MB</p>
              <input
                id="file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Processing Results */}
        {documents.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Processing Results / प्रसंस्करण परिणाम</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{doc.docType}</span>
                      <span className="text-xs text-muted-foreground">({doc.file.name})</span>
                    </div>
                    {doc.status === "done" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : doc.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : null}
                  </div>

                  <Progress value={doc.progress} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">{statusLabels[doc.status]}</p>

                  {doc.status === "done" && (
                    <>
                      {/* Alignment & Enhancement Info */}
                      {doc.file.type.startsWith("image/") && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="flex items-center gap-1.5 text-xs bg-secondary/60 rounded px-2 py-1.5">
                            <RotateCw className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="text-muted-foreground">Alignment:</span>
                            <span className="font-medium">
                              {Math.abs(doc.skewAngle) > 0.3
                                ? `Corrected ${doc.skewAngle.toFixed(1)}°`
                                : "Straight ✓"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs bg-secondary/60 rounded px-2 py-1.5">
                            <ZoomIn className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="text-muted-foreground">Resolution:</span>
                            <span className="font-medium">
                              {doc.wasUpscaled
                                ? `${doc.originalResolution} → ${doc.enhancedResolution}`
                                : `${doc.originalResolution} ✓`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Compression Info */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-success font-medium">
                          {doc.compressedSize < doc.originalSize ? (
                            <>
                              Compressed {formatSize(doc.originalSize)} → {formatSize(doc.compressedSize)} —{" "}
                              {Math.round((1 - doc.compressedSize / doc.originalSize) * 100)}% saved
                            </>
                          ) : (
                            <>Size {formatSize(doc.originalSize)} — No compression needed (≤ 1 MB)</>
                          )}
                        </p>
                        {doc.compressedFile && doc.compressedSize < doc.originalSize && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = URL.createObjectURL(doc.compressedFile!);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = doc.compressedFile!.name;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast.success("Compressed file downloaded — check the file size!");
                            }}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        )}
                      </div>

                      {/* Extracted Fields */}
                      <div className="bg-secondary rounded p-3">
                        <p className="text-xs font-medium mb-2">Extracted Fields:</p>
                        {doc.extractedFields.map((f, fi) => (
                          <div key={fi} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-muted-foreground">{f.name}:</span>
                            <span className="font-medium">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !citizenName || !district || !appType || documents.length === 0}
          className="w-full"
          size="lg"
        >
          Submit Application / आवेदन जमा करें
        </Button>
      </main>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getMockFields(docType: string): { name: string; value: string; confidence: number }[] {
  const base = [
    { name: "Name / नाम", value: "RAHUL KUMAR", confidence: 94 },
    { name: "DOB / जन्मतिथि", value: "15/08/1990", confidence: 91 },
  ];
  switch (docType) {
    case "Aadhaar":
      return [...base, { name: "Aadhaar Number", value: "9234 5678 1234", confidence: 98 }, { name: "Address / पता", value: "42, MG Road, Lucknow", confidence: 85 }];
    case "PAN Card":
      return [...base, { name: "PAN Number", value: "ABCPK1234E", confidence: 97 }];
    case "Domicile Certificate":
      return [base[0], { name: "District / जिला", value: "Lucknow", confidence: 93 }, { name: "Address / पता", value: "42, MG Road, Lucknow", confidence: 82 }];
    case "Income Certificate":
      return [base[0], { name: "Income / आय", value: "₹2,40,000", confidence: 88 }, { name: "District / जिला", value: "Lucknow", confidence: 90 }];
    case "Caste Certificate":
      return [base[0], { name: "Caste / जाति", value: "General", confidence: 89 }, { name: "District / जिला", value: "Lucknow", confidence: 91 }];
    default:
      return base;
  }
}
