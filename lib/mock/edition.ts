import type { Edition, EditionItem } from "@/lib/types";
import { mockProfile } from "./profile";

function item(
  article_id: string,
  section: string,
  position: number,
  size: EditionItem["size"],
  score: number,
  why_shown: string,
  impact_note?: string,
): EditionItem {
  return { article_id, section, position, size, score, why_shown, impact_note };
}

export const mockEdition: Edition = {
  id: "mock-edition-2026-10-17",
  user_id: mockProfile.id,
  edition_date: "2026-10-17",
  headline_of_the_day: "Oil climbs, the rupee holds, and the KSE-100 hits a record",
  items: [
    item("a01", "Front Page", 1, "lead", 0.96, "Because you follow energy and commute by car", "Higher crude prices usually reach petrol pumps within a few weeks."),
    item("a03", "Front Page", 2, "major", 0.91, "Because you follow PSX"),
    item("a02", "Front Page", 3, "major", 0.87, "Because you follow business"),
    item("a11", "Front Page", 4, "standard", 0.7, "Top world story today"),
    item("a06", "Your World", 5, "major", 0.82, "Because you follow technology"),
    item("a07", "Your World", 6, "standard", 0.8, "Because you follow cricket"),
    item("a05", "Your World", 7, "standard", 0.72, "Because you follow technology"),
    item("a19", "Business", 8, "standard", 0.76, "Affects emerging-market currencies"),
    item("a18", "Business", 9, "standard", 0.6, "Opinion on the economy you follow"),
    item("a04", "Pakistan", 10, "standard", 0.5, "Major national story"),
    item("a15", "Pakistan", 11, "brief", 0.42, "Relevant to online transactions"),
    item("a12", "Pakistan", 12, "brief", 0.38, "Education news in your region"),
    item("a08", "Health and Environment", 13, "standard", 0.58, "Health alert in your region"),
    item("a09", "Health and Environment", 14, "brief", 0.55, "Air quality where you live"),
    item("a10", "Science", 15, "brief", 0.45, "Widely read science story"),
    item("a13", "Culture", 16, "brief", 0.33, "Culture in your city"),
    item("a14", "Culture", 17, "brief", 0.3, "Trending entertainment"),
    item("a17", "Travel", 18, "brief", 0.28, "Travel news in your region"),
    item("a16", "Lifestyle", 19, "brief", 0.25, "Because you commute"),
  ],
  connections: [
    {
      id: "conn-oil-to-pump",
      title: "Why oil prices matter at your pump",
      article_ids: ["a01", "a18", "a02"],
      chain: [
        { step: "OPEC+ signals deeper output cuts", article_id: "a01" },
        { step: "Brent crude rises above $92" },
        { step: "Pakistan's fuel import bill and pressure on the rupee", article_id: "a18" },
        { step: "Higher pump prices and a firmer inflation outlook", article_id: "a02" },
      ],
      explanation:
        "Pakistan imports most of its fuel, so a sustained rise in crude lifts the import bill, leans on the rupee, and tends to reach pump prices and inflation within weeks.",
    },
  ],
  generated_at: "2026-10-17T01:00:00.000Z",
};
