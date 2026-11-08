import type {
  GroupPayoutDraw,
  GroupProject,
  GroupProjectKind,
} from "@/types/types";

export const supportsPayoutOrder = (kind: GroupProjectKind) =>
  kind === "TONTINE" || kind === "OTHER";

export function sameParticipants(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return (
    a.length === b.length &&
    new Set(a).size === a.length &&
    new Set(b).size === b.length &&
    a.every((id) => b.includes(id))
  );
}

export function activePayoutDraw(
  project: Pick<
    GroupProject,
    "participantIds" | "payoutDraws" | "payoutOrderDrawId"
  >,
): GroupPayoutDraw | undefined {
  const draw = project.payoutDraws?.find(
    (item) => item.id === project.payoutOrderDrawId,
  );
  return draw && sameParticipants(draw.participantIds, project.participantIds)
    ? draw
    : undefined;
}

function secureRandomBelow(max: number): number {
  // Rejection sampling avoids giving lower indices a greater probability when
  // the 32-bit range is not divisible by the number of remaining participants.
  const range = 0x1_0000_0000;
  const limit = range - (range % max);
  const word = new Uint32Array(1);
  do {
    crypto.getRandomValues(word);
  } while (word[0] >= limit);
  return word[0] % max;
}

export function shuffleParticipants(
  ids: readonly string[],
  randomBelow = secureRandomBelow,
): string[] {
  if (
    ids.length < 2 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !id)
  ) {
    throw new Error(
      "Sélectionnez au moins deux participants distincts avant le tirage.",
    );
  }
  const order = [...ids];
  // Fisher–Yates: every permutation has the same probability.
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i)
      throw new Error("Le tirage a échoué. Réessayez.");
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
