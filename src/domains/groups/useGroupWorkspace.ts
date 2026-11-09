"use client";

import { useAuth } from "@/domains/auth/hooks/useAuth";
import { useMyAccess } from "@/hooks/useMyAccess";
import { useQueryClient } from "@tanstack/react-query";
import { useAuditLogger } from "@/hooks/useAuditLog";

export function useGroupWorkspace(groupId?: string) {
  const { user } = useAuth();
  const { can } = useMyAccess();
  const queryClient = useQueryClient();
  const { log } = useAuditLogger();
  const actor = {
    id: user?.uid ?? "",
    name: user?.displayName?.trim() || user?.email || "Administrateur",
  };
  const canManage = can("groups.manage");
  const creditAccess = {
    FIXE: {
      view: can("creditFixe.view"),
      manage: canManage && can("creditFixe.view") && can("creditFixe.create"),
    },
    SPECIALE: {
      view: can("creditSpeciale.view"),
      manage:
        canManage && can("creditSpeciale.view") && can("creditSpeciale.create"),
    },
  };
  const canViewCredits = creditAccess.FIXE.view || creditAccess.SPECIALE.view;
  const canManageCredits =
    creditAccess.FIXE.manage || creditAccess.SPECIALE.manage;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
      queryClient.invalidateQueries({ queryKey: ["group-member-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["group-candidates"] }),
      queryClient.invalidateQueries({ queryKey: ["allMembers"] }),
      queryClient.invalidateQueries({ queryKey: ["group-project-credits"] }),
      queryClient.invalidateQueries({ queryKey: ["group-contributions"] }),
      queryClient.invalidateQueries({ queryKey: ["group-payouts"] }),
      queryClient.invalidateQueries({
        queryKey: ["participant-project-credits"],
      }),
      queryClient.invalidateQueries({ queryKey: ["creditDemands"] }),
      queryClient.invalidateQueries({ queryKey: ["creditDemand"] }),
      queryClient.invalidateQueries({ queryKey: ["creditContracts"] }),
      queryClient.invalidateQueries({ queryKey: ["creditContract"] }),
      ...(groupId
        ? [
            queryClient.invalidateQueries({ queryKey: ["group", groupId] }),
            queryClient.invalidateQueries({
              queryKey: ["groupMembers", groupId],
            }),
          ]
        : []),
    ]);
  };
  const audit = (
    description: string,
    id = groupId,
    action: "create" | "update" | "delete" = "update",
  ) =>
    log({
      action,
      module: "groups",
      moduleLabel: "Groupes",
      targetType: "groupe",
      targetId: id,
      description,
    });
  return {
    actor,
    canManage,
    canViewCredits,
    canManageCredits,
    creditAccess,
    refresh,
    audit,
  };
}
