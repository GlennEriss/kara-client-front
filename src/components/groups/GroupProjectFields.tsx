"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  memberName,
  type GroupProjectDraft,
} from "@/domains/groups/group-model";
import type { GroupProjectKind, GroupProjectStatus, User } from "@/types/types";
import { ShoppingBag, Users, Lightbulb } from "lucide-react";

export function GroupProjectFields({
  value,
  onChange,
  members,
  participantNames = {},
  showStatus = true,
}: {
  value: GroupProjectDraft;
  onChange: (value: GroupProjectDraft) => void;
  members: User[];
  participantNames?: Record<string, string>;
  showStatus?: boolean;
}) {
  const [participantSearch, setParticipantSearch] = useState("");
  const visibleMembers = members.filter((member) =>
    `${memberName(member)} ${member.matricule ?? ""}`
      .toLocaleLowerCase("fr")
      .includes(participantSearch.toLocaleLowerCase("fr")),
  );
  const icons = { TONTINE: Users, PURCHASE: ShoppingBag, OTHER: Lightbulb };
  const historicIds = value.participantIds.filter(
    (id) => !members.some((member) => member.id === id),
  );
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Quel est le projet ?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            Object.entries(PROJECT_KINDS) as [
              GroupProjectKind,
              (typeof PROJECT_KINDS)[GroupProjectKind],
            ][]
          ).map(([kind, meta]) => {
            const Icon = icons[kind];
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={value.kind === kind}
                className={`rounded-xl border p-3 text-left transition-colors ${value.kind === kind ? "border-[#234D65] bg-[#234D65]/5 text-[#234D65]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                onClick={() =>
                  onChange({
                    ...value,
                    kind,
                    estimatedBudget:
                      kind === "TONTINE" ? undefined : value.estimatedBudget,
                  })
                }
              >
                <Icon className="mb-2 h-5 w-5" />
                <span className="block text-sm font-semibold">
                  {meta.label}
                </span>
                <span className="mt-1 hidden text-xs leading-relaxed sm:block">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="project-name">Nom du projet *</Label>
        <Input
          id="project-name"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder={PROJECT_KINDS[value.kind].placeholder}
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-description">Objectif et organisation</Label>
        <Textarea
          id="project-description"
          value={value.description}
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
          placeholder={
            value.kind === "TONTINE"
              ? "Ex. : épargner ensemble chaque mois ; préciser ici le rythme et l’organisation souhaités."
              : "Que souhaitez-vous réaliser ensemble ?"
          }
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {value.kind !== "TONTINE" && (
          <div className="space-y-2">
            <Label htmlFor="project-budget">
              Budget estimé (FCFA, facultatif)
            </Label>
            <Input
              id="project-budget"
              type="number"
              min={0}
              step={1}
              value={value.estimatedBudget ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  estimatedBudget:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              placeholder="Ex. : 600000"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="project-date">Date cible (facultatif)</Label>
          <Input
            id="project-date"
            type="date"
            value={value.targetDate ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                targetDate: event.target.value || undefined,
              })
            }
          />
        </div>
        {showStatus && (
          <div className="space-y-2">
            <Label htmlFor="project-status">État du projet</Label>
            <select
              id="project-status"
              value={value.status}
              onChange={(event) =>
                onChange({
                  ...value,
                  status: event.target.value as GroupProjectStatus,
                })
              }
              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              {Object.entries(PROJECT_STATUSES).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Participants · {value.participantIds.length}
        </legend>
        {!!members.length && (
          <label className="flex items-center gap-2 py-1 text-sm text-gray-600">
            <Checkbox
              checked={members.every((member) =>
                value.participantIds.includes(member.id),
              )}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  participantIds: checked
                    ? [
                        ...new Set([
                          ...value.participantIds,
                          ...members.map((member) => member.id),
                        ]),
                      ]
                    : historicIds,
                })
              }
            />
            Tous les membres du groupe
          </label>
        )}
        {members.length > 8 && (
          <Input
            aria-label="Rechercher un participant"
            placeholder="Rechercher parmi les membres du groupe…"
            value={participantSearch}
            onChange={(event) => setParticipantSearch(event.target.value)}
          />
        )}
        <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
          {visibleMembers.map((member) => (
            <label
              key={member.id}
              className="flex items-start gap-2 rounded-lg border border-gray-100 p-2 text-sm"
            >
              <Checkbox
                checked={value.participantIds.includes(member.id)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    participantIds: checked
                      ? [...value.participantIds, member.id]
                      : value.participantIds.filter((id) => id !== member.id),
                  })
                }
              />
              <span className="break-words">{memberName(member)}</span>
            </label>
          ))}
          {historicIds.map((id) => (
            <label
              key={id}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <Checkbox
                checked
                onCheckedChange={() =>
                  onChange({
                    ...value,
                    participantIds: value.participantIds.filter(
                      (item) => item !== id,
                    ),
                  })
                }
              />
              {participantNames[id] || id} (ancien membre)
            </label>
          ))}
        </div>
        {!members.length && !historicIds.length && (
          <p className="text-sm text-gray-500">
            Vous pourrez ajouter des participants après avoir constitué le
            groupe.
          </p>
        )}
      </fieldset>
    </div>
  );
}
