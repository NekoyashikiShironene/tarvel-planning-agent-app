"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import masterJson from "@/data/master.json";
import AgentChatPanel from "./components/AgentChatPanel";
import TripRequestForm from "./components/TripRequestForm";
import type { ChatMessage, FormData, Plan } from "./components/travel-types";
import {
  applyFeedbackToForm,
  buildPlan,
  formDefaults,
  inferTagsFromNote,
  toggleItem,
  validateForm,
} from "./lib/travel-planner";

const headingFontClassName = "font-sans";
const bodyFontClassName = "font-sans";

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
    const remaining = plan.scheduler_output.financial_summary.remaining_budget;
    return remaining >= 0
      ? `On budget, THB ${remaining.toLocaleString()} left`
      : `Over budget by THB ${Math.abs(remaining).toLocaleString()}`;
  }, [plan]);

  useEffect(() => {
    if (!chatLogRef.current) return;
    chatLogRef.current.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, isAdjustingPlan]);

  const budgetPercent = (p: Plan) => {
    const requested = p.scheduler_output.financial_summary.requested_budget || form.budget || 1;
    const total = p.scheduler_output.financial_summary.total_actual_cost;
    return Math.min(100, Math.round((total / requested) * 100));
  };

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

  return (
    <div
      className={`${bodyFontClassName} min-h-screen bg-[radial-gradient(circle_at_10%_10%,#ffe8b6_0%,#fff8e8_30%,#f6f9ff_65%,#e5f5f2_100%)] text-slate-900`}
    >
      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:px-8 lg:gap-8">
        <TripRequestForm
          headingFontClassName={headingFontClassName}
          form={form}
          locations={locations}
          inferredTagsPreview={inferredTagsPreview}
          routeTypes={routeTypes}
          localTypes={localTypes}
          activities={activities}
          loading={loading}
          onSubmit={onSubmit}
          onLocationChange={(value) => setForm((prev) => ({ ...prev, location: value }))}
          onUserNoteChange={(value) => setForm((prev) => ({ ...prev, userNote: value }))}
          onBudgetChange={(value) => setForm((prev) => ({ ...prev, budget: value }))}
          onDaysChange={(value) => setForm((prev) => ({ ...prev, days: value }))}
          onTravelersChange={(value) => setForm((prev) => ({ ...prev, travelers: value }))}
          onMainRouteChange={(value) => setForm((prev) => ({ ...prev, mainRoute: value }))}
          onLocalTransportChange={(value) => setForm((prev) => ({ ...prev, localTransport: value }))}
          onToggleActivity={(activity) =>
            setForm((prev) => ({
              ...prev,
              preferredActivities: toggleItem(prev.preferredActivities, activity),
            }))
          }
        />

        <AgentChatPanel
          headingFontClassName={headingFontClassName}
          budgetStatus={budgetStatus}
          messages={messages}
          plan={plan}
          feedback={feedback}
          isAdjustingPlan={isAdjustingPlan}
          feedbackSuggestions={feedbackSuggestions}
          chatSectionRef={chatSectionRef}
          chatLogRef={chatLogRef}
          onFeedbackChange={setFeedback}
          onSubmitFeedback={onSubmitFeedback}
          onQuickFeedback={(value) => void submitPlanFeedback(value)}
          getBudgetPercent={budgetPercent}
        />
      </main>
    </div>
  );
}
