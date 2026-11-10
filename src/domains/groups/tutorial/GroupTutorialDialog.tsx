"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { GroupTutorialScene } from "./GroupTutorialScene";
import {
  GroupTutorialOverview,
  GroupTutorialRecap,
} from "./GroupTutorialLearning";
import { TUTORIAL_GUIDANCE } from "./group-tutorial-guidance";
import {
  GROUP_TUTORIAL_APPLY_MS,
  GROUP_TUTORIAL_LESSONS,
  getGroupTutorialStepDuration,
} from "./group-tutorial";
const LESSON_ICONS = { create: Users, caisse: Wallet, purchase: ShoppingBag };
/** Deliberately independent of group services, session data and write endpoints. */
export default function GroupTutorialDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const id = useId();
  const [lessonId, setLessonId] = useState("create");
  const [view, setView] = useState<"intro" | "steps" | "summary">("intro");
  const [continuous, setContinuous] = useState(false);
  const [explored, setExplored] = useState<ReadonlySet<string>>(new Set());
  const lesson = GROUP_TUTORIAL_LESSONS.find((l) => l.id === lessonId)!;
  const [index, setIndex] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [playing, setPlaying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [target, setTarget] = useState({ x: 32, y: 32 }),
    [origin, setOrigin] = useState({ x: 24, y: 24 });
  const stage = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const step = lesson.steps[index];
  const guidance = TUTORIAL_GUIDANCE[step.id];
  const applied = elapsed >= GROUP_TUTORIAL_APPLY_MS;
  const last = index === lesson.steps.length - 1;
  const done = last && applied;
  useEffect(() => {
    if (applied)
      setExplored((previous) =>
        previous.has(step.id) ? previous : new Set([...previous, step.id]),
      );
  }, [applied, step.id]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduceMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setElapsed((t) => t + 100), 100);
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing]);
  useEffect(() => {
    if (!playing) return;
    if (applied && !continuous) {
      setPlaying(false);
      setElapsed(GROUP_TUTORIAL_APPLY_MS);
      return;
    }
    if (elapsed < getGroupTutorialStepDuration(step)) return;
    if (last) {
      setPlaying(false);
      setElapsed(GROUP_TUTORIAL_APPLY_MS);
    } else {
      setIndex((i) => i + 1);
      setElapsed(0);
    }
  }, [elapsed, playing, last, applied, continuous, step]);
  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0;
    const area = stage.current,
      frame = viewport.current;
    if (!area || !frame) return;
    frame.scrollTop = 0;
    const measure = () => {
      const anchor = area.querySelector<HTMLElement>("[data-tutorial-target]");
      if (!anchor) return;
      const a = area.getBoundingClientRect(),
        b = anchor.getBoundingClientRect();
      const x =
        (b.left - a.left + b.width * 0.65) *
        (a.width ? area.offsetWidth / a.width : 1);
      const y =
        (b.top - a.top + b.height * 0.55) *
        (a.height ? area.offsetHeight / a.height : 1);
      setTarget((old) =>
        Math.abs(old.x - x) < 0.5 && Math.abs(old.y - y) < 0.5 ? old : { x, y },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [step.id, view]);
  useEffect(() => {
    if (!playing || !viewport.current || !stage.current) return;
    const frame = viewport.current,
      anchor = stage.current.querySelector<HTMLElement>(
        "[data-tutorial-target]",
      );
    if (anchor && frame.clientHeight) {
      const a = frame.getBoundingClientRect(),
        b = anchor.getBoundingClientRect();
      const top = b.top - a.top + frame.scrollTop;
      if (b.bottom > a.bottom - 16 || b.top < a.top + 16)
        frame.scrollTop = Math.max(0, top - frame.clientHeight * 0.55);
    }
    // Keep the simulated gesture visible inside the modal, including on a phone.
    if (body.current) {
      const container = body.current.getBoundingClientRect();
      const scene = frame.getBoundingClientRect();
      if (scene.bottom > container.bottom || scene.top < container.top)
        body.current.scrollTop += scene.top - container.top;
    }
    setOrigin({ x: 24, y: frame.scrollTop + 24 });
  }, [playing, step.id]);
  const go = (next: number) => {
    setPlaying(false);
    setIndex(next);
    setElapsed(0);
  };
  const selectLesson = (next: string) => {
    if (!GROUP_TUTORIAL_LESSONS.some((l) => l.id === next)) return;
    setPlaying(false);
    setLessonId(next);
    setIndex(0);
    setElapsed(0);
    setView("intro");
    setExplored(new Set());
  };
  const restart = () => {
    go(0);
    setExplored(new Set());
    setView("steps");
  };
  const toggle = () => {
    if (applied && !playing) {
      setElapsed(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  };
  const apply = () => {
    setPlaying(false);
    setElapsed(GROUP_TUTORIAL_APPLY_MS);
  };
  const progress = Math.max(0, Math.min(1, (elapsed - 200) / 800));
  const ease = 1 - Math.pow(1 - progress, 3);
  const cursor = {
    x: origin.x + (target.x - origin.x) * ease,
    y: origin.y + (target.y - origin.y) * ease,
  };
  const showCursor = !reduceMotion && elapsed > 0 && !applied;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent size="4xl" className="max-h-[94dvh]">
        <ModalHeader
          icon={MousePointer2}
          title="Découvrir les groupes, pas à pas"
          description="Exemple fictif : vos données ne sont pas modifiées."
          className="px-3 py-3 sm:px-6 sm:py-4 [&_[data-slot=dialog-title]]:break-words [&_[data-slot=dialog-title]]:!text-base [&_[data-slot=dialog-description]]:text-xs sm:[&_[data-slot=dialog-description]]:text-sm"
        />
        <ModalBody
          ref={body}
          key={lesson.id}
          className="space-y-3 px-3 py-3 sm:px-6 sm:py-4"
        >
          <div className="sm:hidden">
            <label htmlFor={`${id}-lesson`} className="sr-only">
              Choisir un parcours
            </label>
            <select
              id={`${id}-lesson`}
              value={lesson.id}
              onChange={(e) => selectLesson(e.target.value)}
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
            >
              {GROUP_TUTORIAL_LESSONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} · {l.steps.length} étapes
                </option>
              ))}
            </select>
          </div>
          <div
            className="hidden gap-2 sm:grid sm:grid-cols-3"
            aria-label="Parcours disponibles"
          >
            {GROUP_TUTORIAL_LESSONS.map((l) => {
              const Icon = LESSON_ICONS[l.id];
              return (
                <button
                  type="button"
                  key={l.id}
                  aria-pressed={lesson.id === l.id}
                  onClick={() => selectLesson(l.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${lesson.id === l.id ? "border-[#234D65] bg-[#234D65]/5" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#234D65]">
                    <Icon className="size-4 shrink-0" />
                    {l.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {l.description} · {l.steps.length} étapes
                  </span>
                </button>
              );
            })}
          </div>
          {view === "intro" && <GroupTutorialOverview lesson={lesson} />}
          {view === "summary" && (
            <GroupTutorialRecap
              key={lesson.id}
              lesson={lesson}
              explored={explored.size}
            />
          )}
          {view === "steps" && (
            <>
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-3 lg:contents">
                  <div
                    className="rounded-xl bg-[#234D65]/5 p-3 lg:col-start-2 lg:row-start-1"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <p className="mb-2 text-[11px] font-medium text-slate-500">
                      Où aller : {guidance.where}
                    </p>
                    <h3 className="flex items-start gap-2 !text-sm font-semibold text-[#234D65]">
                      {applied ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#234D65] text-[11px] text-white">
                          {index + 1}
                        </span>
                      )}
                      <span>{step.title}</span>
                    </h3>
                    {applied ? (
                      <details className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        <summary className="cursor-pointer">
                          Revoir la consigne
                        </summary>
                        <p className="mt-1">{step.instruction}</p>
                      </details>
                    ) : (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {step.instruction}
                      </p>
                    )}
                    {applied && (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
                        <p className="mb-1 font-semibold">Ce qui a changé</p>
                        {step.outcome}
                      </div>
                    )}
                    <details className="mt-2 text-xs leading-relaxed text-slate-600">
                      <summary className="cursor-pointer font-semibold text-[#234D65]">
                        Pourquoi cette étape ?
                      </summary>
                      <p className="mt-1">{guidance.why}</p>
                    </details>
                  </div>
                  <div
                    ref={viewport}
                    className="h-[min(42dvh,400px)] min-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:h-full lg:min-h-[440px] lg:max-h-[580px]"
                    aria-label="Scène de démonstration"
                    role="region"
                  >
                    <div ref={stage} className="relative min-h-full p-3 sm:p-4">
                      <GroupTutorialScene
                        key={step.id}
                        step={step}
                        applied={applied}
                        onApply={apply}
                      />
                      {showCursor && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute left-0 top-0 z-10 motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-linear"
                          style={{
                            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
                          }}
                        >
                          <MousePointer2 className="size-7 fill-white text-[#234D65] drop-shadow-md" />
                          {elapsed >= 1000 && (
                            <span className="absolute -left-3 -top-3 size-7 animate-ping rounded-full border-2 border-[#CBB171] motion-reduce:animate-none" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500 lg:col-start-1 lg:row-start-3">
                    Cliquez sur l’élément encadré pour essayer, ou sur « Montrer
                    » pour voir le geste. Le résultat reste affiché en mode pas
                    à pas.
                    {reduceMotion
                      ? " Les animations du curseur sont désactivées selon votre préférence."
                      : ""}
                  </p>
                </div>
                <nav
                  aria-label="Étapes du parcours"
                  className="hidden min-w-0 lg:col-start-2 lg:row-start-2 lg:block"
                >
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    {lesson.title}
                  </p>
                  <ol className="space-y-1">
                    {lesson.steps.map((s, i) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-current={i === index ? "step" : undefined}
                          onClick={() => go(i)}
                          className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs leading-relaxed ${i === index ? "bg-[#234D65] font-semibold text-white" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current/20 text-[10px]">
                            {explored.has(s.id) ? (
                              <CheckCircle2 className="size-3" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span>{s.title}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter className="px-3 py-3 sm:px-6">
          {view === "intro" && (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Pas à pas · {lesson.steps.length} étapes
              </p>
              <Button onClick={() => setView("steps")}>
                Commencer le parcours
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
          {view === "summary" && (
            <div className="flex w-full flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={restart}
                className="h-auto min-h-9 w-full whitespace-normal py-2 text-xs sm:w-auto sm:text-sm"
              >
                <RotateCcw className="size-4" />
                Revoir le parcours
              </Button>
              <Button
                className="h-auto min-h-9 w-full whitespace-normal py-2 text-xs sm:w-auto sm:text-sm"
                onClick={() =>
                  selectLesson(
                    GROUP_TUTORIAL_LESSONS[
                      (GROUP_TUTORIAL_LESSONS.findIndex(
                        (l) => l.id === lesson.id,
                      ) +
                        1) %
                        GROUP_TUTORIAL_LESSONS.length
                    ].id,
                  )
                }
              >
                Découvrir un autre parcours
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
          {view === "steps" && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="shrink-0 text-xs font-medium text-slate-500">
                  {`Étape ${index + 1} sur ${lesson.steps.length}`}
                </p>
                <button
                  type="button"
                  onClick={restart}
                  className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#234D65]"
                >
                  <RotateCcw className="size-3" />
                  Recommencer
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={continuous}
                  onChange={(event) => setContinuous(event.target.checked)}
                  className="accent-[#234D65]"
                />
                Enchaîner automatiquement les étapes
              </label>
              <div
                role="progressbar"
                aria-label="Progression du parcours"
                aria-valuemin={1}
                aria-valuemax={lesson.steps.length}
                aria-valuenow={index + 1}
                className="h-1 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full bg-[#CBB171]"
                  style={{
                    width: `${((index + 1) / lesson.steps.length) * 100}%`,
                  }}
                />
              </div>
              <select
                aria-label="Choisir une étape"
                value={index}
                onChange={(e) => go(Number(e.target.value))}
                className="h-9 w-full rounded-lg border bg-white px-2 text-xs lg:hidden"
              >
                {lesson.steps.map((s, i) => (
                  <option key={s.id} value={i}>
                    {i + 1}. {s.title}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
                  disabled={index === 0}
                  onClick={() => go(index - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Retour
                </Button>
                <Button
                  size="sm"
                  className="min-w-0 flex-1 gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
                  onClick={toggle}
                  aria-label={
                    playing
                      ? "Mettre la démonstration en pause"
                      : applied
                        ? "Revoir le geste de cette étape"
                        : "Montrer le geste de cette étape"
                  }
                >
                  {playing ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {playing ? "Pause" : applied ? "Revoir" : "Montrer"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
                  disabled={last && !applied}
                  onClick={() => {
                    if (done) {
                      setPlaying(false);
                      setView("summary");
                    } else go(index + 1);
                  }}
                >
                  {last ? "Bilan" : "Suivant"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Dialog>
  );
}
