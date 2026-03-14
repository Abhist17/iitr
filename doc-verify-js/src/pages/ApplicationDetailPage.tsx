import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Flag, RotateCcw, FileImage } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getApplicationById,
  getDocumentsByApplicationId,
  getExtractedFieldsByDocumentId,
  getValidationResultsByApplicationId,
} from "@/data/seed";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");

  const app = getApplicationById(id || "");
  const documents = getDocumentsByApplicationId(id || "");
  const validations = getValidationResultsByApplicationId(id || "");

  if (!app) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-8 text-center">
          <p className="text-muted-foreground">Application not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  const scoreColor = app.verification_score >= 80 ? "text-success" : app.verification_score >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        {/* Header */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{app.citizen_name}</h1>
            <p className="text-sm text-muted-foreground">
              {app.id.replace("app-", "#")} · {app.district} · {app.application_type} · {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Validation + Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cross-Field Validation Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cross-Field Validation / क्रॉस-फ़ील्ड सत्यापन</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Field</TableHead>
                        {documents.map(doc => (
                          <TableHead key={doc.id} className="min-w-[120px]">{doc.doc_type}</TableHead>
                        ))}
                        <TableHead className="min-w-[200px]">Validation Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validations.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium text-sm">{v.field_name}</TableCell>
                          {documents.map(doc => {
                            const value = v.values_found[doc.doc_type] || "—";
                            const isMismatch = v.status === "mismatch" && value !== "—";
                            return (
                              <TableCell key={doc.id} className={`text-sm ${isMismatch ? "text-destructive font-medium" : ""}`}>
                                {value}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            {v.status === "match" ? (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                                <span className="text-xs text-success font-medium">Match</span>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Flag className="h-3.5 w-3.5 text-destructive" />
                                  <span className="text-xs text-destructive font-medium">Mismatch</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{v.details}</p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Officer Action Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Officer Action Panel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Overall Verification Score:</span>
                  <span className={`text-2xl font-semibold ${scoreColor}`}>{app.verification_score}%</span>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Officer Notes / अधिकारी टिप्पणी</label>
                  <Textarea
                    value={notes || app.officer_notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes about this application..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { toast.success("Application approved"); navigate("/dashboard"); }}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => { toast.warning("Application flagged for review"); navigate("/dashboard"); }}>
                    <Flag className="h-4 w-4 mr-1" /> Flag for Review
                  </Button>
                  <Button variant="outline" onClick={() => toast.info("Resubmission request sent")}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Request Resubmission
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Document Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Documents / दस्तावेज़</h2>
            {documents.map(doc => {
              const fields = getExtractedFieldsByDocumentId(doc.id);
              return (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{doc.doc_type}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {doc.compressed_size_kb}KB
                      </Badge>
                    </div>

                    {/* Thumbnail placeholder */}
                    <div className="bg-secondary rounded h-20 flex items-center justify-center mb-3">
                      <FileImage className="h-8 w-8 text-muted-foreground/40" />
                    </div>

                    <div className="space-y-2">
                      {fields.map(f => (
                        <div key={f.id}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">{f.field_name}</span>
                            <span className="font-medium">{f.field_value}</span>
                          </div>
                          <ConfidenceBar score={f.confidence_score} />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>Original: {doc.original_size_kb}KB</span>
                      <span className="text-success font-medium">
                        {Math.round((1 - doc.compressed_size_kb / doc.original_size_kb) * 100)}% saved
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
