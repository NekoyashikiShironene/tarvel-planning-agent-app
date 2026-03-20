"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Space_Grotesk, Sora } from "next/font/google";
import attractionsJson from "@/temp/attractions.json";
import masterJson from "@/temp/master.json";
import roomsJson from "@/temp/rooms.json";
import transportJson from "@/temp/transportations.json";

const headingFont = Space_Grotesk({ subsets: ["latin"] });
const bodyFont = Sora({ subsets: ["latin"] });

type FormData = {
  location: string;
  budget: number;
  days: number;
  travelers: number;
  userNote: string;
  mainRoute: string;
  localTransport: string;
  includeTags: string[];
  preferredActivities: string[];
};

type ChatMessage = {
  role: "user" | "agent";
  content?: string;
  kind?: "text" | "plan";
  plan?: Plan;
  title?: string;
};

type DailyPlan = {
  day: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
};

type Plan = {
  summary: string;
  hotel: {
    name: string;
    room: string;
    nightlyRate: number;
  };
  mainRoute: {
    name: string;
    type: string;
    note: string;
  };
  localTransport: {
    name: string;
    type: string;
    note: string;
  };
  cost: {
    accommodation: number;
    activities: number;
    transport: number;
    total: number;
    remaining: number;
  };
  itinerary: DailyPlan[];
};

type Attraction = {
  name: string;
  province: string;
  description: string;
  tags: string[];
};

type Room = {
  hotel_name: string;
  room_name: string;
  capacity: number;
  price_per_night: number;
};

type Transport = {
  name: string;
  type: string;
  metadata?: string[];
};

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

const transportBaseCost: Record<string, number> = {
  train: 900,
  bus: 600,
  airplane: 2200,
  car: 500,
  motorbike: 300,
};

