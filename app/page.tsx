"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import masterJson from "@/data/master.json";
import AgentChatPanel from "./components/AgentChatPanel";
import TripRequestForm from "./components/TripRequestForm";
import type { ChatMessage, FormData } from "./components/travel-types";
import {
  applyFeedbackToForm,
  formDefaults,
  inferTagsFromNote,
  toggleItem,
} from "./lib/travel-planner";
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { TravelPlannerStateType } from "./lib/state";
import { getSessionId } from "./lib/session";

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
  const [plan, setPlan] = useState<TravelPlannerStateType | null>(null);
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
    const remaining = plan.scheduler_output?.financial_summary?.remaining_budget || 0;
    return remaining >= 0
      ? `On budget, THB ${remaining.toLocaleString()} left`
      : `Over budget by THB ${Math.abs(remaining).toLocaleString()}`;
  }, [plan]);

  useEffect(() => {
    if (!chatLogRef.current) return;
    const lastMessage = messages[messages.length - 1];
    const shouldScroll = lastMessage && lastMessage.kind === "text";
    
    if (shouldScroll) {
      chatLogRef.current.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" });
    } else {
      chatLogRef.current.scrollBy({ top: 200, behavior: "smooth" });
    }
  }, [messages, loading, isAdjustingPlan]);

  const budgetPercent = (p: TravelPlannerStateType) => {
    const requested = p.scheduler_output?.financial_summary.requested_budget || form.budget || 1;
    const total = p.scheduler_output?.financial_summary.total_actual_cost || 0;
    return Math.min(100, Math.round((total / requested) * 100));
  };

  // Reusable function to update plan and messages
  const updatePlanDisplay = async (planObject: TravelPlannerStateType, planTitle: string, setStatus: (v: boolean) => void, initialMessage?: string) => {

    const planMessages: ChatMessage[] = [];
    if (initialMessage) {
      planMessages.push({ role: "agent", kind: "text", content: initialMessage });
    }
    planMessages.push({ role: "agent", kind: "plan", title: planTitle, plan: planObject });

    // flushSync ensures all state updates happen in a single render,
    // so spinner and checkmark switch in the same frame
    flushSync(() => {
      setPlan(planObject);
      setMessages((prev) => [...prev, ...planMessages]);
      setIsAdjustingPlan(false);
      setStatus(false);
    });
  };

  // Reusable function to handle plan streaming (for both initial and feedback)
  interface FetchPlanStreamOptions {
    requestBody: Record<string, any>;
    mode: "submit" | "feedback";
    planTitle: string;
    loadingMessage: string;
    completionMessage: string | ((notes?: string[]) => string);
    setStatus: (loading: boolean) => void;
    notes?: string[];
  }

  const fetchPlanStream = async ({
    requestBody,
    mode,
    planTitle,
    loadingMessage,
    completionMessage,
    setStatus,
    notes,
  }: FetchPlanStreamOptions) => {
    setStatus(true);
    setMessages((prev) => [...prev, { role: "agent", kind: "text", content: loadingMessage }]);

    const sessionId = getSessionId();
    fetchEventSource(`/api/generate-plan/${sessionId}?mode=${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),

      async onopen(res) {
        console.log("connected", res.status);
      },

      async onmessage(ev) {
        const data = JSON.parse(ev.data);

        if (data.type === "status") {
          setMessages((prev) => [...prev, { role: "agent", kind: "text", content: `${data.message}` }]);
        }

        if (data.type === "done") {
          const finalMessage = typeof completionMessage === "function"
            ? completionMessage(notes)
            : completionMessage;

          const finalState = data.data as TravelPlannerStateType;
          if (finalState.validator_output?.is_feasible) {
            await updatePlanDisplay(finalState, planTitle, setStatus, finalMessage);
          }
          else {
            setMessages((prev) => [...prev, { role: "agent", kind: "text", content: finalState.validator_output?.reject_message, error: true }]);
            setStatus(false);
          }
        }
        console.log("stream:", data);
      },

      onclose() {
        console.log("done");
      },

      onerror(err) {
        console.error(err);
        throw err;
      },
    });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPlan(null);

    const autoTags = inferTagsFromNote(form.userNote, form.preferredActivities, tags);
    const nextForm: FormData = { ...form, includeTags: autoTags };
    setForm(nextForm);

    // Scroll to chat section when form is submitted
    requestAnimationFrame(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    await fetchPlanStream({
      requestBody: {
        location: form.location,
        budget: form.budget,
        days: form.days,
        travelers: form.travelers,
        userNote: form.userNote,
        mainRoute: form.mainRoute,
        localTransport: form.localTransport,
        includeTags: form.includeTags,
        preferredActivities: form.preferredActivities,
      },
      mode: "submit",
      planTitle: "Initial Travel Plan",
      loadingMessage: "Plan Agent: Generating your initial plan...",
      completionMessage: "Plan Agent: Your initial itinerary is ready. Send feedback and I will adjust it.",
      setStatus: setLoading,
    });
  };

  const submitPlanFeedback = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !plan) return;

    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMessages((prev) => [...prev, { role: "user", kind: "text", content: trimmed }]);
    setMessages((prev) => [
      ...prev,
      { role: "agent", kind: "text", content: "Plan Agent: Feedback received. Adjusting your plan..." },
    ]);
    setFeedback("");

    const { nextForm, notes } = applyFeedbackToForm(form, trimmed);
    setForm(nextForm);

    await fetchPlanStream({
      requestBody: {
        feedback_message: trimmed,
      },
      mode: "feedback",
      planTitle: "Updated Travel Plan",
      loadingMessage: "Plan Agent: Processing your feedback...",
      completionMessage: (notes) => `Plan Agent: Updated (${notes?.join(", ") || "applied changes"}).`,
      setStatus: setIsAdjustingPlan,
      notes,
    });

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
          loading={loading}
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
