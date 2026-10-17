"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Briefcase,
  Sliders,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Compass,
} from "lucide-react";
import {
  COUNTRY_CODES,
  COUNTRY_NAMES,
  PROFESSION_PRESETS,
  INDUSTRY_PRESETS,
  CITY_SUGGESTIONS,
  SITUATION_TAGS,
  DEPTH_OPTIONS,
  type CountryCode,
} from "@/lib/onboarding/topics";

export interface ProfileData {
  name: string;
  email: string;
  country: string;
  city: string;
  timezone: string;
  profession: string;
  industry: string | null;
  situation_tags: string[];
  languages: string[];
  delivery_hour: number;
  reading_depth: "brief" | "standard" | "deep";
  created_at: string;
}

interface ProfileEditorProps {
  initialProfile: ProfileData;
}

export function ProfileEditor({ initialProfile }: ProfileEditorProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [regenerate, setRegenerate] = useState(true);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function toggleSituationTag(tag: string) {
    setProfile((prev) => {
      const exists = prev.situation_tags.includes(tag);
      return {
        ...prev,
        situation_tags: exists
          ? prev.situation_tags.filter((t) => t !== tag)
          : [...prev.situation_tags, tag],
      };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          country: profile.country,
          city: profile.city,
          timezone: profile.timezone,
          profession: profile.profession,
          industry: profile.industry,
          situation_tags: profile.situation_tags,
          reading_depth: profile.reading_depth,
          delivery_hour: profile.delivery_hour,
          languages: profile.languages,
          regenerateEdition: regenerate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }

      showToast(
        regenerate
          ? "Profile saved and today's paper is being calibrated!"
          : "Profile updated successfully."
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast("Error updating profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Back breadcrumb */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-ink-muted hover:text-burgundy transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Daily Paper
        </Link>
      </div>

      {/* Page Header */}
      <header className="border-b-2 border-ink pb-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-burgundy font-semibold">
              Subscriber Account & Editorial Persona
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-ink font-bold mt-1">
              Your Profile
            </h1>
            <p className="font-sans text-sm text-ink-muted mt-2 max-w-2xl leading-relaxed">
              Your location, vocation, and life situation configure how Your Orbit weights regional
              developments and composes personal impact notes under stories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings/interests"
              className="inline-flex items-center gap-1.5 border border-rule px-3.5 py-2 font-sans text-xs font-medium text-ink hover:border-burgundy hover:text-burgundy transition-colors"
            >
              <Compass className="size-3.5" /> Calibrate Interests
            </Link>
          </div>
        </div>
      </header>

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="mb-6 flex items-center gap-2 border border-burgundy/40 bg-burgundy/5 px-4 py-3 font-sans text-xs text-burgundy animate-in fade-in duration-200">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Account Info Banner */}
      <div className="mb-8 border border-rule bg-[#fbf9f4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-ink text-paper">
            <User className="size-4" />
          </div>
          <div>
            <p className="font-serif text-sm font-semibold text-ink">{profile.name || "Reader"}</p>
            <p className="font-sans text-xs text-ink-muted">{profile.email}</p>
          </div>
        </div>
        <div className="font-sans text-xs text-ink-muted">
          Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Basic Identity & Masthead Name */}
        <section className="border border-rule bg-paper p-6">
          <div className="flex items-center gap-2 border-b border-rule pb-3 mb-5">
            <User className="size-4 text-burgundy" />
            <h2 className="font-serif text-lg font-semibold text-ink">Reader Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                Full Name (Printed on Masthead)
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                className="w-full border border-rule bg-paper px-3.5 py-2 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
                placeholder="e.g. Adeen Malik"
              />
              <span className="mt-1 block font-sans text-[11px] text-ink-muted">
                Appears on your paper masthead: &ldquo;Prepared for {profile.name || "you"}&rdquo;
              </span>
            </div>

            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                Registered Email (Sign-in)
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full border border-rule bg-rule/20 px-3.5 py-2 font-sans text-sm text-ink-muted cursor-not-allowed opacity-80"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Location & Delivery */}
        <section className="border border-rule bg-paper p-6">
          <div className="flex items-center gap-2 border-b border-rule pb-3 mb-5">
            <MapPin className="size-4 text-burgundy" />
            <h2 className="font-serif text-lg font-semibold text-ink">Location & Delivery Time</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                Country
              </label>
              <select
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full border border-rule bg-paper px-3.5 py-2 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {COUNTRY_NAMES[code as CountryCode] || code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                City
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                required
                className="w-full border border-rule bg-paper px-3.5 py-2 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
                placeholder="e.g. Islamabad"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {CITY_SUGGESTIONS.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProfile({ ...profile, city: c })}
                    className="font-sans text-[10px] text-ink-muted hover:text-burgundy border border-rule/80 px-1.5 py-0.5"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                Morning Edition Hour
              </label>
              <select
                value={profile.delivery_hour}
                onChange={(e) => setProfile({ ...profile, delivery_hour: parseInt(e.target.value, 10) })}
                className="w-full border border-rule bg-paper px-3.5 py-2 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
              >
                {[5, 6, 7, 8, 9, 10].map((h) => (
                  <option key={h} value={h}>
                    {h < 10 ? `0${h}` : h}:00 AM (Local)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Vocation & Industry */}
        <section className="border border-rule bg-paper p-6">
          <div className="flex items-center gap-2 border-b border-rule pb-3 mb-5">
            <Briefcase className="size-4 text-burgundy" />
            <h2 className="font-serif text-lg font-semibold text-ink">Vocation & Industry Focus</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                Profession
              </label>
              <input
                type="text"
                value={profile.profession}
                onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                className="w-full border border-rule bg-paper px-3.5 py-2 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
                placeholder="e.g. Software Engineer, Doctor, Economist"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {PROFESSION_PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProfile({ ...profile, profession: p })}
                    className="font-sans text-[10px] text-ink-muted hover:text-burgundy border border-rule/80 px-1.5 py-0.5"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                Industry
              </label>
              <select
                value={profile.industry || ""}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value || null })}
                className="w-full border border-rule bg-paper px-3.5 py-2 font-sans text-sm text-ink focus:border-burgundy focus:outline-none"
              >
                <option value="">Select industry sector...</option>
                {INDUSTRY_PRESETS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Life Situation Tags (Feeds Impact Analysis) */}
        <section className="border border-rule bg-paper p-6">
          <div className="flex items-center justify-between border-b border-rule pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-burgundy" />
              <h2 className="font-serif text-lg font-semibold text-ink">Personal Context Tags</h2>
            </div>
            <span className="font-sans text-[11px] text-burgundy font-medium uppercase tracking-wider">
              Powers &ldquo;What this means for you&rdquo;
            </span>
          </div>

          <p className="font-sans text-xs text-ink-muted mb-4 leading-relaxed">
            Select the circumstances that apply to your daily life. These allow our editorial algorithms
            to provide concrete, localized impact assessments beneath major stories.
          </p>

          <div className="flex flex-wrap gap-2">
            {SITUATION_TAGS.map((tag) => {
              const active = profile.situation_tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSituationTag(tag)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs transition-colors border ${
                    active
                      ? "border-burgundy bg-burgundy text-paper font-medium"
                      : "border-rule bg-paper text-ink hover:border-ink"
                  }`}
                >
                  <span>{tag}</span>
                  {active && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 5: Reading Depth Selection */}
        <section className="border border-rule bg-paper p-6">
          <div className="flex items-center gap-2 border-b border-rule pb-3 mb-5">
            <Sliders className="size-4 text-burgundy" />
            <h2 className="font-serif text-lg font-semibold text-ink">Reading Depth</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEPTH_OPTIONS.map((opt) => {
              const selected = profile.reading_depth === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`relative flex flex-col justify-between border p-4 cursor-pointer transition-all ${
                    selected
                      ? "border-burgundy bg-burgundy/5 shadow-[2px_2px_0_0_#6d1f2e]"
                      : "border-rule bg-paper hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="reading_depth"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setProfile({ ...profile, reading_depth: opt.value })}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif text-base font-bold text-ink">{opt.label}</span>
                      {selected && <span className="text-burgundy text-xs font-bold">Selected</span>}
                    </div>
                    <p className="font-sans text-xs text-ink-muted mt-1">{opt.description}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-rule/50 font-sans text-[11px] font-semibold text-burgundy">
                    {opt.time}
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Action Bar */}
        <div className="border-t-2 border-ink pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-ink">
            <input
              type="checkbox"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              className="accent-burgundy size-4"
            />
            <span>Refresh today&apos;s edition immediately after saving</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 border border-burgundy bg-burgundy text-paper px-6 py-3 font-sans text-xs font-semibold uppercase tracking-wider hover:bg-burgundy/90 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="size-4 animate-spin" /> : null}
            <span>{saving ? "Saving Changes..." : "Save Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
