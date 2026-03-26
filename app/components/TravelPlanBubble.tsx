import { TravelPlannerStateType } from "../lib/state";
import ReactMarkdown from "react-markdown";

type TravelPlanBubbleProps = {
  plan: TravelPlannerStateType;
  title?: string;
  budgetPercent: number;
  headingFontClassName: string;
};

function formatCurrency(value: number): string {
  return `THB ${value.toLocaleString()}`;
}

function getActivityLabel(name?: string | null, nameTh?: string | null, nameEng?: string | null): string {
  return nameEng ?? nameTh ?? name ?? "Unnamed activity";
}

export default function TravelPlanBubble({
  plan,
  title = "Travel Plan",
  budgetPercent,
  headingFontClassName,
}: TravelPlanBubbleProps) {
  const scheduler = plan.scheduler_output as NonNullable<typeof plan.scheduler_output>;
  const presenter = plan.presenter_output as NonNullable<typeof plan.presenter_output>;
  const financial = scheduler.financial_summary;
  const stay = scheduler.accommodation[0];

  return (
    <div className="w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
      <h3 className={`${headingFontClassName} text-xl font-semibold`}>{title}</h3>
      <p className="text-sm text-slate-600">{presenter.transportation_summary}</p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
          <span className="font-semibold">Budget usage</span>
          <span>{budgetPercent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${financial.remaining_budget >= 0 ? "bg-teal-500" : "bg-rose-500"}`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-teal-200 bg-linear-to-br from-teal-50 to-cyan-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Stay</p>
          <p className="mt-1 font-semibold">{stay?.hotel_name ?? "-"}</p>
          <p>{stay?.room_name ?? "-"}</p>
          <p className="mt-1">{formatCurrency(stay?.price_per_night ?? 0)} / night</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Main Route</p>
          <p className="mt-1 font-semibold">{scheduler.main_transportation.outbound.type}</p>
          <p>{scheduler.main_transportation.outbound.name}</p>
          <p className="mt-1 text-xs text-slate-600">{scheduler.main_transportation.outbound.schedule}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-linear-to-br from-sky-50 to-indigo-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Inbound Route</p>
          <p className="mt-1 font-semibold">{scheduler.main_transportation.inbound.type}</p>
          <p>{scheduler.main_transportation.inbound.name}</p>
          <p className="mt-1 text-xs text-slate-600">{scheduler.main_transportation.inbound.schedule}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Cost Snapshot</p>
          <p>Accommodation: {formatCurrency(financial.accommodation_cost)}</p>
          <p>Food: {formatCurrency(financial.food_cost)}</p>
          <p>Transport: {formatCurrency(financial.main_transport_cost + financial.local_transport_cost)}</p>
          <p className="mt-1 font-semibold">Total: {formatCurrency(financial.total_actual_cost)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Budget Details</p>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>Requested: <span className="font-semibold">{formatCurrency(financial.requested_budget)}</span></p>
          <p>Main transport: <span className="font-semibold">{formatCurrency(financial.main_transport_cost)}</span></p>
          <p>Local transport: <span className="font-semibold">{formatCurrency(financial.local_transport_cost)}</span></p>
          <p>Activities: <span className="font-semibold">{formatCurrency(financial.activity_cost)}</span></p>
          <p>Food: <span className="font-semibold">{formatCurrency(financial.food_cost)}</span></p>
          <p>Accommodation: <span className="font-semibold">{formatCurrency(financial.accommodation_cost)}</span></p>
          <p>Total: <span className="font-semibold">{formatCurrency(financial.total_actual_cost)}</span></p>
          <p>
            Remaining: <span className={`font-semibold ${financial.remaining_budget >= 0 ? "text-teal-700" : "text-rose-700"}`}>
              {formatCurrency(financial.remaining_budget)}
            </span>
          </p>
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{presenter.budget_summary}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Daily summaries</p>
        <div className="space-y-2">
          {presenter.daily_plan_summaries.map((summary) => (
            <article key={summary.day} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="prose prose-sm max-w-none text-slate-700 prose-headings:font-semibold prose-headings:text-slate-800 prose-strong:text-slate-800 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown>{summary.message}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Detailed schedule</p>
        <div className="space-y-3">
          {scheduler.daily_plans.map((day) => (
            <div key={day.day} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Day {day.day}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600">
                  {day.zone}
                </span>
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                  {formatCurrency(day.daily_estimated_cost)}
                </span>
              </div>
              <div className="space-y-2">
                {day.activities.map((activity, index) => (
                  <article key={`${activity.time_slot}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">{activity.time_slot}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-600">{activity.activity_type}</span>
                      {activity.meal_time ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">{activity.meal_time}</span>
                      ) : null}
                      <span className="ml-auto text-sm font-semibold text-slate-800">{formatCurrency(activity.cost)}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {getActivityLabel(activity.name, activity.name_th, activity.name_eng)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{activity.remark}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {presenter.adjustment_suggestions.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Adjustment suggestions</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {presenter.adjustment_suggestions.map((suggestion) => (
              <li key={suggestion}>- {suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
