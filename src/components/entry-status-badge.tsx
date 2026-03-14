import { Badge } from "@/components/ui/badge";
import type { EntryStatus } from "@/types/database";

const variants: Record<EntryStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const labels: Record<EntryStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
