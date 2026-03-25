import type React from "react";
import TravelPlanBubble from "./TravelPlanBubble";
import type { ChatMessage, Plan } from "./travel-types";

type AgentChatPanelProps = {
  headingFontClassName: string;
  budgetStatus: string;
  messages: ChatMessage[];
  plan: Plan | null;
  feedback: string;
  loading: boolean;
  isAdjustingPlan: boolean;
  feedbackSuggestions: string[];
  chatSectionRef: React.RefObject<HTMLElement | null>;
  chatLogRef: React.RefObject<HTMLDivElement | null>;
  onFeedbackChange: (value: string) => void;
  onSubmitFeedback: (event: React.FormEvent<HTMLFormElement>) => void;
  onQuickFeedback: (value: string) => void;
  getBudgetPercent: (plan: Plan) => number;
};

export default function AgentChatPanel({
  headingFontClassName,
  budgetStatus,
  messages,
  plan,
  feedback,
  loading,
  isAdjustingPlan,
  feedbackSuggestions,
  chatSectionRef,
  chatLogRef,
  onFeedbackChange,
  onSubmitFeedback,
  onQuickFeedback,
  getBudgetPercent,
}: AgentChatPanelProps) {
  const isStreaming = loading || isAdjustingPlan;
  const lastAgentTextIndex = messages.reduce((last, msg, i) =>
    msg.role === "agent" && msg.kind === "text" ? i : last, -1
  );
  return (
    <section ref={chatSectionRef} className="flex w-full flex-col gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(29,53,87,0.12)] md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={`${headingFontClassName} text-2xl font-semibold`}>Agent Chat</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{budgetStatus}</span>
        </div>
        <div ref={chatLogRef} className="h-136 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4 md:h-168">
          {messages.map((message, index) =>
            message.kind === "plan" && message.plan ? (
              <div key={`${message.role}-${index}`} className="max-w-[98%] rounded-2xl border border-slate-200 bg-white p-2">
                <TravelPlanBubble
                  plan={message.plan}
                  title={message.title}
                  budgetPercent={getBudgetPercent(message.plan)}
                  headingFontClassName={headingFontClassName}
                />
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
                {isStreaming && message.role === "agent" && index === lastAgentTextIndex ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin text-teal-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {message.content}
                  </span>
                ) : message.role === "agent" && message.kind === "text" && index > 0 ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 shrink-0 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {message.content}
                  </span>
                ) : (
                  message.content
                )}
              </div>
            )
          )}
        </div>
        {plan ? (
          <form
            onSubmit={onSubmitFeedback}
            className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]"
          >
            <input
              value={feedback}
              onChange={(event) => onFeedbackChange(event.target.value)}
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
                    onClick={() => onQuickFeedback(suggestion)}
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
  );
}
