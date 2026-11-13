"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Download,
  FolderOpen,
  History,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ModalContent, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGroupById } from "@/db/group.db";
import { getMembersByGroup } from "@/db/member.db";
import { getNationalityName } from "@/constantes/nationality";
import routes from "@/constantes/routes";
import { backOr } from "@/lib/backNavigation";
import { removeGroupMember } from "@/domains/groups/group-service";
import {
  activePayoutDraw,
  supportsPayoutOrder,
} from "@/domains/groups/payout-order";
import {
  isOpenProject,
  memberName,
  PROJECT_KINDS,
  PROJECT_STATUSES,
} from "@/domains/groups/group-model";
import { GroupTutorialButton } from "@/domains/groups/tutorial/GroupTutorialButton";
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import type { GroupProject, User } from "@/types/types";
import {
  AddGroupMembersDialog,
  EditGroupDialog,
  EditGroupProjectDialog,
  GroupProjectDetailDialog,
} from "./GroupWorkspaceDialogs";

const GroupCaisseContractModal = dynamic(
  () => import("./GroupCaisseContractModal"),
  { ssr: false },
);
const GroupAgreements = dynamic(() => import('./GroupAgreements'), { ssr: false });
const dateLabel = (value: Date) => new Date(value).toLocaleDateString("fr-FR");
const statusClass = (status: GroupProject["status"]) =>
  status === "ACTIVE"
    ? "bg-blue-50 text-blue-700"
    : status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-gray-100 text-gray-600";

