import { Progress } from "@/components/ui/progress";

interface ConfidenceBarProps {
  score: number;
  showLabel?: boolean;
}

export function ConfidenceBar({ score, showLabel = true }: ConfidenceBarProps) {
  const color =
    score >= 80
      ? "bg-success"
      : score >= 50
      ? "bg-warning"
      : "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
          {score}%
        </span>
      )}
    </div>
  );
}
