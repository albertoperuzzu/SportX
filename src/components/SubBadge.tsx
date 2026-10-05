import type { SubStatus } from "@/lib/subscriptions";
import { Badge } from "./ui";

const COLORS = { attivo: "green", in_scadenza: "amber", esaurito: "red", scaduto: "red", nessuno: "red" } as const;

export function SubBadge({ status }: { status: SubStatus }) {
  return <Badge color={COLORS[status.kind]}>{status.label}</Badge>;
}