export default function GroupDetails({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { actor, canManage, canDelete, refresh, audit } = useGroupWorkspace(groupId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    data: group,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId),
  });
  const {
    data: groupMembers = [],
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["groupMembers", groupId],
    queryFn: () => getMembersByGroup(groupId),
  });
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createContractOpen, setCreateContractOpen] = useState(false);
  const [projectEditor, setProjectEditor] = useState<
    GroupProject | "new" | null
  >(null);
  const [projectDetail, setProjectDetail] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<User | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get('tab') === 'agreements' ? 'agreements' : 'overview');
    setAddOpen(false);
    setEditOpen(false);
    setProjectEditor(null);
    setProjectDetail(null);
    setToRemove(null);
  }, [groupId]);
  const projects = group?.projects ?? [];
  const openProjects = projects.filter(isOpenProject);
  const coordinator = groupMembers.find(
    (member) => member.id === group?.coordinatorId,
  );
  const canEditMembers = canManage && !membersLoading && !membersError;
  const filteredMembers = groupMembers.filter((member) =>
    [
      memberName(member),
      member.email,
      member.matricule,
      ...(member.contacts ?? []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const filteredProjects = projects.filter(
    (project) => projectFilter === "all" || project.status === projectFilter,
  );
  const selectedProject = projects.find(
    (project) => project.id === projectDetail,
  );
  const remove = async () => {
    if (!toRemove || !canManage) return;
    setIsRemoving(true);
    try {
      await removeGroupMember(groupId, toRemove.id, actor);
      audit(`${memberName(toRemove)} retiré(e) du groupe.`);
      await refresh();
      setToRemove(null);
      toast.success("Membre retiré du groupe.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de retirer ce membre.",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const exportToExcel = async () => {
    if (filteredMembers.length === 0) {
      toast.error("Aucun membre à exporter");
      return;
    }

    setIsExporting(true);
    try {
      // Préparer les données pour l'export
      const exportData = filteredMembers.map((member: any) => {
        const toISO = (v: any) => {
          try {
            if (!v) return "";
            const d = v?.toDate
              ? v.toDate()
              : v instanceof Date
                ? v
                : new Date(v);
            return isNaN(d.getTime()) ? "" : d.toISOString();
          } catch {
            return "";
          }
        };

        return {
          Matricule: member?.matricule || member?.id || "",
          Prénom: member?.firstName || "",
          Nom: member?.lastName || "",
          Email: member?.email || "",
          Sexe: member?.gender || "",
          Nationalité: getNationalityName(member?.nationality),
          Profession: member?.profession || "",
          Province: member?.address?.province || "",
          Ville: member?.address?.city || "",
          Quartier: member?.address?.district || "",
          Arrondissement: member?.address?.arrondissement || "",
          Téléphones: Array.isArray(member?.contacts)
            ? member.contacts.join(" | ")
            : "",
          "Possède un véhicule": member?.hasCar ? "Oui" : "Non",
          "Date d'adhésion": toISO(member?.createdAt),
          "Dernière modification": toISO(member?.updatedAt),
          "Nombre de groupes": (member?.groupIds || []).length,
          "Autres groupes": (member?.groupIds || []).filter(
            (id: string) => id !== groupId,
          ).length,
        };
      });

      // Créer le fichier CSV avec BOM pour Excel
      const headers = Object.keys(exportData[0]);

      // Ajouter le BOM UTF-8 pour Excel
      const BOM = "\uFEFF";

      const csvContent =
        BOM +
        [
          headers.join(";"),
          ...exportData.map((row: Record<string, any>) =>
            headers
              .map((header) => {
                const value = row[header];
                // Échapper les points-virgules et guillemets dans les valeurs
                if (
                  typeof value === "string" &&
                  (value.includes(";") || value.includes('"'))
                ) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(";"),
          ),
        ].join("\r\n");

      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `membres-groupe-${group?.name || "groupe"}-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export réussi !");
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const projectCards = (items: GroupProject[]) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((project) => (
        <article
          key={project.id}
          className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-500">
              {PROJECT_KINDS[project.kind]?.label ?? "Projet"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${statusClass(project.status)}`}
            >
              {PROJECT_STATUSES[project.status]}
            </span>
          </div>
          <h3 className="break-words !text-base font-semibold text-gray-900">
            {project.name}
          </h3>
          <p className="mt-2 line-clamp-3 min-h-14 text-sm leading-relaxed text-gray-500">
            {project.description ||
              "L’objectif et l’organisation restent à préciser."}
          </p>
          <div className="my-4 space-y-2 text-xs text-gray-600">
            <p className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {project.participantIds.length} participant(s)
            </p>
            {supportsPayoutOrder(project.kind) && (
              <p className="font-medium text-[#234D65]">
                Ordre de récupération :{" "}
                {activePayoutDraw(project)
                  ? "enregistré"
                  : project.payoutDraws?.length
                    ? "à refaire"
                    : "à tirer au sort"}
              </p>
            )}
            {project.estimatedBudget !== undefined && (
              <p>
                Budget estimé :{" "}
                <span className="font-medium">
                  {project.estimatedBudget.toLocaleString("fr-FR")} FCFA
                </span>
              </p>
            )}
            {project.targetDate && (
              <p className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Date cible :{" "}
                {new Date(`${project.targetDate}T12:00:00`).toLocaleDateString(
                  "fr-FR",
                )}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="mt-auto w-full text-[#234D65]"
            onClick={() => setProjectDetail(project.id)}
          >
            Ouvrir le projet
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </article>
      ))}
    </div>
  );
  const emptyProjects = (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <FolderOpen className="mx-auto mb-3 h-9 w-9 text-[#234D65]" />
      <h3 className="!text-base font-semibold">
        Quel sera votre premier projet ?
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        Une caisse collective, un achat de matériel ou une autre initiative.
        Choisissez les participants parmi les membres du groupe.
      </p>
      {canEditMembers && (
        <Button
          className="mt-4 bg-[#234D65] text-white"
          onClick={() => setProjectEditor("new")}
        >
          <Plus className="h-4 w-4" />
          Créer un projet
        </Button>
      )}
    </div>
  );
  if (isLoading)
    return (
      <div role="status" className="mx-auto max-w-7xl space-y-5 p-6">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        <span className="sr-only">Chargement du groupe…</span>
      </div>
    );
  if (isError || !group)
    return (
      <div className="mx-auto max-w-xl space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Groupe indisponible</h1>
        <p className="text-sm text-gray-500">
          Il n’a pas pu être chargé ou n’existe plus.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Réessayer
        </Button>
        <Button onClick={() => router.push(routes.admin.groups)}>
          Retour aux groupes
        </Button>
      </div>
    );
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        className="-ml-3 text-gray-600"
        onClick={() => backOr(router, routes.admin.groups)}
      >
        <ArrowLeft className="h-4 w-4" />
        Tous les groupes
      </Button>
      <header className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        {deleteOpen && <DeleteGroupDialog group={group} onClose={() => setDeleteOpen(false)} onDeleted={async () => { router.replace(routes.admin.groups); await refresh() }} />}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#234D65]/10">
              <Users className="h-6 w-6 text-[#234D65]" />
            </div>
            <h1 className="break-words text-2xl font-semibold text-[#234D65]">
              {group.name}
            </h1>
            {group.label && (
              <p className="mt-1 text-xs text-gray-500">{group.label}</p>
            )}
            <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
              {group.description ||
                "Un collectif, plusieurs idées à construire ensemble."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <GroupTutorialButton size="sm" />
            {canDelete && <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Supprimer le groupe</Button>}
            {canEditMembers && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier le groupe
                </Button>
                <Button
                  size="sm"
                  className="bg-[#234D65] text-white"
                  onClick={() => setProjectEditor("new")}
                >
                  <Plus className="h-4 w-4" />
                  Nouveau projet
                </Button>
              </>
            )}
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Membres</dt>
            <dd className="mt-1 font-semibold">
              {membersLoading || membersError ? "—" : groupMembers.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Projets ouverts</dt>
            <dd className="mt-1 font-semibold">{openProjects.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Référent du groupe</dt>
            <dd className="mt-1 break-words text-sm font-medium">
              {coordinator
                ? memberName(coordinator)
                : group.coordinatorName || "À définir"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Garant du groupe</dt>
            <dd className="mt-1 break-words text-sm font-medium">
              {group.guarantorName ||
                "À renseigner dans les informations du groupe"}
            </dd>
          </div>
        </dl>
      </header>
      {membersError && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          Impossible de charger les membres.{" "}
          <Button variant="outline" size="sm" onClick={() => refetchMembers()}>
            Réessayer
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="members">
            Membres
            {!membersLoading && !membersError
              ? ` (${groupMembers.length})`
              : ""}
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projets ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="agreements">Accords entre membres</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          {!groupMembers.length && !membersLoading && !membersError && (
            <div className="flex flex-col gap-3 rounded-xl bg-[#234D65]/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="!text-base font-semibold text-[#234D65]">
                  Constituez votre collectif
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ajoutez les personnes qui participeront à la vie du groupe.
                </p>
              </div>
              {canManage && (
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Ajouter des membres
                </Button>
              )}
            </div>
          )}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="!text-lg font-semibold text-gray-900">
                Les projets du groupe
              </h2>
              {projects.length > 3 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTab("projects")}
                >
                  Tout voir
                </Button>
              )}
            </div>
            {projects.length
              ? projectCards(
                  [
                    ...openProjects,
                    ...projects.filter((project) => !isOpenProject(project)),
                  ].slice(0, 3),
                )
              : emptyProjects}
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="!text-base font-semibold">Membres du groupe</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTab("members")}
              >
                Voir les membres
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {groupMembers.slice(0, 6).map((member) => (
                <span
                  key={member.id}
                  className="rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-700"
                >
                  {memberName(member)}
                </span>
              ))}
              {membersLoading && (
                <p className="text-sm text-gray-500">Chargement…</p>
              )}
              {!groupMembers.length && !membersLoading && (
                <p className="text-sm text-gray-500">
                  Les membres apparaîtront ici.
                </p>
              )}
            </div>
          </section>
          {canManage && (
            <section className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="!text-sm font-medium text-gray-700">
                  Services du groupe
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Le groupe peut également ouvrir un contrat de caisse spéciale.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateContractOpen(true)}
              >
                <ShoppingBag className="h-4 w-4" />
                Créer un contrat de caisse
              </Button>
            </section>
          )}
        </TabsContent>
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                aria-label="Rechercher dans les membres du groupe"
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, matricule, téléphone…"
              />
            </div>
            <Button
              variant="outline"
              disabled={isExporting || !filteredMembers.length}
              onClick={exportToExcel}
            >
              <Download className="h-4 w-4" />
              Exporter Excel
            </Button>
            {canEditMembers && (
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Ajouter des membres
              </Button>
            )}
          </div>
          {membersLoading ? (
            <p role="status" className="py-8 text-center text-sm text-gray-500">
              Chargement des membres…
            </p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-start gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#234D65]/10 text-sm font-semibold text-[#234D65]">{`${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-gray-900">
                      {memberName(member)}
                      {member.id === group.coordinatorId && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">
                          Référent
                        </span>
                      )}
                    </p>
                    <p className="mt-1 break-words text-xs text-gray-500">
                      {member.matricule || member.id}
                      {member.contacts?.[0] ? ` · ${member.contacts[0]}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {
                        openProjects.filter((project) =>
                          project.participantIds.includes(member.id),
                        ).length
                      }{" "}
                      projet(s) ouvert(s)
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer ${memberName(member)} du groupe`}
                      onClick={() => setToRemove(member)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              ))}
              {!filteredMembers.length && (
                <p className="p-8 text-center text-sm text-gray-500">
                  {query
                    ? "Aucun membre ne correspond à votre recherche."
                    : "Ajoutez les premiers membres de ce groupe."}
                </p>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="projects" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm text-gray-600">
              Afficher{" "}
              <select
                aria-label="Filtrer les projets par état"
                className="ml-2 h-10 rounded-md border border-gray-200 bg-white px-3"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">Tous les projets</option>
                {Object.entries(PROJECT_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {canEditMembers && (
              <Button onClick={() => setProjectEditor("new")}>
                <Plus className="h-4 w-4" />
                Nouveau projet
              </Button>
            )}
          </div>
          {!projects.length ? (
            emptyProjects
          ) : filteredProjects.length ? (
            projectCards(filteredProjects)
          ) : (
            <p className="p-8 text-center text-sm text-gray-500">
              Aucun projet dans cet état.
            </p>
          )}
        </TabsContent>
        <TabsContent value="agreements"><GroupAgreements groupId={groupId} members={groupMembers} actor={actor} canManage={canManage} /></TabsContent>
        <TabsContent value="history">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-5 flex items-center gap-2 !text-base font-semibold">
              <History className="h-4 w-4" />
              La vie du groupe
            </h2>
            <ol className="space-y-5">
              {[...(group.activity ?? [])].reverse().map((event) => (
                <li
                  key={event.id}
                  className="border-l-2 border-[#234D65]/20 pl-4"
                >
                  <p className="break-words text-sm text-gray-800">
                    {event.description}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {event.byName} ·{" "}
                    {new Date(event.at).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
              {!group.activity?.length && (
                <li className="text-sm text-gray-500">
                  Groupe créé le {dateLabel(group.createdAt)}. Les prochaines
                  modifications apparaîtront ici.
                </li>
              )}
            </ol>
          </section>
        </TabsContent>
      </Tabs>
      {addOpen && (
        <AddGroupMembersDialog
          group={group}
          members={groupMembers}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editOpen && (
        <EditGroupDialog
          group={group}
          members={groupMembers}
          onClose={() => setEditOpen(false)}
        />
      )}
      {projectEditor && (
        <EditGroupProjectDialog
          key={projectEditor === "new" ? "new" : projectEditor.id}
          group={group}
          members={groupMembers}
          project={projectEditor === "new" ? undefined : projectEditor}
          onClose={() => setProjectEditor(null)}
        />
      )}
      {selectedProject && (
        <GroupProjectDetailDialog
          groupId={group.id}
          group={group}
          project={selectedProject}
          members={groupMembers}
          canManage={canEditMembers}
          onClose={() => setProjectDetail(null)}
          onEdit={() => {
            setProjectEditor(selectedProject);
            setProjectDetail(null);
          }}
        />
      )}
      {createContractOpen && (
        <GroupCaisseContractModal
          open
          onClose={() => setCreateContractOpen(false)}
          groupId={groupId}
          groupName={group.name}
          onCreated={async () => {
            await refresh();
            toast.success("Contrat de caisse créé pour le groupe.");
          }}
        />
      )}
      <Dialog
        open={!!toRemove}
        onOpenChange={(open) => {
          if (!open && !isRemoving) setToRemove(null);
        }}
      >
        <ModalContent size="md" showCloseButton={!isRemoving}>
          <ModalHeader
            icon={Users}
            tone="warning"
            className="[&_[data-slot=dialog-title]]:break-words"
            title={
              <>Retirer {toRemove ? memberName(toRemove) : "ce membre"} ?</>
            }
            description={
              <>
                Cette personne sera retirée du groupe et des projets en
                préparation ou en cours. Les projets terminés conservent leurs
                participants dans l’historique.
                {toRemove?.id === group.coordinatorId
                  ? " Le référent du groupe sera à redéfinir."
                  : ""}
              </>
            }
          />
          <ModalFooter>
            <Button
              variant="outline"
              disabled={isRemoving}
              onClick={() => setToRemove(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={isRemoving}
              onClick={remove}
            >
              {isRemoving && <Loader2 className="h-4 w-4 animate-spin" />}
              Retirer du groupe
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>
    </div>
  );
}
