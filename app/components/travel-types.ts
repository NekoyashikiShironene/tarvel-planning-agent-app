import { TravelPlannerStateType } from "../lib/state";

export type FormData = {
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

export type DailyPlan = {
  day: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
};

export type ValidatorIntent = {
  destination: string | null;
  budget: number;
  days: number;
  pax_adult: number;
  pax_child: number;
  main_transport_preference: string | null;
  local_transport_preference: string | null;
  attraction_tags: string[];
  room_tags: string[];
  restaurant_tags: string[];
};

export type ValidatorOutput = {
  intent: ValidatorIntent;
  special_instructions: string;
  is_feasible: boolean;
  reject_message: string;
};

export type SchedulerActivity = {
  time_slot: string;
  activity_type: "restaurant" | "attraction" | "local_transport";
  meal_time?: "breakfast" | "lunch" | "dinner";
  place_id: number;
  name?: string;
  name_th?: string;
  name_eng?: string;
  cost: number;
  remark: string;
};

export type SchedulerDailyPlan = {
  day: number;
  zone: string;
  activities: SchedulerActivity[];
  daily_estimated_cost: number;
};

export type SchedulerOutput = {
  financial_summary: {
    requested_budget: number;
    accommodation_cost: number;
    main_transport_cost: number;
    local_transport_cost: number;
    food_cost: number;
    activity_cost: number;
    total_actual_cost: number;
    remaining_budget: number;
  };
  accommodation: Array<{
    room_id: number;
    hotel_name: string;
    room_name: string;
    price_per_night: number;
    check_in_day: number;
    check_out_day: number;
    total_nights: number;
    total_cost: number;
  }>;
  main_transportation: {
    outbound: {
      transport_id: number;
      type: string;
      name: string;
      cost: number;
      schedule: string;
    };
    inbound: {
      transport_id: number;
      type: string;
      name: string;
      cost: number;
      schedule: string;
    };
  };
  daily_plans: SchedulerDailyPlan[];
};

export type PresenterOutput = {
  daily_plan_summaries: Array<{
    day: number;
    message: string;
  }>;
  transportation_summary: string;
  budget_summary: string;
  adjustment_suggestions: string[];
};

export type Plan = {
  validator_output: ValidatorOutput;
  scheduler_output: SchedulerOutput;
  presenter_output: PresenterOutput;
};

export type ChatMessage = {
  role: "user" | "agent";
  content?: string;
  kind?: "text" | "plan";
  plan?: TravelPlannerStateType;
  title?: string;
  error?: boolean;
};
