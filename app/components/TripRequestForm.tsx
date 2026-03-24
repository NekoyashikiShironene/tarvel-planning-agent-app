import type { FormData } from "./travel-types";

type TripRequestFormProps = {
  headingFontClassName: string;
  form: FormData;
  locations: string[];
  inferredTagsPreview: string[];
  routeTypes: string[];
  localTypes: string[];
  activities: string[];
  loading: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onLocationChange: (value: string) => void;
  onUserNoteChange: (value: string) => void;
  onBudgetChange: (value: number) => void;
  onDaysChange: (value: number) => void;
  onTravelersChange: (value: number) => void;
  onMainRouteChange: (value: string) => void;
  onLocalTransportChange: (value: string) => void;
  onToggleActivity: (activity: string) => void;
};

export default function TripRequestForm({
  headingFontClassName,
  form,
  locations,
  inferredTagsPreview,
  routeTypes,
  localTypes,
  activities,
  loading,
  onSubmit,
  onLocationChange,
  onUserNoteChange,
  onBudgetChange,
  onDaysChange,
  onTravelersChange,
  onMainRouteChange,
  onLocalTransportChange,
  onToggleActivity,
}: TripRequestFormProps) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-[0_20px_80px_rgba(12,31,74,0.12)] backdrop-blur md:p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Travel Plan Agent</p>
      <h1 className={`${headingFontClassName} mb-3 text-3xl font-semibold leading-tight md:text-4xl`}>
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
              onChange={(event) => onLocationChange(event.target.value)}
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
              onChange={(event) => onUserNoteChange(event.target.value)}
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
              onChange={(event) => onBudgetChange(Number(event.target.value) || form.budget)}
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
              onChange={(event) => onDaysChange(Number(event.target.value) || form.days)}
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
              onChange={(event) => onTravelersChange(Number(event.target.value) || form.travelers)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Main route transport</span>
            <select
              value={form.mainRoute}
              onChange={(event) => onMainRouteChange(event.target.value)}
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
              onChange={(event) => onLocalTransportChange(event.target.value)}
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
                onClick={() => onToggleActivity(activity)}
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
  );
}
