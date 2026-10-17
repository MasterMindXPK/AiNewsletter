"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Sliders,
  Trash2,
  Plus,
  RotateCcw,
  BookOpen,
  Bookmark,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import type { InterestProfileSummary, TopicWeightSummary, EntityWeightSummary } from "@/lib/learn/profile-summary";

interface InterestManagerProps {
  initialSummary: InterestProfileSummary;
}

export function InterestManager({ initialSummary }: InterestManagerProps) {
  const [summary, setSummary] = useState<InterestProfileSummary>(initialSummary);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add custom interest form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newKind, setNewKind] = useState<"topic" | "entity" | "keyword">("topic");
  const [newWeight, setNewWeight] = useState(0.6);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }

  async function handleWeightChange(key: string, nextWeight: number) {
    setSavingKey(key);
    // Optimistic update
    setSummary((prev) => ({
      ...prev,
      topics: prev.topics.map((t) =>
        t.key === key
          ? {
              ...t,
              weight: nextWeight,
              percentage: Math.round(nextWeight * 100),
            }
          : t
      ),
    }));

    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_weight",
          key,
          weight: nextWeight,
        }),
      });

      if (!res.ok) throw new Error("Failed to update weight");
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
      showToast(`Updated weight for ${key}`);
    } catch (err) {
      console.error(err);
      showToast("Error updating interest");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRemove(key: string) {
    if (!confirm(`Are you sure you want to remove "${key}" from your interest profile?`)) {
      return;
    }

    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          key,
        }),
      });

      if (!res.ok) throw new Error("Failed to remove interest");
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
      showToast(`Removed "${key}"`);
    } catch (err) {
      console.error(err);
      showToast("Error removing interest");
    }
  }

  async function handleAddInterest(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;

    setSubmittingAdd(true);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          key: newKey.trim(),
          kind: newKind,
          weight: newWeight,
        }),
      });

      if (!res.ok) throw new Error("Failed to add interest");
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
      setNewKey("");
      setShowAddForm(false);
      showToast(`Added custom ${newKind}: "${newKey.trim()}"`);
    } catch (err) {
      console.error(err);
      showToast("Error adding interest");
    } finally {
      setSubmittingAdd(false);
    }
  }

  async function handleResetToBaseline() {
    if (
      !confirm(
        "Reset learned weights to your original onboarding preferences? Any newly discovered topics or drifts will be cleared."
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      if (!res.ok) throw new Error("Failed to reset");
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
      showToast("Learned drift reset to baseline onboarding profile");
    } catch (err) {
      console.error(err);
      showToast("Error resetting profile");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-ink-muted hover:text-burgundy transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Daily Paper
        </Link>
      </div>

      {/* Header section */}
      <header className="border-b-2 border-ink pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-burgundy font-semibold">
              Editorial Calibration & Learning Loop
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-ink font-bold mt-1">
              Your Reading Orbit
            </h1>
            <p className="font-sans text-sm text-ink-muted mt-2 max-w-2xl leading-relaxed">
              Your paper learns from every read, save, and skip. This dashboard gives you total transparency
              and control: adjust topic weights, pin emerging interests, or correct our editorial direction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToBaseline}
              className="inline-flex items-center gap-1.5 border border-rule px-3 py-1.5 font-sans text-xs text-ink hover:border-burgundy hover:text-burgundy transition-colors"
              title="Reset learned weights to onboarding baseline"
            >
              <RotateCcw className="size-3.5" /> Reset Drift
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 border border-ink bg-ink text-paper px-3 py-1.5 font-sans text-xs font-medium hover:bg-burgundy hover:border-burgundy transition-colors"
            >
              <Plus className="size-3.5" /> Add Topic / Entity
            </button>
          </div>
        </div>
      </header>

      {/* Toast banner */}
      {toastMessage && (
        <div className="mb-6 flex items-center gap-2 border border-burgundy/40 bg-burgundy/5 px-4 py-2.5 font-sans text-xs text-burgundy animate-in fade-in duration-200">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Add Custom Interest Form (collapsible) */}
      {showAddForm && (
        <form
          onSubmit={handleAddInterest}
          className="mb-8 border border-ink bg-paper p-5 shadow-[4px_4px_0_0_#17140f] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-rule mb-4">
            <h3 className="font-serif text-base font-semibold text-ink">
              Add New Reading Interest
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="font-sans text-xs text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1">
                Interest Name or Entity
              </label>
              <input
                type="text"
                placeholder="e.g. Artificial Intelligence, State Bank..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                required
                className="w-full border border-rule bg-paper px-3 py-1.5 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1">
                Classification
              </label>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as "topic" | "entity" | "keyword")}
                className="w-full border border-rule bg-paper px-3 py-1.5 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
              >
                <option value="topic">Standard Topic</option>
                <option value="entity">Organization / Entity</option>
                <option value="keyword">Specific Keyword</option>
              </select>
            </div>

            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1">
                Initial Priority ({Math.round(newWeight * 100)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={newWeight}
                onChange={(e) => setNewWeight(parseFloat(e.target.value))}
                className="w-full accent-burgundy mt-2"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submittingAdd || !newKey.trim()}
              className="border border-ink bg-ink text-paper px-4 py-1.5 font-sans text-xs font-semibold hover:bg-burgundy hover:border-burgundy transition-colors disabled:opacity-50"
            >
              {submittingAdd ? "Saving..." : "Pin to Orbit"}
            </button>
          </div>
        </form>
      )}

      {/* Editorial Note & Live Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Editor's Observation Box */}
        <div className="lg:col-span-2 border-l-4 border-burgundy bg-[#fbf9f4] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-burgundy" />
            <span className="font-sans text-xs uppercase tracking-[0.15em] text-burgundy font-semibold">
              The Editor&apos;s Observation
            </span>
          </div>
          <p className="font-serif italic text-base md:text-lg text-ink leading-relaxed">
            &ldquo;{summary.editorialObservation}&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs font-sans text-ink-muted border-t border-rule/60 pt-2.5">
            <span>
              Primary beat: <strong className="text-ink">{summary.stats.topTopic}</strong>
            </span>
            <span>·</span>
            <span>
              Reading style:{" "}
              <strong className="text-ink capitalize">
                {summary.profile?.reading_depth ?? "standard"} depth
              </strong>
            </span>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="border border-rule bg-paper p-5 flex flex-col justify-between">
          <p className="font-sans text-xs uppercase tracking-wider text-ink-muted">
            Reading Signals Processed
          </p>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="border-r border-rule">
              <span className="block font-serif text-2xl font-bold text-ink">
                {summary.stats.articlesRead}
              </span>
              <span className="block font-sans text-[11px] text-ink-muted mt-0.5">Read</span>
            </div>
            <div className="border-r border-rule">
              <span className="block font-serif text-2xl font-bold text-ink">
                {summary.stats.storiesSaved}
              </span>
              <span className="block font-sans text-[11px] text-ink-muted mt-0.5">Saved</span>
            </div>
            <div>
              <span className="block font-serif text-2xl font-bold text-ink">
                {summary.stats.learningSignalsCount}
              </span>
              <span className="block font-sans text-[11px] text-ink-muted mt-0.5">Weights</span>
            </div>
          </div>
          <p className="font-sans text-[11px] text-ink-muted flex items-center gap-1">
            <HelpCircle className="size-3" />
            <span>Weights drift 2% daily to stay fresh</span>
          </p>
        </div>
      </div>

      {/* Dynamic Drift Badges: Newly Noticed & Fading */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Newly Noticed */}
        <div className="border border-rule p-4 bg-[#fbf9f4]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-emerald-700" />
            <h3 className="font-serif text-sm font-semibold text-ink">
              Newly Noticed / Gaining Momentum
            </h3>
          </div>
          {summary.newlyNoticed.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.newlyNoticed.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 border border-emerald-800/20 bg-emerald-700/10 px-2.5 py-1 font-sans text-xs text-emerald-900"
                >
                  <TrendingUp className="size-3" /> {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-ink-muted italic">
              No emerging topics yet. Engaged stories will automatically appear here.
            </p>
          )}
        </div>

        {/* Fading */}
        <div className="border border-rule p-4 bg-[#fbf9f4]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="size-4 text-amber-700" />
            <h3 className="font-serif text-sm font-semibold text-ink">
              Quiet / Receding Topics
            </h3>
          </div>
          {summary.fading.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.fading.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 border border-amber-800/20 bg-amber-700/10 px-2.5 py-1 font-sans text-xs text-amber-900"
                >
                  <TrendingDown className="size-3" /> {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-ink-muted italic">
              All active beats are receiving steady coverage.
            </p>
          )}
        </div>
      </div>

      {/* Main Section: Topic Calibration Sliders */}
      <section className="mb-12">
        <div className="flex items-center justify-between border-b border-ink pb-2 mb-6">
          <h2 className="font-serif text-xl font-bold text-ink">
            Topic Weights & Calibration
          </h2>
          <span className="font-sans text-xs text-ink-muted">
            Drag sliders to tune story distribution
          </span>
        </div>

        <div className="space-y-4">
          {summary.topics.map((topic) => {
            const isSaving = savingKey === topic.key;

            return (
              <div
                key={topic.key}
                className="border border-rule bg-paper p-4 transition-all hover:border-ink/60"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif text-base font-semibold text-ink">
                      {topic.label}
                    </span>
                    <span
                      className={`font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${
                        topic.source === "learned"
                          ? "border-burgundy/30 bg-burgundy/10 text-burgundy"
                          : "border-rule bg-paper text-ink-muted"
                      }`}
                    >
                      {topic.source === "learned" ? "Learned" : "Onboarding"}
                    </span>
                    {topic.trend === "rising" && (
                      <span className="inline-flex items-center gap-0.5 font-sans text-[11px] text-emerald-700">
                        <TrendingUp className="size-3" /> rising
                      </span>
                    )}
                    {topic.trend === "fading" && (
                      <span className="inline-flex items-center gap-0.5 font-sans text-[11px] text-amber-700">
                        <TrendingDown className="size-3" /> fading
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-sans text-xs font-semibold text-ink min-w-[36px] text-right">
                      {topic.percentage}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(topic.key)}
                      className="text-ink-muted hover:text-burgundy transition-colors p-1"
                      title={`Remove or mute ${topic.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar + slider control */}
                <div className="relative flex items-center gap-4">
                  <div className="relative flex-1 h-3 bg-[#e8e2d5] rounded-none overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        topic.source === "learned" ? "bg-burgundy" : "bg-ink"
                      }`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topic.weight}
                    onChange={(e) =>
                      handleWeightChange(topic.key, parseFloat(e.target.value))
                    }
                    className="w-32 sm:w-48 accent-burgundy cursor-pointer"
                    aria-label={`Calibrate weight for ${topic.label}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Entities & Discovered Keywords Section */}
      {summary.entities.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between border-b border-ink pb-2 mb-6">
            <h2 className="font-serif text-xl font-bold text-ink">
              Discovered Entities & Named Interests
            </h2>
            <span className="font-sans text-xs text-ink-muted">
              Promoted after 3+ engaged reads
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {summary.entities.map((ent) => (
              <div
                key={ent.key}
                className="border border-rule bg-paper p-3 flex items-center justify-between hover:border-burgundy transition-colors"
              >
                <div>
                  <p className="font-serif text-sm font-medium text-ink">{ent.key}</p>
                  <p className="font-sans text-[11px] text-ink-muted capitalize">
                    {ent.kind} · {ent.percentage}% priority
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(ent.key)}
                  className="text-ink-muted hover:text-burgundy transition-colors p-1"
                  title={`Remove ${ent.key}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exploration note footer */}
      <footer className="border-t-2 border-rule pt-6 text-center">
        <p className="font-serif italic text-sm text-ink-muted max-w-xl mx-auto">
          &ldquo;A newspaper should not merely confirm what you already know, but introduce you to what you
          ought to explore.&rdquo;
        </p>
        <p className="font-sans text-xs text-ink-muted mt-2">
          Your Orbit reserves 10% to 15% of your morning front page for exploratory stories beyond your current bubble.
        </p>
      </footer>
    </div>
  );
}
