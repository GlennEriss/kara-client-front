import type { User } from "@/types/types";
import { UNKNOWN_USER_MATRICULE } from "@/domains/financial/caisse-imprevue/import/unknownUser";

/** The group guarantor must be an identified Kara member, including when
 * they belong to a different group. The placeholder account is not a guarantor. */
export function isGroupGuarantor(
  member: Partial<User> & { id: string },
): boolean {
  return (
    member.id !== UNKNOWN_USER_MATRICULE &&
    member.matricule !== UNKNOWN_USER_MATRICULE &&
    !!member.lastName?.trim() &&
    !!member.roles?.some((role) =>
      ["Adherant", "Bienfaiteur", "Sympathisant"].includes(role),
    )
  );
}