const formDefaults: FormData = {
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

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function parseDurationDays(days: number): number {
  if (Number.isNaN(days) || days < 1) return 1;
  if (days > 14) return 14;
  return days;
}

function getBestNote(metadata?: string[]): string {
  if (!metadata || metadata.length === 0) return "No extra details available.";
  return metadata[0];
}

function inferTagsFromNote(note: string, preferredActivities: string[], availableTags: string[]): string[] {
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

function buildPlan(form: FormData): Plan {
  const attractions = attractionsJson.attractions as Attraction[];
  const rooms = roomsJson.data as Room[];
  const transport = transportJson as { main_route: Transport[]; local_transport: Transport[] };

  const nights = Math.max(1, form.days - 1);

  const preferredTags = new Set<string>([
    ...form.includeTags,
    ...form.preferredActivities.flatMap((activity) => activityToTagMap[activity] ?? []),
  ]);

  const locationAttractions = attractions.filter((item) => item.province === form.location);
  const scoredAttractions = locationAttractions
    .map((item) => {
      const score = item.tags.reduce((acc, tag) => (preferredTags.has(tag) ? acc + 1 : acc), 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const selectedAttractions = scoredAttractions.slice(0, Math.max(3, form.days * 2)).map((entry) => entry.item);

  const candidateRooms = rooms
    .filter((room) => room.capacity >= form.travelers)
    .sort((a, b) => a.price_per_night - b.price_per_night);
  const maxNightlyBudget = Math.max(300, Math.floor(form.budget * 0.45 / nights));
  const selectedRoom =
    candidateRooms.find((room) => room.price_per_night <= maxNightlyBudget) ?? candidateRooms[0] ?? rooms[0];

  const mainRouteName = `Bangkok to ${form.location}`;
  const selectedMainRoute =
    transport.main_route.find((item) => item.name === mainRouteName && item.type === form.mainRoute) ??
    transport.main_route.find((item) => item.name === mainRouteName) ??
    transport.main_route[0];

  const selectedLocalTransport =
    transport.local_transport.find((item) => item.type === form.localTransport) ?? transport.local_transport[0];

  const itinerary: DailyPlan[] = Array.from({ length: form.days }).map((_, index) => {
    const morning = selectedAttractions[(index * 2) % selectedAttractions.length];
    const afternoon = selectedAttractions[(index * 2 + 1) % selectedAttractions.length];
    const evening = selectedAttractions[(index * 2 + 2) % selectedAttractions.length];

    return {
      day: index + 1,
      theme: form.preferredActivities[index % form.preferredActivities.length] ?? "free exploration",
      morning: `${morning?.name ?? "Local market walk"} - ${morning?.description ?? "Discover hidden spots."}`,
      afternoon: `${afternoon?.name ?? "Signature lunch + sightseeing"} - ${afternoon?.description ?? "Enjoy local highlights."}`,
      evening: `${evening?.name ?? "Sunset and dinner"} - ${evening?.description ?? "Relax and wrap the day."}`,
    };
  });

  const accommodation = selectedRoom.price_per_night * nights;
  const activities = form.days * form.travelers * 320;
  const transportCost =
    ((transportBaseCost[selectedMainRoute.type] ?? 800) * form.travelers) +
    ((transportBaseCost[selectedLocalTransport.type] ?? 300) * form.days);
  const total = accommodation + activities + transportCost;

  return {
    summary: `Your ${form.days}-day ${form.location} trip is ready with ${form.mainRoute} + ${form.localTransport}.`,
    hotel: {
      name: selectedRoom.hotel_name,
      room: selectedRoom.room_name,
      nightlyRate: selectedRoom.price_per_night,
    },
    mainRoute: {
      name: selectedMainRoute.name,
      type: selectedMainRoute.type,
      note: getBestNote(selectedMainRoute.metadata),
    },
    localTransport: {
      name: selectedLocalTransport.name,
      type: selectedLocalTransport.type,
      note: getBestNote(selectedLocalTransport.metadata),
    },
    cost: {
      accommodation,
      activities,
      transport: transportCost,
      total,
      remaining: form.budget - total,
    },
    itinerary,
  };
}

function validateForm(form: FormData): { feasible: boolean; messages: string[] } {
  const data = masterJson;
  const errors: string[] = [];

  if (!data.locations.includes(form.location)) {
    errors.push(`Location is unavailable. Please choose one of: ${data.locations.join(", ")}.`);
  }
  if (form.days < 1 || form.days > 14) {
    errors.push("Trip duration must be between 1 and 14 days.");
  }
  if (form.travelers < 1 || form.travelers > 8) {
    errors.push("Number of travelers must be between 1 and 8.");
  }
  if (form.preferredActivities.length === 0) {
    errors.push("Pick at least one preferred activity.");
  }

  const days = parseDurationDays(form.days);
  const nightlyMinimum = 300;
  const minimumBudget = (nightlyMinimum * Math.max(1, days - 1)) + (days * form.travelers * 450);
  if (form.budget < minimumBudget) {
    errors.push(
      `Budget seems too low. Estimated minimum for this setup is around THB ${minimumBudget.toLocaleString()}.`
    );
  }

  if (errors.length > 0) {
    return {
      feasible: false,
      messages: [
        "Validator Agent: I cannot build a feasible plan yet.",
        ...errors.map((entry, index) => `${index + 1}. ${entry}`),
        "Please adjust the form and submit again.",
      ],
    };
  }

  return {
    feasible: true,
    messages: [
      "Validator Agent: Input looks feasible.",
      "Plan Agent: I am searching attractions, room, and transport options now...",
    ],
  };
}

function applyFeedbackToForm(form: FormData, feedback: string): { nextForm: FormData; notes: string[] } {
  const normalized = feedback.toLowerCase();
  const notes: string[] = [];
  const nextForm: FormData = {
    ...form,
    includeTags: [...form.includeTags],
    preferredActivities: [...form.preferredActivities],
  };

  const addActivity = (activity: string) => {
    if (!nextForm.preferredActivities.includes(activity)) {
      nextForm.preferredActivities.push(activity);
      notes.push(`prioritized ${activity}`);
    }
  };

  const addTag = (tag: string) => {
    if (!nextForm.includeTags.includes(tag)) {
      nextForm.includeTags.push(tag);
      notes.push(`added ${tag}`);
    }
  };

  if (normalized.includes("cheap") || normalized.includes("budget") || normalized.includes("save")) {
    nextForm.mainRoute = "bus";
    nextForm.localTransport = "bus";
    notes.push("switched transport to lower-cost options");
  }
  if (normalized.includes("adventure") || normalized.includes("thrill")) {
    addActivity("hiking");
    addActivity("water sports");
    addTag("adventure");
  }
  if (normalized.includes("shopping") || normalized.includes("market")) {
    addActivity("shopping");
    addActivity("market exploration");
    addTag("shopping");
  }
  if (normalized.includes("culture") || normalized.includes("temple") || normalized.includes("local")) {
    addActivity("cultural experiences");
    addTag("cultural");
  }
  if (normalized.includes("food") || normalized.includes("restaurant") || normalized.includes("street food")) {
    addActivity("street food touring");
    addTag("dining");
  }
  if (normalized.includes("beach") || normalized.includes("sea")) {
    addActivity("beach activities");
    addTag("beach");
    if (nextForm.location !== "Phuket") {
      nextForm.location = "Phuket";
      notes.push("switched location to Phuket for beach-focused requests");
    }
  }

  if (notes.length === 0) {
    notes.push("kept your constraints and refreshed attraction picks");
  }

  return { nextForm, notes };
}

export default function Home() {
  const [form, setForm] = useState<FormData>(formDefaults);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      kind: "text",
      content:
        "Welcome to Travel Plan Agent. Fill in your trip details, then I will validate and chat with you until the trip is feasible.",
    },
  ]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);
  const chatSectionRef = useRef<HTMLElement | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const feedbackSuggestions = [
    "Make it cheaper",
    "More local food",
    "More cultural places",
    "Add adventure activities",
    "More shopping spots",
  ];

  const locations = masterJson.locations;
  const tags = masterJson.attraction_tags;
  const activities = masterJson.activities;
  const routeTypes = masterJson.transportation_types.main_route;
  const localTypes = masterJson.transportation_types.local_transport;
  const inferredTagsPreview = useMemo(
    () => inferTagsFromNote(form.userNote, form.preferredActivities, tags),
    [form.userNote, form.preferredActivities, tags]
  );

  const budgetStatus = useMemo(() => {
    if (!plan) return "Awaiting feasible input";
    return plan.cost.remaining >= 0
      ? `On budget, THB ${plan.cost.remaining.toLocaleString()} left`
      : `Over budget by THB ${Math.abs(plan.cost.remaining).toLocaleString()}`;
  }, [plan]);

  useEffect(() => {
    if (!chatLogRef.current) return;
    chatLogRef.current.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, isAdjustingPlan]);

  const budgetPercent = (p: Plan) => Math.min(100, Math.round((p.cost.total / form.budget) * 100));

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setPlan(null);
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const autoTags = inferTagsFromNote(form.userNote, form.preferredActivities, tags);
    const nextForm: FormData = { ...form, includeTags: autoTags };
    setForm(nextForm);

    const userMessage = `My plan request: ${nextForm.location}, ${nextForm.days} days, THB ${nextForm.budget.toLocaleString()}, ${nextForm.travelers} traveler(s), note: ${nextForm.userNote || "none"}, auto-tags: ${nextForm.includeTags.join(", ")}, activities: ${nextForm.preferredActivities.join(", ")}.`;
    setMessages((prev) => [...prev, { role: "user", kind: "text", content: userMessage }]);

    const validation = validateForm(nextForm);
    setMessages((prev) => [
      ...prev,
      ...validation.messages.map((content) => ({ role: "agent" as const, kind: "text" as const, content })),
    ]);

    if (!validation.feasible) {
      setLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
    const generatedPlan = buildPlan(nextForm);
    setPlan(generatedPlan);
    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        kind: "text",
        content: `Plan Agent: Completed. Your itinerary is ready in chat. Send feedback and I will adjust it.`,
      },
      { role: "agent", kind: "plan", title: "Final Travel Plan", plan: generatedPlan },
    ]);
    setLoading(false);
    requestAnimationFrame(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const submitPlanFeedback = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !plan) return;

    setIsAdjustingPlan(true);
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMessages((prev) => [...prev, { role: "user", kind: "text", content: trimmed }]);
    setMessages((prev) => [
      ...prev,
      { role: "agent", kind: "text", content: "Plan Agent: Feedback received. Adjusting your plan now." },
    ]);
    setFeedback("");

    await new Promise((resolve) => setTimeout(resolve, 700));

    const { nextForm, notes } = applyFeedbackToForm(form, trimmed);
    setForm(nextForm);
    const updatedPlan = buildPlan(nextForm);
    setPlan(updatedPlan);
    setMessages((prev) => [
      ...prev,
      { role: "agent", kind: "text", content: `Plan Agent: Updated (${notes.join(", ")}).` },
      { role: "agent", kind: "plan", title: "Updated Travel Plan", plan: updatedPlan },
    ]);
    setIsAdjustingPlan(false);
    requestAnimationFrame(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onSubmitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPlanFeedback(feedback);
  };

  const renderPlanBubble = (p: Plan, title = "Travel Plan") => {
    const percent = budgetPercent(p);
    const parseSession = (value: string) => {
      const [headline, ...rest] = value.split(" - ");
      return { headline, detail: rest.join(" - ") };
    };

    return (
      <div className="w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
        <h3 className={`${headingFont.className} text-xl font-semibold`}>{title}</h3>
        <p className="text-sm text-slate-600">{p.summary}</p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
            <span className="font-semibold">Budget usage</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${p.cost.remaining >= 0 ? "bg-teal-500" : "bg-rose-500"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-teal-200 bg-linear-to-br from-teal-50 to-cyan-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Stay</p>
            <p className="mt-1 font-semibold">{p.hotel.name}</p>
            <p>{p.hotel.room}</p>
            <p className="mt-1">THB {p.hotel.nightlyRate.toLocaleString()} / night</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Main Route</p>
            <p className="mt-1 font-semibold">{p.mainRoute.type}</p>
            <p>{p.mainRoute.note}</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-indigo-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Local Move</p>
            <p className="mt-1 font-semibold">{p.localTransport.name}</p>
            <p>{p.localTransport.note}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Cost Snapshot</p>
            <p>Accommodation: THB {p.cost.accommodation.toLocaleString()}</p>
            <p>Activities: THB {p.cost.activities.toLocaleString()}</p>
            <p>Transport: THB {p.cost.transport.toLocaleString()}</p>
            <p className="mt-1 font-semibold">Total: THB {p.cost.total.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Day-by-day itinerary</p>
          <div className="space-y-3">
            {p.itinerary.map((day) => (
              <div key={day.day} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Day {day.day}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                    {day.theme}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "Morning", value: day.morning },
                    { label: "Afternoon", value: day.afternoon },
                    { label: "Evening", value: day.evening },
                  ].map((slot) => {
                    const session = parseSession(slot.value);
                    return (
                      <article key={slot.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{slot.label}</p>
                        <p className="text-sm font-semibold text-slate-800">{session.headline}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{session.detail || "Enjoy this part of your day."}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`${bodyFont.className} min-h-screen bg-[radial-gradient(circle_at_10%_10%,#ffe8b6_0%,#fff8e8_30%,#f6f9ff_65%,#e5f5f2_100%)] text-slate-900`}
    >
      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:px-8 lg:gap-8">
        <section className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_20px_80px_rgba(12,31,74,0.12)] backdrop-blur md:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Travel Plan Agent</p>
          <h1 className={`${headingFont.className} mb-3 text-3xl font-semibold leading-tight md:text-4xl`}>
            Build your trip in one chat-driven flow.
          </h1>
          <p className="mb-6 text-sm text-slate-600">
            Enter your budget, destination, days, and preferences. Validator Agent will reply in chat. Once feasible,
            Plan Agent creates a complete itinerary.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Location</span>
                <select
                  value={form.location}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                >
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Trip note for the agent</span>
                <textarea
                  value={form.userNote}
                  onChange={(event) => setForm((prev) => ({ ...prev, userNote: event.target.value }))}
                  rows={3}
                  placeholder="Tell us what kind of trip you want. Example: local food, temples, and photo spots with family."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                />
                <p className="text-xs text-slate-500">
                  Auto-detected tags: {inferredTagsPreview.length > 0 ? inferredTagsPreview.join(", ") : "none yet"}
                </p>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Budget (THB)</span>
                <input
                  type="number"
                  min={1000}
                  value={form.budget}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, budget: Number(event.target.value) || prev.budget }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Days</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={form.days}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, days: Number(event.target.value) || prev.days }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Travelers</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={form.travelers}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, travelers: Number(event.target.value) || prev.travelers }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Main route transport</span>
                <select
                  value={form.mainRoute}
                  onChange={(event) => setForm((prev) => ({ ...prev, mainRoute: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                >
                  {routeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Local transport</span>
                <select
                  value={form.localTransport}
                  onChange={(event) => setForm((prev) => ({ ...prev, localTransport: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
                >
                  {localTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Preferred activities</p>
              <div className="flex flex-wrap gap-2">
                {activities.map((activity) => (
                  <button
                    key={activity}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        preferredActivities: toggleItem(prev.preferredActivities, activity),
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      form.preferredActivities.includes(activity)
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-amber-400"
                    }`}
                  >
                    {activity}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Agent is processing..." : "Validate and Generate Plan"}
            </button>
          </form>
        </section>

        <section ref={chatSectionRef} className="flex w-full flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(29,53,87,0.12)] md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={`${headingFont.className} text-2xl font-semibold`}>Agent Chat</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{budgetStatus}</span>
            </div>
            <div ref={chatLogRef} className="h-136 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4 md:h-168">
              {messages.map((message, index) =>
                message.kind === "plan" && message.plan ? (
                  <div key={`${message.role}-${index}`} className="max-w-[98%] rounded-2xl border border-slate-200 bg-white p-2">
                    {renderPlanBubble(message.plan, message.title)}
                  </div>
                ) : (
                  <div
                    key={`${message.role}-${index}`}
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "ml-auto bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {message.content}
                  </div>
                )
              )}
            </div>
            {plan ? (
              <form onSubmit={onSubmitFeedback} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
                <input
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Send feedback, e.g. 'more adventure and less shopping' or 'make it cheaper'"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={isAdjustingPlan || feedback.trim().length === 0}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdjustingPlan ? "Adjusting..." : "Send Feedback"}
                </button>
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Quick feedback</p>
                  <div className="flex flex-wrap gap-2">
                    {feedbackSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={isAdjustingPlan}
                        onClick={() => void submitPlanFeedback(suggestion)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-teal-500 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
