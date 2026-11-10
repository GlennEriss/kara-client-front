"use client";
import type { ReactNode } from "react";
import { TUTORIAL_GUIDANCE } from "./group-tutorial-guidance";
import { Check, CheckCircle2, FolderOpen, Users, Wallet } from "lucide-react";
import {
  GROUP_TUTORIAL_MEMBERS,
  type GroupTutorialStep,
} from "./group-tutorial";
const money = (n: number) => `${n.toLocaleString("fr-FR")} F`;
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="break-words rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800">
        {value}
      </dd>
    </div>
  );
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <h4 className="text-sm font-semibold text-[#234D65]">{title}</h4>
      {children}
    </div>
  );
}
function Members({
  paid,
  guarantees = false,
  alternate = false,
}: {
  paid?: number;
  guarantees?: boolean;
  alternate?: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {GROUP_TUTORIAL_MEMBERS.map((name, i) => (
        <li
          key={name}
          className="flex min-w-0 flex-wrap items-center justify-between gap-1 px-3 py-2 text-xs"
        >
          <span className="min-w-0 font-medium">{name}</span>
          <span
            className={
              guarantees && i === 2 && !alternate
                ? "text-amber-700"
                : "text-slate-500"
            }
          >
            {guarantees
              ? i === 2
                ? alternate
                  ? "Paul NGUEMA"
                  : "Autre garant requis"
                : "Nadia MINKO"
              : paid !== undefined
                ? i < paid
                  ? "Réglée · 10 000 F"
                  : "À régler · 10 000 F"
                : "Participant"}
          </span>
        </li>
      ))}
    </ul>
  );
}
function Summary({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <Field key={label} label={label} value={value} />
      ))}
    </dl>
  );
}
export function GroupTutorialScene({
  step,
  applied,
  onApply,
}: {
  step: GroupTutorialStep;
  applied: boolean;
  onApply: () => void;
}) {
  const action = (kind: "button" | "choice" = "button") => (
    <button
      type="button"
      data-tutorial-target
      aria-label={`Simuler : ${step.action}`}
      onClick={onApply}
      disabled={applied}
      className={
        kind === "choice"
          ? "flex w-full items-center gap-3 rounded-lg border-2 border-[#CBB171] bg-[#CBB171]/10 px-3 py-3 text-left text-xs font-semibold text-[#234D65] outline-offset-4 focus-visible:outline focus-visible:outline-2 disabled:cursor-default"
          : "inline-flex max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg border-2 border-[#CBB171] bg-[#234D65] px-3 py-2 text-left text-xs font-semibold leading-relaxed text-white shadow-sm outline-offset-4 focus-visible:outline focus-visible:outline-2 disabled:cursor-default disabled:bg-emerald-700"
      }
    >
      {applied ? (
        <CheckCircle2 className="size-4 shrink-0" />
      ) : kind === "choice" ? (
        <span className="flex size-4 shrink-0 items-center justify-center rounded border border-[#234D65] bg-white" />
      ) : null}
      <span>{applied ? "Étape simulée" : step.action}</span>
    </button>
  );
  let content: ReactNode;
  switch (step.id) {
    case "create-start":
      content = (
        <>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[#234D65]">
              Groupes et projets
            </h4>
            {action()}
          </div>
          <div className="rounded-xl border border-dashed bg-white p-5 text-center">
            <Users className="mx-auto mb-2 size-7 text-[#234D65]/40" />
            <p className="text-sm font-medium">
              Réunir des membres autour d’un projet
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Caisse collective, achat ou autre initiative commune.
            </p>
          </div>
          {applied && (
            <Card title="Créer un groupe">
              <Summary
                rows={[
                  ["Étape suivante", "Le groupe"],
                  ["Parcours", "3 étapes"],
                ]}
              />
            </Card>
          )}
        </>
      );
      break;
    case "create-identity":
      content = (
        <Card title="1. Le groupe">
          <Summary
            rows={[
              ["Nom", "Les Artisans"],
              ["Objectif", "S’équiper et s’entraider"],
            ]}
          />
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Les membres pourront préparer plusieurs projets dans ce groupe.
          </div>
          <div className="flex justify-end">{action()}</div>
          {applied && (
            <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              Identité validée : le parcours peut maintenant passer au choix des
              membres.
            </p>
          )}
        </Card>
      );
      break;
    case "create-members":
      content = (
        <Card title="2. Les membres">
          <div className="rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Rechercher un membre par nom ou matricule
          </div>
          {applied ? (
            <ul className="space-y-2">
              {GROUP_TUTORIAL_MEMBERS.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-xs"
                >
                  <Check className="size-4 text-emerald-700" />
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <Members />
              {action("choice")}
            </>
          )}
          <p className="text-xs text-slate-500">
            {applied
              ? "3 membres sélectionnés"
              : "Choisissez les participants de cet exemple."}
          </p>
        </Card>
      );
      break;
    case "create-guarantor":
      content = (
        <Card title="Le garant du groupe">
          <p className="text-xs text-slate-500">
            Membre Kara identifié · Peut appartenir à un autre groupe
          </p>
          {action("choice")}
          <Summary
            rows={[
              ["Garant proposé", applied ? "Nadia MINKO" : "À sélectionner"],
              ["Référent du groupe", "Rôle distinct du garant"],
            ]}
          />
        </Card>
      );
      break;
    case "create-project":
      content = (
        <Card title="3. Premier projet">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-3 text-xs text-slate-500">
              <Wallet className="mb-2 size-4" />
              Caisse collective
            </div>
            <div className="rounded-lg border-2 border-[#234D65] bg-[#234D65]/5 p-3 text-xs font-semibold text-[#234D65]">
              <FolderOpen className="mb-2 size-4" />
              Achat collectif
            </div>
          </div>
          <Summary
            rows={[
              ["Projet", "Congélateur partagé"],
              ["Budget estimé", "300 000 F"],
              ["Participants", "Alice, Bruno et Nadia"],
              ["État", "En préparation"],
            ]}
          />
          {action()}
          {applied && (
            <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              Premier projet prêt : le groupe pourra suivre cet achat séparément
              de ses autres initiatives.
            </p>
          )}
        </Card>
      );
      break;
    case "create-review":
      content = (
        <Card
          title={applied ? "Les Artisans · Groupe créé" : "Vérifier le groupe"}
        >
          <Summary
            rows={[
              ["Membres", "3 participants"],
              ["Garant", "Nadia MINKO"],
              ["Premier projet", "Congélateur partagé"],
              ["Budget estimé", "300 000 F"],
            ]}
          />
          <Members />
          {action()}
        </Card>
      );
      break;
    case "caisse-open":
      content = (
        <Card title="Projets du groupe">
          <div className="rounded-lg bg-[#234D65]/5 p-3">
            <p className="text-sm font-semibold text-[#234D65]">
              Caisse du marché
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Caisse collective · 3 participants
            </p>
            <div className="mt-3">{action()}</div>
          </div>
          {applied && (
            <p className="text-xs text-emerald-700">
              Cotisations, ordre de passage et remises sont regroupés dans la
              fiche projet.
            </p>
          )}
        </Card>
      );
      break;
    case "caisse-plan":
      content = (
        <Card title="Cotisations mensuelles">
          <Summary
            rows={[
              ["Par membre / mois", "10 000 F"],
              ["Premier mois", "Novembre 2026 · exemple"],
              ["Nombre de mois", "3 mois"],
              ["Jour d’échéance", "Le 5"],
            ]}
          />
          <p className="rounded-lg bg-slate-50 p-3 text-xs font-medium">
            3 participants × 10 000 F = 30 000 F attendus par mois
          </p>
          {action()}
          {applied && (
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              aria-label="Cycle de cotisations créé"
            >
              {["Novembre", "Décembre", "Janvier"].map((month) => (
                <div
                  key={month}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs"
                >
                  <p className="font-semibold text-emerald-800">{month}</p>
                  <p className="mt-1 text-emerald-700">30 000 F attendus</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      );
      break;
    case "caisse-payment":
      content = (
        <Card title="Versement d’Alice · Novembre">
          <Summary
            rows={[
              ["Montant versé", "10 000 F"],
              ["Moyen", "Espèces"],
            ]}
          />
          {action()}
          <Members paid={applied ? 1 : 0} />
          <p className="text-xs font-medium text-[#234D65]">
            {applied
              ? "Réglé : 10 000 F · Reste : 20 000 F"
              : "Attendu ce mois : 30 000 F"}
          </p>
        </Card>
      );
      break;
    case "caisse-order":
      content = (
        <Card title="Ordre de récupération">
          <p className="text-xs text-slate-500">Aperçu illustratif du tirage</p>
          <ol className="space-y-2">
            {["Nadia MINKO", "Alice ONDO", "Bruno MBA"].map((name, i) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-lg border bg-white p-2 text-xs"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-[#234D65] text-white">
                  {i + 1}
                </span>
                {name}
              </li>
            ))}
          </ol>
          {action()}
          <p className="text-xs text-slate-500">
            {applied
              ? "Ordre visible dans le suivi membre."
              : "Vérifiez cet aperçu avant de l’enregistrer."}
          </p>
        </Card>
      );
      break;
    case "caisse-funded":
      content = (
        <Card title="Novembre · Toutes les cotisations réglées">
          <Members paid={3} />
          <Summary
            rows={[
              ["Réuni", "30 000 F"],
              ["Reste à régler", "0 F"],
            ]}
          />
          <p className="text-xs text-slate-500">
            Dans cet exemple, les trois versements ont été enregistrés par
            l’admin.
          </p>
          <div className="flex justify-end">{action()}</div>
        </Card>
      );
      break;
    case "caisse-fee":
      content = (
        <Card title="Redevance facultative">
          <div
            className={`flex gap-2 rounded-lg p-3 text-xs ${applied ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}`}
          >
            {applied && <Check className="size-4 shrink-0" />}
            {applied
              ? "Redevance activée : 1 000 F par remise"
              : "Redevance désactivée : aucune retenue"}
          </div>
          <Summary
            rows={[
              ["Montant fixe", "1 000 F"],
              ["Application", "Prochaines remises"],
            ]}
          />
          {action()}
          <dl className="rounded-lg bg-slate-50 p-3 text-xs">
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Net prévu pour Nadia</dt>
              <dd className="font-semibold">
                {applied ? "29 000 F" : "30 000 F"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            Les remises anciennes conservent leur retenue d’origine.
          </p>
        </Card>
      );
      break;
    case "caisse-payout":
      content = (
        <Card
          title={
            applied ? "Remise enregistrée" : "Vérifier la remise effective"
          }
        >
          <Summary
            rows={[
              ["Bénéficiaire", "Nadia MINKO"],
              ["Moyen de remise", "Espèces"],
            ]}
          />
          <dl className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
            {[
              ["Montant de la caisse", 30000],
              ["Redevance Kara", 1000],
              ["Net au bénéficiaire", 29000],
            ].map(([label, n]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2">
                <dt>{label}</dt>
                <dd className="font-semibold">{money(Number(n))}</dd>
              </div>
            ))}
          </dl>
          {action()}
          <p className="text-xs text-slate-500">
            L’enregistrement constate une remise effective ; il ne déclenche
            aucun transfert.
          </p>
        </Card>
      );
      break;
    case "caisse-history":
      content = (
        <Card
          title={
            applied ? "Mes groupes · Suivi de Nadia" : "Historique des remises"
          }
        >
          {applied ? (
            <>
              <p className="text-sm font-medium text-[#234D65]">
                Mes remises · Novembre
              </p>
              <Summary
                rows={[
                  ["Montant de la caisse", "30 000 F"],
                  ["Redevance retenue", "1 000 F"],
                  ["Net reçu", "29 000 F"],
                  ["Suivi", "En lecture seule"],
                ]}
              />
              <p className="text-xs text-slate-500">
                Chaque membre consulte uniquement ses propres montants.
              </p>
            </>
          ) : (
            <>
              <Summary
                rows={[
                  ["Bénéficiaire", "Nadia MINKO"],
                  ["Net remis", "29 000 F"],
                ]}
              />
              {action()}
            </>
          )}
        </Card>
      );
      break;
    case "purchase-open":
      content = (
        <Card title="Congélateur partagé">
          <Summary
            rows={[
              ["Budget estimé", "300 000 F"],
              ["Participants", "3 membres"],
            ]}
          />
          <div className="space-y-3 rounded-lg bg-[#234D65]/5 p-3">
            <p className="text-xs font-medium text-[#234D65]">
              Financer l’achat ensemble
            </p>
            {action()}
          </div>
          {applied && (
            <Summary
              rows={[
                ["Formulaire", "Répartition à compléter"],
                ["Demande créée", "Aucune à ce stade"],
              ]}
            />
          )}
        </Card>
      );
      break;
    case "purchase-parts":
      content = (
        <Card title="Répartir le financement">
          <Summary
            rows={[
              ["Total à financer", "300 000 F"],
              ["Participants retenus", "Alice, Bruno et Nadia"],
            ]}
          />
          {action()}
          <ul className="space-y-2">
            {GROUP_TUTORIAL_MEMBERS.map((name) => (
              <li
                key={name}
                className="flex flex-wrap justify-between gap-2 rounded-lg border p-2 text-xs"
              >
                <span>{name}</span>
                <strong>{applied ? "100 000 F" : "Part à vérifier"}</strong>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Les parts peuvent être ajustées avant confirmation.
          </p>
        </Card>
      );
      break;
    case "purchase-guarantor":
      content = (
        <Card title="Garant de chaque part">
          <Members guarantees alternate={applied} />
          {!applied && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Nadia ne peut pas garantir sa propre demande.
            </p>
          )}
          {action("choice")}
          <p className="text-xs text-slate-500">
            Paul est un autre membre Kara, choisi pour la part de Nadia.
          </p>
        </Card>
      );
      break;
    case "purchase-review":
      content = (
        <Card title="Récapitulatif avant création">
          <Members guarantees alternate />
          <p className="rounded-lg bg-slate-50 p-3 text-xs font-medium">
            3 parts de 100 000 F · Total : 300 000 F
          </p>
          {action()}
          <p className="text-xs text-slate-500">
            Vérifiez chaque emprunteur, sa part et son garant.
          </p>
          {applied && (
            <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
              Répartition vérifiée : trois parts de 100 000 F et un garant
              différent de l’emprunteur pour chaque dossier.
            </p>
          )}
        </Card>
      );
      break;
    case "purchase-requests":
      content = (
        <Card title={applied ? "3 demandes créées" : "Créer les demandes"}>
          <ul className="space-y-2">
            {GROUP_TUTORIAL_MEMBERS.map((name) => (
              <li key={name} className="rounded-lg border p-2 text-xs">
                <strong>{name} · 100 000 F</strong>
                <p className="mt-1 text-slate-500">
                  {applied ? "Demande en attente" : "Demande à créer"}
                </p>
              </li>
            ))}
          </ul>
          {action()}
          <p className="text-xs text-slate-500">
            Cette création n’approuve aucun dossier et ne remet aucun fonds.
          </p>
        </Card>
      );
      break;
    case "purchase-follow-up":
      content = (
        <Card title="Suivi du financement">
          <Summary
            rows={[
              ["Demandes en attente", "3 dossiers individuels"],
              ["Fonds remis à ce stade", "0 F"],
            ]}
          />
          <ol className="space-y-2 text-xs text-slate-600">
            <li>1. Examiner chaque demande.</li>
            <li>2. Choisir la durée et les conditions.</li>
            <li>3. Créer puis faire signer chaque contrat.</li>
            <li>4. Suivre les versements dans le projet.</li>
          </ol>
          {action()}
        </Card>
      );
      break;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#234D65]">
          <Users className="size-4" />
          Les Artisans
        </span>
        <span className="rounded-full border border-[#CBB171]/40 bg-[#CBB171]/10 px-2 py-1 text-[10px] font-semibold text-[#80651e]">
          EXEMPLE FICTIF
        </span>
      </div>
      <div
        className="grid grid-cols-2 gap-2"
        aria-label="Avant et après l’action"
      >
        <div
          className={`min-w-0 rounded-lg border p-2 text-xs ${applied ? "border-slate-200 bg-white text-slate-500" : "border-[#234D65]/30 bg-[#234D65]/5 text-[#234D65]"}`}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide">
            Avant
          </p>
          <p className="break-words leading-relaxed">
            {TUTORIAL_GUIDANCE[step.id].before}
          </p>
        </div>
        <div
          className={`min-w-0 rounded-lg border p-2 text-xs ${applied ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-dashed border-slate-200 bg-white text-slate-400"}`}
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide">
            {applied ? "Après" : "Résultat attendu"}
          </p>
          <p className="break-words leading-relaxed">
            {TUTORIAL_GUIDANCE[step.id].after}
          </p>
        </div>
      </div>
      {content}
    </div>
  );
}
