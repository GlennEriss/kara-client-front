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
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["groups"] }),
      queryClient.invalidateQueries({ queryKey: ["group-member-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["group-candidates"] }),
      queryClient.invalidateQueries({ queryKey: ["allMembers"] }),
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
  return { actor, canManage, refresh, audit };
}
