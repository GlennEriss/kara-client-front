import Link from "next/link";
import type { GroupCreditProjectLink } from "@/types/types";
import { Link2 } from "lucide-react";

export function CreditProjectBadge({
  link,
}: {
  link?: GroupCreditProjectLink | null;
}) {
  if (!link) return null;
  return (
    <div className="rounded-xl border border-[#234D65]/20 bg-[#234D65]/5 p-4 text-sm text-[#234D65]">
      <p className="flex items-center gap-2 font-semibold">
        <Link2 className="size-4" />
        Financement d’un projet de groupe
      </p>
      <Link
        href={`/groups/${encodeURIComponent(link.groupId)}`}
        className="mt-1 block underline"
      >
        {link.groupName || "Voir le groupe"} ·{" "}
        {link.projectName || "Projet collectif"}
      </Link>
      <p className="mt-2 text-xs text-gray-500">
        Ce crédit reste individuel. Les échéances et les remboursements sont
        suivis dans ce contrat.
      </p>
    </div>
  );
}
