"use client";

import { useState } from "react";
import TravelPlanBubble from "./TravelPlanBubble";
import type { SavedPlan } from "./travel-types";
import type { TravelPlannerStateType } from "../lib/state";

type SavedPlansModalProps = {
  isOpen: boolean;
  savedPlans: SavedPlan[];
  headingFontClassName: string;
  getBudgetPercent: (plan: TravelPlannerStateType) => number;
  onDelete: (planId: number) => void;
  onClose: () => void;
};

export default function SavedPlansModal({
  isOpen,
  savedPlans,
  headingFontClassName,
  getBudgetPercent,
  onDelete,
  onClose,
}: SavedPlansModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const selectedPlan = savedPlans.find((p) => p.plan_id === selectedId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className={`${headingFontClassName} text-xl font-semibold text-slate-900`}>
            Saved Plans
            {savedPlans.length > 0 && (
              <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                {savedPlans.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Plan list */}
          <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
            {savedPlans.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-400">No saved plans yet.</p>
            ) : (
              <ul className="space-y-2">
                {savedPlans.map((p) => (
                  <li key={p.plan_id}>
                    <div className="flex items-stretch gap-1">
                      <button
                        onClick={() => setSelectedId(p.plan_id)}
                        className={`min-w-0 flex-1 rounded-xl px-4 py-3 text-left transition ${
                          selectedId === p.plan_id
                            ? "bg-teal-600 text-white shadow-sm"
                            : "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <p className="truncate text-sm font-semibold">
                          {p.plan_data?.presenter_output?.topic ?? `Plan #${p.plan_id}`}
                        </p>
                        <p className={`mt-0.5 text-xs ${selectedId === p.plan_id ? "text-teal-100" : "text-slate-400"}`}>
                          {new Date(p.created_at).toLocaleString("th-TH", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </button>
                      <button
                        onClick={() => {
                          onDelete(p.plan_id);
                          if (selectedId === p.plan_id) setSelectedId(null);
                        }}
                        className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        aria-label="Delete plan"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Plan detail */}
          <div className="flex-1 overflow-y-auto p-8">
            {selectedPlan ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                <TravelPlanBubble
                  plan={selectedPlan.plan_data}
                  title={selectedPlan.plan_data?.presenter_output?.topic}
                  budgetPercent={getBudgetPercent(selectedPlan.plan_data)}
                  headingFontClassName={headingFontClassName}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <svg className="h-12 w-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-sm">Select a saved plan to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
