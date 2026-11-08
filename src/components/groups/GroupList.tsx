"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/ui/stats-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import routes from "@/constantes/routes";
import { listGroups } from "@/db/group.db";
import {
  deleteEmptyGroup,
  getGroupMemberCounts,
} from "@/domains/groups/group-service";
import { isOpenProject, PROJECT_KINDS } from "@/domains/groups/group-model";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import { useListUrlSync } from "@/hooks/useListUrlSync";
import type { Group, GroupProjectKind } from "@/types/types";
import { CreateGroupWizard } from "./CreateGroupWizard";

export default function GroupList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canManage, refresh, audit } = useGroupWorkspace();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [kind, setKind] = useState<GroupProjectKind | "all">("all");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    data: groups = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: listGroups,
    staleTime: 60_000,
  });
  const ids = useMemo(() => groups.map((group) => group.id).sort(), [groups]);
  const { data: counts = {}, isError: countsError } = useQuery({
    queryKey: ["group-member-counts", ids],
    queryFn: () => getGroupMemberCounts(ids),
    enabled: !!ids.length,
    staleTime: 2 * 60_000,
  });
  useListUrlSync({ q: search || null });
  const projects = groups.flatMap((group) => group.projects ?? []);
  const filtered = groups.filter((group) => {
    const text = [
      group.name,
      group.description,
      group.label,
      ...(group.projects ?? []).map((project) => project.name),
    ]
      .join(" ")
      .toLocaleLowerCase("fr");
    return (
      text.includes(search.trim().toLocaleLowerCase("fr")) &&
      (kind === "all" ||
        group.projects?.some((project) => project.kind === kind))
    );
  });
  const remove = async () => {
    if (!toDelete || !canManage) return;
    setDeleting(true);
    try {
      await deleteEmptyGroup(toDelete.id);
      audit(
        `Suppression du groupe vide « ${toDelete.name} ».`,
        toDelete.id,
        "delete",
      );
      setToDelete(null);
      await refresh();
      toast.success("Groupe supprimé.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le groupe.",
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-gray-600">
          Des personnes qui s&apos;unissent, des projets qui prennent forme.
          Retrouvez vos tontines, achats collectifs et autres initiatives.
        </p>
        {canManage && (
          <Button
            className="shrink-0 bg-[#234D65] text-white hover:bg-[#1b3d50]"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          {
            label: "Groupes",
            value: groups.length,
            icon: Users,
            variant: "kara-blue" as const,
          },
          {
            label: "Projets ouverts",
            value: projects.filter(isOpenProject).length,
            icon: FolderOpen,
            variant: "kara-gold" as const,
          },
          {
            label: "Projets terminés",
            value: projects.filter((project) => project.status === "COMPLETED")
              .length,
            icon: CheckCircle2,
            variant: "success" as const,
          },
        ].map((stat) => (
          <StatsCard
            key={stat.label}
            title={stat.label}
            value={isLoading ? "—" : stat.value}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              aria-label="Rechercher un groupe ou un projet"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un groupe ou un projet…"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Actualiser les groupes"
            disabled={isFetching}
            onClick={() => {
              void refetch();
              void refresh();
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrer par projet">
          {[
            ["all", "Tous les groupes"],
            ...Object.entries(PROJECT_KINDS).map(([key, value]) => [
              key,
              value.label,
            ]),
          ].map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={kind === key ? "default" : "outline"}
              aria-pressed={kind === key}
              onClick={() => setKind(key as typeof kind)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700"
        >
          Impossible de charger les groupes.{" "}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      )}
      {isLoading && (
        <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((id) => (
            <div
              key={id}
              className="h-48 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
          <span className="sr-only">Chargement des groupes…</span>
        </div>
      )}
      {!isLoading && !isError && !filtered.length && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center sm:p-12">
          <Users className="mx-auto mb-4 h-10 w-10 text-[#234D65]" />
          <h2 className="!text-lg font-semibold text-gray-900">
            {groups.length
              ? "Aucun groupe ne correspond"
              : "Le prochain projet commence avec un groupe"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
            {groups.length
              ? "Essayez un autre nom ou affichez tous les types de projets."
              : "Réunissez des membres pour organiser une tontine, préparer un achat ou avancer sur une idée commune."}
          </p>
          {canManage && !groups.length && (
            <Button
              className="mt-5 bg-[#234D65] text-white"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-4 w-4" />
              Créer mon premier groupe
            </Button>
          )}
        </div>
      )}
      {!isLoading && !isError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((group) => {
            const open = (group.projects ?? []).filter(isOpenProject);
            return (
              <article
                key={group.id}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#234D65]/10">
                    <Users className="h-5 w-5 text-[#234D65]" />
                  </div>
                  {canManage &&
                    counts[group.id] === 0 &&
                    !group.projects?.length && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${group.name}`}
                        onClick={() => setToDelete(group)}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </Button>
                    )}
                </div>
                <h2 className="mt-4 break-words !text-base font-semibold text-gray-900">
                  <Link href={routes.admin.groupDetails(group.id)}>
                    {group.name}
                  </Link>
                </h2>
                {group.label && (
                  <p className="mt-1 text-xs text-gray-500">{group.label}</p>
                )}
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-gray-500">
                  {group.description ||
                    "Un collectif prêt à construire ses prochains projets."}
                </p>
                <div className="my-4 flex flex-wrap gap-3 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {countsError ? "—" : (counts[group.id] ?? "…")} membre(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {open.length} projet(s) ouvert(s)
                  </span>
                </div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {[
                    ...new Set(
                      (group.projects ?? []).map((project) => project.kind),
                    ),
                  ].map((key) => (
                    <span
                      key={key}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {PROJECT_KINDS[key]?.label ?? "Projet"}
                    </span>
                  ))}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="mt-auto w-full border-[#234D65]/20 text-[#234D65]"
                >
                  <Link href={routes.admin.groupDetails(group.id)}>
                    Ouvrir le groupe
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      )}
      {creating && (
        <CreateGroupWizard
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            toast.success("Votre groupe est prêt.");
            router.push(routes.admin.groupDetails(id));
          }}
        />
      )}
      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce groupe vide ?</DialogTitle>
            <DialogDescription>
              Le groupe « {toDelete?.name} » sera supprimé. Un groupe possédant
              des membres, projets ou contrats ne peut pas être supprimé ici.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
