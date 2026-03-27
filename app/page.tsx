"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import masterJson from "@/data/master.json";
import AgentChatPanel from "./components/AgentChatPanel";
import SavedPlansModal from "./components/SavedPlansModal";
import SaveDraftPickerModal from "./components/SaveDraftPickerModal";
import type { DraftItem } from "./components/SaveDraftPickerModal";
import TripRequestForm from "./components/TripRequestForm";
import type { ChatMessage, FormData, SavedPlan } from "./components/travel-types";
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
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
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

  useEffect(() => {
    async function loadSavedPlans() {
      const response = await fetch('/api/plan?user_id=' + getSessionId());
      if (response.ok) {
        const data: SavedPlan[] = await response.json();
        setSavedPlans(data);
      }
    }
    loadSavedPlans();
  }, []);

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
    loadingMessage: string;
    completionMessage: string | ((notes?: string[]) => string);
    setStatus: (loading: boolean) => void;
    notes?: string[];
  }

  const fetchPlanStream = async ({
    requestBody,
    mode,
    loadingMessage,
    completionMessage,
    setStatus,
    notes,
  }: FetchPlanStreamOptions) => {
    setStatus(true);
    setMessages((prev) => [...prev, { role: "agent", kind: "text", content: loadingMessage }]);

    const sessionId = getSessionId();
    const controller = new AbortController();
    
    fetchEventSource(`/api/generate-plan/${sessionId}?mode=${mode}`, {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      openWhenHidden: true,

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
            await updatePlanDisplay(finalState, finalState.presenter_output?.topic || "Updated Travel Plan", setStatus, finalMessage);
          }
          else {
            setMessages((prev) => [...prev, { role: "agent", kind: "text", content: finalState.presenter_output?.reject_message, error: true }]);
            setStatus(false);
          }
          controller.abort();
        }
        console.log("stream:", data);
      },

      onclose() {
        console.log("done");
        controller.abort();
      },

      onerror(err) {
        console.error(err);
        controller.abort();
        throw err;
      },
    });
  };

  const planDrafts = useMemo<DraftItem[]>(
    () =>
      messages
        .filter((m) => m.kind === "plan" && m.plan)
        .map((m, i) => ({
          key: `draft-${i}`,
          title: m.title ?? `Draft ${i + 1}`,
          plan: m.plan as TravelPlannerStateType,
        })),
    [messages]
  );

  // Stub: ready for save logic to be plugged in later
  const handleSaveSelected = async (selected: DraftItem[]) => {
    const userId = getSessionId();
    const data = {
      user_id: userId,
      plans: selected.map((item) => item.plan),
    }

    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const newPlans: SavedPlan[] = await res.json();
      setSavedPlans((prev) => [...newPlans, ...prev]);
    }

    setShowSavePicker(false);
  };

  const handleDeletePlan = async (planId: number) => {
    const res = await fetch('/api/plan', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, user_id: getSessionId() }),
    });
    if (res.ok) {
      setSavedPlans((prev) => prev.filter((p) => p.plan_id !== planId));
    }
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
      {/* Top-right saved plans button */}
      <button
        onClick={() => setShowSavedPlans(true)}
        title="View saved plans"
        className="fixed right-5 top-5 z-40 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg"
      >
        <svg className="h-4 w-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        Saved Plans
        {savedPlans.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-xs text-white">
            {savedPlans.length}
          </span>
        )}
      </button>

      <SaveDraftPickerModal
        isOpen={showSavePicker}
        drafts={planDrafts}
        headingFontClassName={headingFontClassName}
        getBudgetPercent={budgetPercent}
        onSave={handleSaveSelected}
        onClose={() => setShowSavePicker(false)}
      />

      <SavedPlansModal
        isOpen={showSavedPlans}
        savedPlans={savedPlans}
        headingFontClassName={headingFontClassName}
        getBudgetPercent={budgetPercent}
        onDelete={handleDeletePlan}
        onClose={() => setShowSavedPlans(false)}
      />

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
          onOpenSavePicker={() => setShowSavePicker(true)}
          getBudgetPercent={budgetPercent}
        />
      </main>
    </div>
  );
}
