import type { InterestWeight, UserProfile } from "@/lib/types";

export const mockProfile: UserProfile = {
  id: "mock-user-1",
  name: "Ayesha Khan",
  country: "PK",
  city: "Islamabad",
  timezone: "Asia/Karachi",
  profession: "Small business owner",
  industry: "Retail",
  situation_tags: ["commutes by car", "small business owner", "renter", "investor"],
  languages: ["en", "ur"],
  delivery_hour: 6,
  reading_depth: "standard",
  created_at: "2026-10-01T05:00:00.000Z",
};

function weight(
  key: string,
  kind: InterestWeight["kind"],
  value: number,
): InterestWeight {
  return {
    user_id: mockProfile.id,
    key,
    kind,
    weight: value,
    source: "onboarding",
    updated_at: mockProfile.created_at,
  };
}

export const mockInterestWeights: InterestWeight[] = [
  weight("business", "topic", 0.8),
  weight("energy", "topic", 0.8),
  weight("technology", "topic", 0.8),
  weight("sports", "topic", 0.6),
  weight("politics", "topic", 0.1),
  weight("PSX", "keyword", 0.9),
  weight("cricket", "keyword", 0.9),
];
