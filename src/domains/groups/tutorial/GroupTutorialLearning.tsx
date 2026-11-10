"use client";
import { useState } from "react";
import { BookOpen, CheckCircle2, Lightbulb, Target } from "lucide-react";
import type { GroupTutorialLesson } from "./group-tutorial";
import { TUTORIAL_CASES } from "./group-tutorial-guidance";

export function GroupTutorialOverview({
  lesson,
}: {
  lesson: GroupTutorialLesson;
}) {
  const content = TUTORIAL_CASES[lesson.id];
  return (
    <section
      aria-label="Avant de commencer"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#80651e]">
        <BookOpen className="size-4" />
        Un cas concret pour apprendre
      </p>
      <h3 className="!text-lg font-semibold text-[#234D65]">{lesson.title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">
        {content.scenario}
      </p>
      <div className="rounded-xl bg-[#234D65]/5 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#234D65]">
          <Target className="size-4" />
          Votre objectif
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          {content.objective}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-[#234D65]">
            Comment suivre le parcours
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Cliquez sur l’action encadrée pour essayer, ou sur « Montrer » pour
            voir le curseur la réaliser. Le résultat reste affiché jusqu’à «
            Suivant ».
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#234D65]">À votre rythme</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {lesson.steps.length} étapes, un récapitulatif et une question pour
            vérifier l’essentiel. La lecture continue reste facultative.
          </p>
        </div>
      </div>
      <p className="rounded-lg border border-dashed border-[#CBB171]/50 bg-[#CBB171]/10 p-3 text-xs leading-relaxed text-[#80651e]">
        Tout se déroule dans un exemple fictif. Aucun groupe, versement, dossier
        ou remise n’est créé dans votre application.
      </p>
    </section>
  );
}

export function GroupTutorialRecap({
  lesson,
  explored,
}: {
  lesson: GroupTutorialLesson;
  explored: number;
}) {
  const content = TUTORIAL_CASES[lesson.id];
  const [answer, setAnswer] = useState<number | null>(null);
  const correct = answer === content.question.correct;
  return (
    <section aria-label="Récapitulatif du parcours" className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="flex items-center gap-2 !text-lg font-semibold text-[#234D65]">
          <Lightbulb className="size-5 shrink-0" />
          Ce qu’il faut retenir
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          {explored} étape{explored > 1 ? "s" : ""} explorée
          {explored > 1 ? "s" : ""} sur {lesson.steps.length}. Vous pouvez
          revenir sur les étapes de votre choix.
        </p>
        <ul className="mt-4 space-y-3">
          {content.takeaways.map((text) => (
            <li
              key={text}
              className="flex gap-2 text-sm leading-relaxed text-slate-600"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <fieldset className="min-w-0 rounded-xl border border-[#234D65]/20 bg-[#234D65]/5 p-4">
        <legend className="px-1 text-sm font-semibold text-[#234D65]">
          Vérifions avec un exemple
        </legend>
        <p className="mb-3 text-sm font-medium text-slate-700">
          {content.question.prompt}
        </p>
        <div className="space-y-2">
          {content.question.answers.map((text, i) => (
            <label
              key={text}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-white p-3 text-sm leading-relaxed ${answer === i ? "border-[#234D65]" : "border-slate-200"}`}
            >
              <input
                type="radio"
                name={`question-${lesson.id}`}
                value={i}
                checked={answer === i}
                onChange={() => setAnswer(i)}
                className="mt-1 accent-[#234D65]"
              />
              <span>{text}</span>
            </label>
          ))}
        </div>
        {answer !== null && (
          <div
            role="status"
            className={`mt-3 rounded-lg p-3 text-sm leading-relaxed ${correct ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
          >
            <p className="mb-1 font-semibold">
              {correct ? "Exactement." : "Reprenons ce point."}
            </p>
            <p>{content.question.explanation}</p>
            {!correct && (
              <p className="mt-2 text-xs">
                Vous pouvez choisir une autre réponse.
              </p>
            )}
          </div>
        )}
      </fieldset>
    </section>
  );
}
