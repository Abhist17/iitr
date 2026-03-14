import { Badge } from "@/components/ui/badge";
import type { Application } from "@/types/docverify";

export function StatusBadge({ status }: { status: Application["status"] }) {
  const config = {
    verified: { label: "Verified", variant: "success" as const },
    flagged: { label: "Flagged — Mismatch", variant: "destructive" as const },
    pending: { label: "Pending Review", variant: "warning" as const },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
