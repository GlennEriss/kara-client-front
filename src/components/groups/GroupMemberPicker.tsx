"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X } from "lucide-react";
import { listGroupCandidates } from "@/domains/groups/group-service";
import { memberName } from "@/domains/groups/group-model";
import type { User } from "@/types/types";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function GroupMemberPicker({
  value,
  onChange,
  excludeIds = [],
}: {
  value: User[];
  onChange: (members: User[]) => void;
  excludeIds?: string[];
}) {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(20);
  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["group-candidates"],
    queryFn: listGroupCandidates,
    staleTime: 5 * 60_000,
  });
  const selected = new Set(value.map((member) => member.id));
  const candidates = useMemo(() => {
    const excluded = new Set(excludeIds);
    const terms = normalize(search).split(/\s+/).filter(Boolean);
    return members.filter(
      (member) =>
        !excluded.has(member.id) &&
        terms.every((term) =>
          normalize(
            [
              memberName(member),
              member.matricule,
              member.email,
              ...(member.contacts ?? []),
            ].join(" "),
          ).includes(term),
        ),
    );
  }, [members, search, excludeIds]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          aria-label="Rechercher des membres"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setVisible(20);
          }}
          placeholder="Nom, matricule, téléphone ou e-mail"
          className="pl-9"
        />
      </div>
      <p className="text-sm font-medium text-[#234D65]" aria-live="polite">
        {value.length} membre{value.length > 1 ? "s" : ""} sélectionné
        {value.length > 1 ? "s" : ""}
      </p>
      {!!value.length && (
        <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
          {value.map((member) => (
            <button
              key={member.id}
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#234D65]/10 px-3 py-1 text-xs text-[#234D65]"
              aria-label={`Retirer ${memberName(member)} de la sélection`}
              onClick={() =>
                onChange(value.filter((item) => item.id !== member.id))
              }
            >
              {memberName(member)}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      {isLoading && (
        <p
          role="status"
          className="flex items-center gap-2 py-6 text-sm text-gray-500"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des membres…
        </p>
      )}
      {isError && (
        <div role="alert" className="text-sm text-red-700">
          Impossible de charger les membres.{" "}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Réessayer
          </Button>
        </div>
      )}
      {!isLoading && !isError && (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
          {candidates.slice(0, visible).map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-start gap-3 border-b border-gray-100 p-3 last:border-0 hover:bg-gray-50"
            >
              <Checkbox
                checked={selected.has(member.id)}
                disabled={!selected.has(member.id) && value.length >= 400}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...value, member]
                      : value.filter((item) => item.id !== member.id),
                  )
                }
              />
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium text-gray-900">
                  {memberName(member)}
                </span>
                <span className="block break-words text-xs text-gray-500">
                  {member.matricule || member.id}
                  {member.contacts?.[0] ? ` · ${member.contacts[0]}` : ""}
                </span>
              </span>
            </label>
          ))}
          {!candidates.length && (
            <p className="p-6 text-center text-sm text-gray-500">
              {search
                ? "Aucun membre ne correspond à cette recherche."
                : "Aucun autre membre disponible."}
            </p>
          )}
        </div>
      )}
      {candidates.length > visible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setVisible((count) => count + 20)}
        >
          Afficher 20 membres de plus
        </Button>
      )}
    </div>
  );
}
