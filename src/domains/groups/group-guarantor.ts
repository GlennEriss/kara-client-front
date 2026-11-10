import type { User } from "@/types/types";
import { UNKNOWN_USER_ID, UNKNOWN_USER_MATRICULE } from "@/domains/financial/caisse-imprevue/import/unknownUser";
import { memberName } from "./group-model";

/** The existing INCONNU account represents LE KARA, never an actual borrower. */
export function isKaraGroupGuarantor(member: { id: string }): boolean {
  return member.id === UNKNOWN_USER_ID;
}

export function isIdentifiedGroupMember(
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

export function isGroupGuarantor(member: Partial<User> & { id: string }): boolean {
  return isKaraGroupGuarantor(member) || isIdentifiedGroupMember(member);
}

export function groupGuarantorName(member: Partial<User> & { id: string }): string {
  return isKaraGroupGuarantor(member) ? "INCONNU — LE KARA" : memberName(member as User);
}
