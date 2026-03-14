import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileCheck, Loader2, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

const PROCESSING_STEPS = [
  "Compressing image...",
  "Sending to AI...",
  "Extracting document fields...",
  "Validating information...",
];

export default function AIVerifyPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    application_id: "",
    name: "",
    dob: "",
    district: "",
  });

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File must be 1MB or smaller");
      return;
    }
    if (!["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(selectedFile.type)) {
      toast.error("Only JPG, PNG, and PDF files are supported");
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  }, [handleFileSelect]);

  const compressImage = async (imgFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ""));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(imgFile);
    });
  };

  const handleSubmit = async () => {
    if (!file) { toast.error("Please upload a document"); return; }
    if (!formData.application_id || !formData.name || !formData.dob || !formData.district) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);

    try {
      // Step 1: Compress
      setCurrentStep(0);
      let base64: string;
      if (file.type.startsWith("image/")) {
        base64 = await compressImage(file);
      } else {
        // For PDF, read as base64 directly
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.replace(/^data:[^;]+;base64,/, ""));
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      }

      // Step 2: Send to AI
      setCurrentStep(1);
      await new Promise((r) => setTimeout(r, 300));

      setCurrentStep(2);
      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: {
          image_base64: base64,
          application_id: formData.application_id,
          name: formData.name,
          dob: formData.dob,
          district: formData.district,
        },
      });

      if (error) {
        throw new Error(error.message || "AI service unavailable. Please try again.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Step 4: Done
      setCurrentStep(3);
      await new Promise((r) => setTimeout(r, 500));

      // Navigate to results with state
      navigate("/ai-results", {
        state: { result: data, imagePreview: preview },
      });
    } catch (err) {
      console.error("Verification error:", err);
      const message = err instanceof Error ? err.message : "Could not read document. Please upload a clearer image.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            DigiPramaan — AI Document Verification
          </h1>
          <p className="text-muted-foreground">
            Upload any Indian government document for instant AI verification
          </p>
        </div>

        {isProcessing && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="space-y-2 w-full max-w-xs">
                  {PROCESSING_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`flex items-center gap-2 text-sm transition-opacity ${
                        i <= currentStep ? "opacity-100" : "opacity-30"
                      }`}
                    >
                      {i < currentStep ? (
                        <FileCheck className="h-4 w-4 text-success" />
                      ) : i === currentStep ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                      )}
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Upload */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Document Upload / दस्तावेज़ अपलोड</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, PDF — Max 1MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                  {preview && (
                    <img
                      src={preview}
                      alt="Document preview"
                      className="h-16 w-16 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setFile(null); setPreview(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Applicant Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Applicant Details / आवेदक विवरण</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="app-id">Application ID / आवेदन संख्या</Label>
                <Input
                  id="app-id"
                  value={formData.application_id}
                  onChange={(e) => setFormData((p) => ({ ...p, application_id: e.target.value }))}
                  placeholder="e.g. APP-2024-001"
                />
              </div>
              <div>
                <Label htmlFor="full-name">Full Name / पूरा नाम</Label>
                <Input
                  id="full-name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter name as on document"
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth / जन्मतिथि (DD/MM/YYYY)</Label>
                <Input
                  id="dob"
                  value={formData.dob}
                  onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))}
                  placeholder="15/08/1990"
                />
              </div>
              <div>
                <Label htmlFor="district">District / जिला</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData((p) => ({ ...p, district: e.target.value }))}
                  placeholder="e.g. Lucknow"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !file}
          className="w-full mt-6"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Document / दस्तावेज़ सत्यापित करें"
          )}
        </Button>
      </main>
    </div>
  );
}
