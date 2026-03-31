import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  deadline: string | null;
  className?: string;
}

export default function DeadlineCountdown({ deadline, className }: Props) {
  if (!deadline) return null;

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <Badge className={`bg-destructive/15 text-destructive gap-1 ${className || ""}`}>
        <Clock size={12} /> Expired
      </Badge>
    );
  }

  if (diffDays <= 3) {
    return (
      <Badge className={`bg-destructive/15 text-destructive gap-1 ${className || ""}`}>
        <Clock size={12} /> {diffDays === 0 ? "Last day" : `${diffDays}d left`}
      </Badge>
    );
  }

  if (diffDays <= 7) {
    return (
      <Badge className={`bg-amber-100 text-amber-700 gap-1 ${className || ""}`}>
        <Clock size={12} /> {diffDays}d left
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`gap-1 text-muted-foreground ${className || ""}`}>
      <Clock size={12} /> {diffDays}d left
    </Badge>
  );
}
