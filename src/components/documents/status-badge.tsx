import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/documents/state-machine";
import type { DocStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <Badge className={cn("text-xs font-medium hover:opacity-80", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
