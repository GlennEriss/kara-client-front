"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listGroupCandidates } from "@/domains/groups/group-service";
import { memberName } from "@/domains/groups/group-model";
import { groupGuarantorName, isGroupGuarantor, isKaraGroupGuarantor } from "@/domains/groups/group-guarantor";
import { UNKNOWN_USER_ID } from "@/domains/financial/caisse-imprevue/import/unknownUser";
import { getUserById } from "@/db/user.db";
import { Loader2 } from "lucide-react";

export type GroupGuarantorChoice = { id: string; name: string };
export function GroupGuarantorPicker({
  value,
  onChange,
  label = "Garant du groupe *",
  excludeIds = [],
}: {
  value: GroupGuarantorChoice | null;
  onChange: (value: GroupGuarantorChoice | null) => void;
  label?: string;
  excludeIds?: string[];
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [loadingUnknown, setLoadingUnknown] = useState(false);
  const [unknownError, setUnknownError] = useState("");
  const {
    data = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["group-candidates"],
    queryFn: listGroupCandidates,
    staleTime: 5 * 60_000,
  });
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const matches = data
    .filter(
      (m) =>
        isGroupGuarantor(m) &&
        !excludeIds.includes(m.id) &&
        terms.every((t) =>
          normalize(`${memberName(m)} ${m.matricule || ""}`).includes(t),
        ),
    )
    .slice(0, 8);
  const selectUnknown = async () => {
    setLoadingUnknown(true);
    setUnknownError("");
    try {
      const unknown = data.find(isKaraGroupGuarantor) ?? await getUserById(UNKNOWN_USER_ID);
      if (!unknown || !isKaraGroupGuarantor(unknown)) {
        setUnknownError(`Membre INCONNU introuvable (${UNKNOWN_USER_ID}). Aucun compte n’a été créé.`);
        return;
      }
      onChange({ id: unknown.id, name: groupGuarantorName(unknown) });
      setSearch("");
    } catch {
      setUnknownError("Impossible de charger le membre INCONNU. Réessayez.");
    } finally {
      setLoadingUnknown(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={selectUnknown}
          disabled={loadingUnknown || excludeIds.includes(UNKNOWN_USER_ID)}>
          {loadingUnknown && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Contact inconnu
        </Button>
      </div>
      <p className="text-xs text-gray-500">INCONNU représente LE KARA : aucune commission de garant.</p>
      {unknownError && <p role="alert" className="text-xs text-red-700">{unknownError}</p>}
      {value && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-[#234D65]/5 p-3 text-sm">
          <span className="break-words font-medium">{value.name}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Changer ${label.replace(" *", "").toLowerCase()}`}
            onClick={() => onChange(null)}
          >
            Changer
          </Button>
        </div>
      )}
      {!value && (
        <>
          <Input
            id={id}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou matricule"
          />
          {isPending && (
            <p role="status" className="text-xs text-gray-500">
              Chargement des membres Kara…
            </p>
          )}
          {isError && (
            <p role="alert" className="text-xs text-red-700">
              Impossible de charger les membres.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void refetch()}
              >
                Réessayer
              </button>
            </p>
          )}
          {!isPending && !isError && (
            <div className="max-h-44 overflow-y-auto rounded-lg border">
              {matches.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className="block w-full border-b p-2 text-left text-sm last:border-0 hover:bg-gray-50"
                  onClick={() => {
                    onChange({ id: m.id, name: groupGuarantorName(m) });
                    setSearch("");
                  }}
                >
                  {groupGuarantorName(m)}
                  <span className="ml-2 text-xs text-gray-500">
                    {m.matricule || m.id}
                  </span>
                </button>
              ))}
              {!matches.length && (
                <p className="p-3 text-sm text-gray-500">
                  Aucun membre correspondant.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
