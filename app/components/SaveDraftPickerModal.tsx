"use client";

import { useState } from "react";
import TravelPlanBubble from "./TravelPlanBubble";
import type { TravelPlannerStateType } from "../lib/state";

export type DraftItem = {
  key: string;
  title: string;
  plan: TravelPlannerStateType;
};

type SaveDraftPickerModalProps = {
  isOpen: boolean;
  drafts: DraftItem[];
  headingFontClassName: string;
  getBudgetPercent: (plan: TravelPlannerStateType) => number;
  onSave: (selected: DraftItem[]) => void;
  onClose: () => void;
};

export default function SaveDraftPickerModal({
  isOpen,
  drafts,
  headingFontClassName,
  getBudgetPercent,
  onSave,
  onClose,
}: SaveDraftPickerModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const previewDraft = drafts.find((d) => d.key === previewKey) ?? null;

  const handleSave = () => {
    const selected = drafts.filter((d) => selectedKeys.has(d.key));
    onSave(selected);
    setSelectedKeys(new Set());
    setPreviewKey(null);
  };

  const handleClose = () => {
    setSelectedKeys(new Set());
    setPreviewKey(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className={`${headingFontClassName} text-xl font-semibold text-slate-900`}>
              Save Draft Plans
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Select one or more drafts to save
            </p>
          </div>
          <button
            onClick={handleClose}
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
          {/* Draft list */}
          <div className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
            <div className="flex-1 overflow-y-auto p-3">
              {drafts.length === 0 ? (
                <p className="mt-6 text-center text-sm text-slate-400">No plans in this session yet.</p>
              ) : (
                <ul className="space-y-2">
                  {drafts.map((draft) => {
                    const isChecked = selectedKeys.has(draft.key);
                    const isPreviewing = previewKey === draft.key;
                    return (
                      <li key={draft.key}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                            isPreviewing
                              ? "border-teal-400 bg-teal-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                          onClick={() => setPreviewKey(draft.key)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleKey(draft.key)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-teal-600"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {draft.title}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Select all / clear */}
            {drafts.length > 0 && (
              <div className="border-t border-slate-200 px-3 py-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set(drafts.map((d) => d.key)))}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set())}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Preview pane */}
          <div className="flex-1 overflow-y-auto p-5">
            {previewDraft ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                <TravelPlanBubble
                  plan={previewDraft.plan}
                  title={previewDraft.title}
                  budgetPercent={getBudgetPercent(previewDraft.plan)}
                  headingFontClassName={headingFontClassName}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <svg className="h-12 w-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <p className="text-sm">Click a draft to preview it</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <span className="text-sm text-slate-500">
            {selectedKeys.size > 0
              ? `${selectedKeys.size} draft${selectedKeys.size > 1 ? "s" : ""} selected`
              : "No drafts selected"}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedKeys.size === 0}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Save{selectedKeys.size > 1 ? ` (${selectedKeys.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
