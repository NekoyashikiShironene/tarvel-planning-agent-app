import { Annotation } from "@langchain/langgraph";
import * as z from "zod";

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
	preferredActivities: z.array(z.string())
});

const ValidatorIntentSchema = z.object({
	destination: z.string(),
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

export const ValidatorOutputSchema = z.object({
	intent: ValidatorIntentSchema,
	is_feasible: z.boolean(),
	reason: z.string(),
});

const SchedulerActivitySchema = z.object({
	time_slot: z.string(),
	activity_type: z.enum(["restaurant", "attraction", "local_transport"]),
	meal_time: z.enum(["breakfast", "lunch", "dinner"]),
	place_id: z.number(),
	name: z.string().nullable(),
	name_th: z.string().nullable(),
	name_eng: z.string().nullable(),
	cost: z.number(),
	remark: z.string(),
});

const SchedulerDailyPlanSchema = z.object({
	day: z.number(),
	zone: z.string(),
	activities: z.array(SchedulerActivitySchema),
	daily_estimated_cost: z.number(),
});

export const FinancialSummarySchema = z.object({
	requested_budget: z.number(),
	accommodation_cost: z.number(),
	main_transport_cost: z.number(),
	local_transport_cost: z.number(),
	food_cost: z.number(),
	activity_cost: z.number(),
	total_actual_cost: z.number(),
	remaining_budget: z.number(),
});

export const SchedulerOutputSchema = z.object({
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

export const FullPlanSchema = z.object({
	accommodation: SchedulerOutputSchema.shape.accommodation,
	main_transportation: SchedulerOutputSchema.shape.main_transportation,
	daily_plans: SchedulerOutputSchema.shape.daily_plans,
	financial_summary: FinancialSummarySchema,
});

export const PresenterOutputSchema = z.object({
	topic: z.string(),
	daily_plan_summaries: z.array(
		z.object({
			day: z.number(),
			message: z.string(),
		}),
	),
	transportation_summary: z.string(),
	budget_summary: z.string(),
	adjustment_suggestions: z.array(z.string()),
	reject_message: z.string()
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
	user_input: Annotation<z.infer<typeof UserInputSchema> | null | undefined>({
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
			user_action: "submit_form",
			user_feedback_message: "",
		}),
	}),
	validator_output: Annotation<z.infer<typeof ValidatorOutputSchema> | null | undefined>({
		reducer: overwrite,
		default: () => ValidatorOutputSchema.parse({ intent: { destination: "", budget: 0, days: 0, pax_adult: 0, pax_child: 0, main_transport_preference: null, local_transport_preference: null, attraction_tags: [], room_tags: [], restaurant_tags: [], special_instructions: "" }, is_feasible: false, reason: "" }),
	}),
	scheduler_output: Annotation<z.infer<typeof FullPlanSchema> | null | undefined>({
		reducer: overwrite,
		default: () =>
			FullPlanSchema.parse({
				accommodation: [],
				main_transportation: {
					outbound: {
						transport_id: 0,
						type: "",
						name: "",
						cost: 0,
						schedule: "",
					},
					inbound: {
						transport_id: 0,
						type: "",
						name: "",
						cost: 0,
						schedule: "",
					},
				},
				daily_plans: [],
				financial_summary: {
					requested_budget: 0,
					accommodation_cost: 0,
					main_transport_cost: 0,
					local_transport_cost: 0,
					food_cost: 0,
					activity_cost: 0,
					total_actual_cost: 0,
					remaining_budget: 0,
				},
			}),
	}),
	presenter_output: Annotation<z.infer<typeof PresenterOutputSchema> | null | undefined>({
		reducer: overwrite,
		default: () => PresenterOutputSchema.parse({ topic: "", daily_plan_summaries: [], transportation_summary: "", budget_summary: "", adjustment_suggestions: [], reject_message: "" }),
	}),
	user_feedback_message: Annotation<string | null | undefined>({
		reducer: overwrite,
		default: () => "",
	}),
	error: Annotation<string | null | undefined>({
		reducer: overwrite,
		default: () => null,
	}),
});

export type TravelPlannerStateType = typeof TravelPlannerState.State;