import { Annotation } from "@langchain/langgraph";
import * as z from "zod";
import type { Plan } from "../components/travel-types";

export const PlannerStageSchema = z.enum(["idle", "validated", "scheduled", "presented", "done", "error"]);

const UserInputSchema = z.object({
	location: z.string(),
	budget: z.number(),
	days: z.number(),
	travelers: z.number(),
	userNote: z.string(),
	mainRoute: z.string(),
	localTransport: z.string(),
	includeTags: z.array(z.string()),
	preferredActivities: z.array(z.string()),
});

const ValidatorIntentSchema = z.object({
	destination: z.string().nullable(),
	budget: z.number(),
	days: z.number(),
	pax_adult: z.number(),
	pax_child: z.number(),
	main_transport_preference: z.string().nullable(),
	local_transport_preference: z.string().nullable(),
	attraction_tags: z.array(z.string()),
	room_tags: z.array(z.string()),
	restaurant_tags: z.array(z.string()),
    special_instructions: z.string()
});

const ValidatorOutputSchema = z.object({
	intent: ValidatorIntentSchema,
	is_feasible: z.boolean(),
	reject_message: z.string(),
});

const SchedulerActivitySchema = z.object({
	time_slot: z.string(),
	activity_type: z.enum(["restaurant", "attraction", "local_transport"]),
	meal_time: z.enum(["breakfast", "lunch", "dinner"]).optional(),
	place_id: z.number(),
	name: z.string().optional(),
	name_th: z.string().optional(),
	name_eng: z.string().optional(),
	cost: z.number(),
	remark: z.string(),
});

const SchedulerDailyPlanSchema = z.object({
	day: z.number(),
	zone: z.string(),
	activities: z.array(SchedulerActivitySchema),
	daily_estimated_cost: z.number(),
});

const SchedulerOutputSchema = z.object({
	financial_summary: z.object({
		requested_budget: z.number(),
		accommodation_cost: z.number(),
		main_transport_cost: z.number(),
		local_transport_cost: z.number(),
		food_cost: z.number(),
		activity_cost: z.number(),
		total_actual_cost: z.number(),
		remaining_budget: z.number(),
	}),
	accommodation: z.array(
		z.object({
			room_id: z.number(),
			hotel_name: z.string(),
			room_name: z.string(),
			price_per_night: z.number(),
			check_in_day: z.number(),
			check_out_day: z.number(),
			total_nights: z.number(),
			total_cost: z.number(),
		}),
	),
	main_transportation: z.object({
		outbound: z.object({
			transport_id: z.number(),
			type: z.string(),
			name: z.string(),
			cost: z.number(),
			schedule: z.string(),
		}),
		inbound: z.object({
			transport_id: z.number(),
			type: z.string(),
			name: z.string(),
			cost: z.number(),
			schedule: z.string(),
		}),
	}),
	daily_plans: z.array(SchedulerDailyPlanSchema),
});

const PresenterOutputSchema = z.object({
	daily_plan_summaries: z.array(
		z.object({
			day: z.number(),
			message: z.string(),
		}),
	),
	transportation_summary: z.string(),
	budget_summary: z.string(),
	adjustment_suggestions: z.array(z.string()),
});

export const TravelPlannerStateSchema = z.object({
	user_input: UserInputSchema,
	validator_output: ValidatorOutputSchema.nullable(),
	scheduler_output: SchedulerOutputSchema.nullable(),
	presenter_output: PresenterOutputSchema.nullable(),
	stage: PlannerStageSchema,
	error: z.string().nullable(),
});

const overwrite = <T,>(_current: T, update: T): T => update;

export const TravelPlannerState = Annotation.Root({
	user_input: Annotation<z.infer<typeof UserInputSchema>>({
		reducer: overwrite,
		default: () => ({
			location: "",
			budget: 0,
			days: 0,
			travelers: 1,
			userNote: "",
			mainRoute: "",
			localTransport: "",
			includeTags: [],
			preferredActivities: [],
		}),
	}),
	validator_output: Annotation<z.infer<typeof ValidatorOutputSchema> | null>({
		reducer: overwrite,
		default: () => null,
	}),
	scheduler_output: Annotation<z.infer<typeof SchedulerOutputSchema> | null>({
		reducer: overwrite,
		default: () => null,
	}),
	presenter_output: Annotation<z.infer<typeof PresenterOutputSchema> | null>({
		reducer: overwrite,
		default: () => null,
	}),
	stage: Annotation<z.infer<typeof PlannerStageSchema>>({
		reducer: overwrite,
		default: () => "idle",
	}),
	error: Annotation<string | null>({
		reducer: overwrite,
		default: () => null,
	}),
});

export type TravelPlannerStateType = typeof TravelPlannerState.State;