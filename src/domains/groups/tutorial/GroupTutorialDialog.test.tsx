import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GroupTutorialDialog from "./GroupTutorialDialog";
import { GROUP_TUTORIAL_LESSONS } from "./group-tutorial";
import { HelpArticle } from "@/domains/help/components/HelpArticle";
import { groupesHelp } from "@/domains/help/content/systeme";

let reduced = false;
const changeListeners = new Set<() => void>();

beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  changeListeners.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, listener: () => void) =>
      changeListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      changeListeners.delete(listener),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const play = () =>
  fireEvent.click(
    screen.getByRole("button", {
      name: /^(Montrer|Revoir) le geste de cette étape$/,
    }),
  );
const start = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Commencer le parcours" }),
  );
const mountSteps = () => {
  const result = render(<GroupTutorialDialog onClose={vi.fn()} />);
  start();
  return result;
};
const selectLesson = (value: string) => {
  fireEvent.change(screen.getByLabelText("Choisir un parcours"), {
    target: { value },
  });
  start();
};
const selectStep = (value: number) =>
  fireEvent.change(screen.getByLabelText("Choisir une étape"), {
    target: { value: String(value) },
  });
const scene = () =>
  within(screen.getByRole("region", { name: "Scène de démonstration" }));

describe("démonstration des groupes", () => {
  it("ouvre et referme la démonstration depuis l’aide, en gardant le guide écrit", async () => {
    vi.useRealTimers();
    render(<HelpArticle topic={groupesHelp} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Voir une démonstration" }),
    );
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(
      "Découvrir les groupes, pas à pas",
    );
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: groupesHelp.title }),
    ).toBeInTheDocument();
  });
  it("montre les clics, applique une action puis avance, avec une pause qui conserve le temps écoulé", () => {
    mountSteps();
    expect(screen.getByRole("status")).toHaveTextContent("Commencer un groupe");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Enchaîner automatiquement les étapes",
      }),
    );
    play();
    advance(700);
    fireEvent.click(
      screen.getByRole("button", { name: "Mettre la démonstration en pause" }),
    );
    advance(10000);
    expect(scene().queryByText("Le groupe")).not.toBeInTheDocument();
    play();
    advance(700);
    expect(scene().getByText("Le groupe")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    advance(6500);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    advance(30000);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Présenter le collectif",
    );
  });

  it("permet de naviguer, simuler et recommencer sans effectuer de requête réseau", () => {
    const fetch = vi.fn(() => {
      throw new Error("La démonstration doit rester locale");
    });
    vi.stubGlobal("fetch", fetch);
    mountSteps();
    for (const lesson of GROUP_TUTORIAL_LESSONS) {
      selectLesson(lesson.id);
      for (let i = 0; i < lesson.steps.length; i++) {
        selectStep(i);
        fireEvent.click(
          scene().getByRole("button", {
            name: `Simuler : ${lesson.steps[i].action}`,
          }),
        );
        expect(screen.getByRole("status")).toHaveTextContent(
          lesson.steps[i].outcome,
        );
      }
      fireEvent.click(screen.getByRole("button", { name: "Bilan" }));
      expect(
        screen.getByRole("region", { name: "Récapitulatif du parcours" }),
      ).toHaveTextContent(
        `${lesson.steps.length} étapes explorées sur ${lesson.steps.length}`,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Revoir le parcours" }),
      );
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
      fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
      expect(
        screen.getByRole("button", {
          name: /^(Montrer|Revoir) le geste de cette étape$/,
        }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retour" }));
      expect(screen.getByRole("button", { name: "Retour" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Recommencer" }));
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explique le net remis et l’exception du garant sans approuver les demandes fictives", () => {
    mountSteps();
    selectLesson("caisse");
    selectStep(6);
    expect(scene().getAllByText(/29\s000\sF/).length).toBeGreaterThan(0);
    selectLesson("purchase");
    selectStep(2);
    expect(scene().getByText("Autre garant requis")).toBeInTheDocument();
    fireEvent.click(scene().getByRole("button"));
    expect(scene().getByText("Paul NGUEMA")).toBeInTheDocument();
    selectStep(4);
    fireEvent.click(scene().getByRole("button"));
    expect(scene().getAllByText("Demande en attente")).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent("en attente");
  });

  it("garde le résultat en mode pas à pas et permet de revoir le geste sans changer d’étape", () => {
    mountSteps();
    play();
    advance(1400);
    expect(
      screen.getByRole("button", { name: "Revoir le geste de cette étape" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ce qui a changé");
    advance(30000);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    play();
    expect(screen.getByRole("status")).not.toHaveTextContent("Ce qui a changé");
    advance(1400);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });

  it("arrête la lecture continue au dernier résultat et ne confond pas étapes sautées et explorées", () => {
    mountSteps();
    selectStep(5);
    expect(screen.getByRole("button", { name: "Bilan" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Enchaîner automatiquement les étapes",
      }),
    );
    play();
    advance(1400);
    fireEvent.click(
      screen.getByRole("button", { name: "Mettre la démonstration en pause" }),
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "6",
    );
    selectStep(5);
    play();
    advance(30000);
    expect(
      screen.getByRole("button", { name: "Revoir le geste de cette étape" }),
    ).toBeInTheDocument();
    advance(30000);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "6",
    );
    fireEvent.click(screen.getByRole("button", { name: "Bilan" }));
    expect(
      screen.getByRole("region", { name: "Récapitulatif du parcours" }),
    ).toHaveTextContent("1 étape explorée sur 6");
  });

  it("explique une mauvaise réponse puis permet de corriger sans enregistrer de résultat réel", () => {
    mountSteps();
    selectLesson("caisse");
    selectStep(7);
    fireEvent.click(scene().getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "Bilan" }));
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Oui, puisque Nadia est première dans l’ordre.",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Reprenons ce point.");
    expect(screen.getByRole("status")).toHaveTextContent(
      "réunir les 30 000 FCFA",
    );
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Non : il manque encore les 20 000 FCFA de Bruno et Nadia.",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Exactement.");
    fireEvent.click(
      screen.getByRole("button", { name: "Découvrir un autre parcours" }),
    );
    expect(
      screen.getByRole("region", { name: "Avant de commencer" }),
    ).toHaveTextContent("Le congélateur coûte 300 000 FCFA");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("montre les vrais changements d’état : cycle créé et redevance déduite, uniquement dans la caisse", () => {
    mountSteps();
    selectStep(5);
    fireEvent.click(scene().getByRole("button"));
    expect(
      scene().queryByLabelText("Cycle de cotisations créé"),
    ).not.toBeInTheDocument();
    selectLesson("caisse");
    selectStep(1);
    fireEvent.click(scene().getByRole("button"));
    expect(
      scene().getByLabelText("Cycle de cotisations créé"),
    ).toHaveTextContent("Janvier");
    selectStep(5);
    expect(scene().getByText("30 000 F")).toBeInTheDocument();
    fireEvent.click(scene().getByRole("button"));
    expect(scene().getByText("29 000 F")).toBeInTheDocument();
  });

  it("met en pause si l’onglet devient masqué ou si la réduction des animations est activée", () => {
    const { unmount } = mountSteps();
    play();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    advance(6500);
    expect(
      screen.getByRole("button", {
        name: /^(Montrer|Revoir) le geste de cette étape$/,
      }),
    ).toBeInTheDocument();
    play();
    act(() => {
      reduced = true;
      changeListeners.forEach((listener) => listener());
    });
    expect(
      screen.getByText(/animations du curseur sont désactivées/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /^(Montrer|Revoir) le geste de cette étape$/,
      }),
    ).toBeInTheDocument();
    fireEvent.click(scene().getByRole("button"));
    expect(scene().getByText("Le groupe")).toBeInTheDocument();
    unmount();
    expect(changeListeners.size).toBe(0);
  });

  it("ferme la démonstration avec le bouton de fermeture", () => {
    const onClose = vi.fn();
    render(<GroupTutorialDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
