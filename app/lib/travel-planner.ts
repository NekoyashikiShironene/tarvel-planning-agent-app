import outputJson from "@/data/output.json";
import type { FormData, Plan } from "../components/travel-types";

const activityToTagMap: Record<string, string[]> = {
  sightseeing: ["sightseeing", "photo-worthy"],
  "cultural experiences": ["cultural", "lanna-art", "cultural experiences"],
  "local cuisine": ["dining", "street-food"],
  shopping: ["shopping", "local-crafts"],
  "cafe hopping": ["hipster", "social"],
  dining: ["dining"],
  hiking: ["hiking", "outdoor", "nature"],
  "water sports": ["water-sports", "adventure"],
  "beach activities": ["beach", "outdoor"],
  "market exploration": ["walking-street", "shopping"],
  "street food touring": ["street-food", "dining"],
};


export const formDefaults: FormData = {
  location: "Chiang Mai",
  budget: 12000,
  days: 3,
  travelers: 2,
  userNote: "I want culture, local food, and photo spots.",
  mainRoute: "bus",
  localTransport: "car",
  includeTags: ["family-friendly", "sightseeing"],
  preferredActivities: ["sightseeing", "cultural experiences"],
};

export function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}


export function inferTagsFromNote(note: string, preferredActivities: string[], availableTags: string[]): string[] {
  const normalized = note.toLowerCase();
  const detected = new Set<string>();

  const tagKeywords: Array<{ tag: string; terms: string[] }> = [
    { tag: "adventure", terms: ["adventure", "thrill", "exciting"] },
    { tag: "hiking", terms: ["hike", "hiking", "trail", "mountain"] },
    { tag: "shopping", terms: ["shopping", "shop", "mall", "market"] },
    { tag: "dining", terms: ["food", "dining", "restaurant", "eat"] },
    { tag: "cultural", terms: ["culture", "cultural", "temple", "history", "local"] },
    { tag: "cultural experiences", terms: ["culture", "traditional", "heritage"] },
    { tag: "photo-worthy", terms: ["photo", "photography", "instagram", "scenic"] },
    { tag: "beach", terms: ["beach", "sea", "island"] },
    { tag: "water-sports", terms: ["water sport", "snorkel", "dive", "kayak"] },
    { tag: "family-friendly", terms: ["family", "kids", "child"] },
    { tag: "nightlife", terms: ["nightlife", "bar", "night", "party"] },
    { tag: "nature", terms: ["nature", "forest", "waterfall", "park"] },
    { tag: "outdoor", terms: ["outdoor", "outside"] },
    { tag: "sightseeing", terms: ["sightseeing", "landmark", "must see"] },
  ];

  tagKeywords.forEach(({ tag, terms }) => {
    if (terms.some((term) => normalized.includes(term))) {
      detected.add(tag);
    }
  });

  preferredActivities.forEach((activity) => {
    (activityToTagMap[activity] ?? []).forEach((tag) => detected.add(tag));
  });

  const allowed = new Set(availableTags);
  const finalTags = Array.from(detected).filter((tag) => allowed.has(tag));

  if (finalTags.length === 0 && allowed.has("sightseeing")) {
    finalTags.push("sightseeing");
  }

  return finalTags;
}

export async function buildPlan(_form: FormData): Promise<Plan> {
  return JSON.parse(JSON.stringify(outputJson)) as Plan;
}

export function validateForm(_form: FormData): { feasible: boolean; messages: string[] } {
  return {
    feasible: true,
    messages: [
      "Validator Agent: Loaded feasibility from output.json.",
      "Plan Agent: Rendering fixed scheduler_output and presenter_output from output.json.",
    ],
  };
}

export function applyFeedbackToForm(form: FormData, _feedback: string): { nextForm: FormData; notes: string[] } {
  return {
    nextForm: form,
    notes: ["kept fixed plan from output.json"],
  };
}
