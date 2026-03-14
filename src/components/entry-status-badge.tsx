import type { EntryStatus } from "@/types/database";

const config: Record<EntryStatus, { label: string; emoji: string; className: string }> = {
  pending: {
    label: "Pending",
    emoji: "\u{23F3}",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    emoji: "\u{2705}",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    emoji: "\u{274C}",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    emoji: "\u{1F6AB}",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export function EntryStatusBadge({ status }: { status: EntryStatus }) {
  const { label, emoji, className } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${className}`}
    >
      {emoji} {label}
    </span>
  );
}
