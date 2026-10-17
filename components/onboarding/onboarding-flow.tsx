"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  DEFAULT_DRAFT_DATA,
  DRAFT_STORAGE_KEY,
  LAST_STEP,
  STEP_LABELS,
  guessLocaleDefaults,
  parseStoredDraft,
  type OnboardingDraftData,
} from "@/lib/onboarding/draft";
import { MIN_TOPICS } from "@/lib/onboarding/topics";
import { PrintingOverlay } from "./printing-overlay";
import { StepAbout } from "./step-about";
import { StepDeeper } from "./step-deeper";
import { StepPreview } from "./step-preview";
import { StepStyle } from "./step-style";
import { StepTopics } from "./step-topics";
import { StepWelcome } from "./step-welcome";

const TOPICS_STEP = 1;
const OPTIONAL_STEPS = new Set([2, 3, 4]);
const MIN_PRINTING_MS = 2200;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingDraftData>(DEFAULT_DRAFT_DATA);
  const [pendingKeyword, setPendingKeyword] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const mounted = useRef(false);
  const stepRegion = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    const stored = raw ? parseStoredDraft(raw) : null;
    if (stored) {
      setData(stored.data);
      setStep(stored.step);
    } else {
      setData((current) => ({ ...current, ...guessLocaleDefaults() }));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ step, data }));
  }, [hydrated, step, data]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepRegion.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  }, [step]);

  const update = useCallback((patch: Partial<OnboardingDraftData>) => {
    setData((current) => ({ ...current, ...patch }));
    if (patch.topics) setTopicError(null);
  }, []);

  function goTo(next: number) {
    setSubmitError(null);
    setStep(Math.min(Math.max(next, 0), LAST_STEP));
  }

  function onNext() {
    if (step === TOPICS_STEP && data.topics.length < MIN_TOPICS) {
      setTopicError(`Choose at least ${MIN_TOPICS} topics to continue.`);
      return;
    }
    goTo(step + 1);
  }

  async function onFinish() {
    if (data.topics.length < MIN_TOPICS) {
      goTo(TOPICS_STEP);
      setTopicError(`Choose at least ${MIN_TOPICS} topics to continue.`);
      return;
    }

    setSubmitError(null);
    setPrinting(true);
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (!response.ok) {
        setPrinting(false);
        setSubmitError(result?.error ?? "We could not save your profile. Please try again.");
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      await wait(reduceMotion ? 300 : Math.max(0, MIN_PRINTING_MS - (Date.now() - startedAt)));

      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      router.replace(result?.redirectTo ?? "/");
      router.refresh();
    } catch {
      setPrinting(false);
      setSubmitError("We could not reach the server. Check your connection and try again.");
    }
  }

  const isLast = step === LAST_STEP;
  const progress = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <div className="mb-10">
          <div className="flex items-baseline justify-between font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            <span>
              Step {step + 1} of {STEP_LABELS.length}
            </span>
            <span className="text-ink">{STEP_LABELS[step]}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={1}
            aria-valuemax={STEP_LABELS.length}
            aria-valuenow={step + 1}
            aria-valuetext={`Step ${step + 1} of ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}
            className="mt-3 h-px w-full bg-rule"
          >
            <div
              className="h-[3px] -translate-y-px bg-burgundy transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div ref={stepRegion} key={step} className="motion-safe:animate-fade-up">
          {step === 0 && <StepWelcome data={data} update={update} />}
          {step === 1 && <StepTopics data={data} update={update} error={topicError} />}
          {step === 2 && (
            <StepDeeper
              data={data}
              update={update}
              pending={pendingKeyword}
              onPendingChange={setPendingKeyword}
            />
          )}
          {step === 3 && <StepAbout data={data} update={update} />}
          {step === 4 && <StepStyle data={data} update={update} />}
          {step === 5 && <StepPreview data={data} update={update} />}
        </div>

        {submitError && (
          <p
            role="alert"
            className="mt-8 border-l-2 border-burgundy bg-burgundy/5 px-4 py-3 font-sans text-sm text-burgundy motion-safe:animate-fade-in"
          >
            {submitError}
          </p>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-rule pt-6">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0 || printing}
            className="inline-flex items-center gap-2 font-sans text-[13px] font-medium uppercase tracking-[0.12em] text-ink transition-opacity duration-300 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>

          <div className="flex items-center gap-5">
            {OPTIONAL_STEPS.has(step) && (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="font-sans text-[13px] text-ink-muted underline-offset-4 transition-colors duration-300 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? onFinish : onNext}
              disabled={printing}
              className="group inline-flex items-center gap-2 bg-burgundy px-6 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-60"
            >
              {isLast ? "Print my first edition" : step === 0 ? "Get started" : "Continue"}
              <ArrowRight
                className="size-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      {printing && <PrintingOverlay />}
    </>
  );
}
