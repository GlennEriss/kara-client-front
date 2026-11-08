"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCaisseSettingsValidation } from "@/hooks/useCaisseSettingsValidation";
import { toast } from "sonner";

export default function GroupCaisseContractModal({
  open,
  onClose,
  groupId,
  groupName,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onCreated: () => Promise<void>;
}) {
  const [amount, setAmount] = React.useState(10000);
  const [months, setMonths] = React.useState(12);
  const [caisseType, setCaisseType] = React.useState<
    | "STANDARD"
    | "JOURNALIERE"
    | "LIBRE"
    | "STANDARD_CHARITABLE"
    | "JOURNALIERE_CHARITABLE"
    | "LIBRE_CHARITABLE"
  >("STANDARD");
  const [firstPaymentDate, setFirstPaymentDate] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Validation des paramètres de la Caisse Spéciale
  const {
    isValid,
    isLoading: isValidating,
    error: validationError,
    settings,
  } = useCaisseSettingsValidation(caisseType);

  const isDaily =
    caisseType === "JOURNALIERE" || caisseType === "JOURNALIERE_CHARITABLE";
  const isLibre = caisseType === "LIBRE" || caisseType === "LIBRE_CHARITABLE";

  React.useEffect(() => {
    if (isLibre) setAmount((current) => Math.max(current, 100000));
  }, [isLibre]);

  const onCreate = async () => {
    try {
      setLoading(true);

      // Validation des paramètres de la Caisse Spéciale
      if (!isValid || isValidating) {
        toast.error(
          "Les paramètres de la Caisse Spéciale ne sont pas configurés. Impossible de créer un contrat.",
        );
        return;
      }

      if (isLibre && amount < 100000) {
        toast.error(
          "Pour un contrat Libre, le montant mensuel doit être au minimum 100 000 FCFA.",
        );
        return;
      }
      if (!firstPaymentDate) {
        toast.error("Veuillez sélectionner la date du premier versement.");
        return;
      }

      // Créer le contrat pour le groupe
      const { subscribe } = await import("@/services/caisse/mutations");
      await subscribe({
        groupeId: groupId,
        monthlyAmount: amount,
        monthsPlanned: months,
        caisseType,
        firstPaymentDate,
      });

      toast.success("Contrat créé pour le groupe");
      onClose();
      await onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Création impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Nouveau contrat Caisse Spéciale - {groupName}
          </DialogTitle>
          <DialogDescription>
            Définissez le montant, la durée et la caisse pour ce groupe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">
              {caisseType === "STANDARD" || caisseType === "STANDARD_CHARITABLE"
                ? "Montant mensuel"
                : caisseType === "JOURNALIERE" ||
                    caisseType === "JOURNALIERE_CHARITABLE"
                  ? "Objectif mensuel"
                  : "Montant mensuel (minimum 100 000)"}
            </label>
            <input
              type="number"
              min={isLibre ? 100000 : 100}
              step={100}
              className="border rounded p-2 w-full"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            {isDaily && (
              <div className="text-xs text-gray-500 mt-1">
                L'objectif est atteint par contributions quotidiennes sur le
                mois.
              </div>
            )}
            {isLibre && (
              <div className="text-xs text-gray-500 mt-1">
                Le total versé par mois doit être au moins 100 000 FCFA.
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Durée (mois)</label>
            <input
              type="number"
              min={1}
              max={12}
              className="border rounded p-2 w-full"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Caisse</label>
            <select
              className="border rounded p-2 w-full"
              value={caisseType}
              onChange={(e) => setCaisseType(e.target.value as any)}
            >
              <option value="STANDARD">Standard</option>
              <option value="JOURNALIERE">Journalière</option>
              <option value="LIBRE">Libre</option>
              <option value="STANDARD_CHARITABLE">Standard Charitable</option>
              <option value="JOURNALIERE_CHARITABLE">
                Journalière Charitable
              </option>
              <option value="LIBRE_CHARITABLE">Libre Charitable</option>
            </select>

            {/* Validation des paramètres */}
            {isValidating && (
              <div className="text-xs text-blue-600 mt-1">
                Vérification des paramètres...
              </div>
            )}

            {!isValidating && !isValid && validationError && (
              <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 border border-red-200 rounded-md">
                <div className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0">
                  ⚠️
                </div>
                <div className="text-xs text-red-700">
                  <div className="font-medium mb-1">Paramètres manquants</div>
                  <div>{validationError}</div>
                  <div className="mt-2 text-red-600">
                    Veuillez configurer les paramètres de la Caisse Spéciale
                    dans l'administration avant de créer un contrat.
                  </div>
                </div>
              </div>
            )}

            {!isValidating && isValid && settings && (
              <div className="flex items-start gap-2 p-3 mt-2 bg-green-50 border border-green-200 rounded-md">
                <div className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0">
                  ✓
                </div>
                <div className="text-xs text-green-700">
                  <div className="font-medium mb-1">Paramètres configurés</div>
                  <div>
                    Version active depuis le{" "}
                    {new Date(
                      settings.effectiveAt?.toDate?.() || settings.effectiveAt,
                    ).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="mt-2 text-green-600">
                    Vous pouvez maintenant créer un contrat avec ce type de
                    caisse.
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">
              Date du premier versement *
            </label>
            <input
              type="date"
              className="border rounded p-2 w-full"
              value={firstPaymentDate}
              onChange={(e) => setFirstPaymentDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            className="bg-[#CBB171] text-white hover:bg-[#D4C084]"
            onClick={onCreate}
            disabled={loading || !isValid || isValidating}
          >
            {loading ? "Création…" : "Créer pour le groupe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
