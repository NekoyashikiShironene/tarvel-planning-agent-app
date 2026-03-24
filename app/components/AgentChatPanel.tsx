import type React from "react";
import TravelPlanBubble from "./TravelPlanBubble";
import type { ChatMessage, Plan } from "./travel-types";

type AgentChatPanelProps = {
  headingFontClassName: string;
  budgetStatus: string;
  messages: ChatMessage[];
  plan: Plan | null;
  feedback: string;
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
  isAdjustingPlan,
  feedbackSuggestions,
  chatSectionRef,
  chatLogRef,
  onFeedbackChange,
  onSubmitFeedback,
  onQuickFeedback,
  getBudgetPercent,
}: AgentChatPanelProps) {
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
                {message.content}
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
