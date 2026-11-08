import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activePayoutDraw,
  sameParticipants,
  shuffleParticipants,
} from "../payout-order";
import type { GroupPayoutDraw } from "@/types/types";

afterEach(() => vi.restoreAllMocks());
describe("tirage aléatoire de l’ordre de récupération", () => {
  it("produit les six permutations distinctes de trois participants avec les six suites de choix possibles", () => {
    const permutations = new Set<string>();
    const ids = ["a", "b", "c"];
    for (let first = 0; first < 3; first++)
      for (let second = 0; second < 2; second++) {
        const choices = [first, second];
        const order = shuffleParticipants(ids, () => choices.shift()!);
        permutations.add(order.join(""));
        expect([...order].sort()).toEqual(ids);
      }
    expect(permutations.size).toBe(6);
    expect(ids).toEqual(["a", "b", "c"]);
  });
  it("rejette les valeurs hors de la plage divisible avant d’utiliser l’aléatoire cryptographique", () => {
    const values = [0xffffffff, 5, 0];
    const random = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((array) => {
        (array as Uint32Array)[0] = values.shift()!;
        return array;
      });
    expect(shuffleParticipants(["a", "b", "c"])).toEqual(["b", "a", "c"]);
    expect(random).toHaveBeenCalledTimes(3);
  });
  it("refuse les participants absents, uniques ou dupliqués", () => {
    for (const ids of [[], ["a"], ["a", "a"], ["a", ""]])
      expect(() => shuffleParticipants(ids)).toThrow("deux participants");
    expect(() => shuffleParticipants(["a", "b"], () => 2)).toThrow(
      "tirage a échoué",
    );
  });
  it("n’utilise un tirage que s’il est explicitement actif et contient exactement les participants actuels", () => {
    const draw = { id: "draw1", participantIds: ["b", "a"] } as GroupPayoutDraw;
    const project = {
      participantIds: ["a", "b"],
      payoutDraws: [draw],
      payoutOrderDrawId: "draw1",
    };
    expect(activePayoutDraw(project)).toBe(draw);
    expect(
      activePayoutDraw({ ...project, participantIds: ["a", "c"] }),
    ).toBeUndefined();
    expect(
      activePayoutDraw({ ...project, payoutOrderDrawId: null }),
    ).toBeUndefined();
    expect(sameParticipants(["a", "a"], ["a", "b"])).toBe(false);
  });
});
