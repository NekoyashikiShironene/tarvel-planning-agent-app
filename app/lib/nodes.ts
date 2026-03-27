import { GraphNode, interrupt } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import type { TravelPlannerStateType } from "./state";
import { ValidatorOutputSchema, SchedulerOutputSchema, PresenterOutputSchema } from "./state";
import {
    searchAccommodations,
    searchRestaurants,
    searchLocalTransportation,
    searchMainTransportation,
    searchAttractions,
    calculateCosts
} from "./tool";

import fs from 'fs/promises';
import path from "path";
import master from "../../data/master.json";

const validatorModel = new ChatOpenAI({ model: "gpt-5.4-nano-2026-03-17" });
const schedulerModel = new ChatOpenAI({ model: "gpt-5.4-nano-2026-03-17" });
const presenterModel = new ChatOpenAI({ model: "gpt-4.1-mini", temperature: 0.7 });

export const validatorNode: GraphNode<TravelPlannerStateType> = async (state, config) => {
    try {
        const modelWithStructure = validatorModel.withStructuredOutput(ValidatorOutputSchema);
        const userInput = state.user_input;
        console.log("Validator received user input:", userInput);

        const filePath = path.resolve(process.cwd(), 'prompts', 'validator_prompt.txt');
        const validatorPrompt = await fs.readFile(filePath, 'utf-8');

        const context = [
            { role: "system", content: validatorPrompt },
            { role: "system", content: `IMPORTANT\nPlease select intent values from the master data: ${JSON.stringify(master)}` },
            { role: "user", content: JSON.stringify(userInput) },
        ];

        if (state.user_feedback_message) {
            context.push({ role: "user", content: `User Feedback: ${state.user_feedback_message}` });
        }

        const response = await modelWithStructure.invoke(context);

        return {
            validator_output: response
        };
    } catch (error) {
        console.error("Error in validatorNode:", error);
        return { error: `Tool error: ${error}` };
    }
}

export const routeValidationNode = (state: TravelPlannerStateType) => {
    // console.log(state.validator_output);
    if (state.validator_output?.is_feasible) {
        return "Pass";
    } else {
        return "Fail";
    }
}

export const schedulerNode: GraphNode<TravelPlannerStateType> = async (state, config) => {
    try {
        const modelWithStructure = schedulerModel.withStructuredOutput(SchedulerOutputSchema);
        const validatorOutput = state.validator_output as NonNullable<typeof state.validator_output>;
        const user_intent = validatorOutput.intent;

        const filePath = path.resolve(process.cwd(), 'prompts', 'scheduler_prompt.txt');
        const schedulerPrompt = await fs.readFile(filePath, 'utf-8');

        const localTransportOptions = searchLocalTransportation({ type: user_intent.local_transport_preference });
        const mainTransportOptions = searchMainTransportation({ type: user_intent.main_transport_preference });
        const accommodationOptions = searchAccommodations({ amenities: user_intent.room_tags });
        const restaurantOptions = searchRestaurants({ province: user_intent.destination, tags: user_intent.restaurant_tags });
        const attractionOptions = searchAttractions({ province: user_intent.destination, tags: user_intent.attraction_tags });

        const planData = {
            localTransportOptions,
            mainTransportOptions,
            accommodationOptions,
            restaurantOptions,
            attractionOptions
        };

        // console.log("User Intent:", user_intent);
        // console.log("Local Transport Options:", localTransportOptions.length);
        // console.log("Main Transport Options:", mainTransportOptions.length);
        // console.log("Accommodation Options:", accommodationOptions.length);
        // console.log("Restaurant Options:", restaurantOptions.length);
        // console.log("Attraction Options:", attractionOptions.length);

        const context = [
            { role: "system", content: schedulerPrompt },
            { role: "system", content: `Search Result: ${JSON.stringify(planData)}` },
            { role: "user", content: JSON.stringify(user_intent) }
        ];

        if (state.user_feedback_message) {
            context.push({ role: "user", content: `Given Plan: ${JSON.stringify(state.scheduler_output)}` });
            context.push({ role: "user", content: `User Feedback: ${state.user_feedback_message}` });
        }

        const response = await modelWithStructure.invoke(context);
        const financialSummary = calculateCosts(validatorOutput.intent.budget, response);

        console.log("Scheduler response:", JSON.stringify(response, null, 2));
        console.log("Financial Summary:", JSON.stringify(financialSummary, null, 2));

        return {
            scheduler_output: {
                accommodation: response.accommodation,
                main_transportation: response.main_transportation,
                daily_plans: response.daily_plans,
                financial_summary: financialSummary
            }
        };
    } catch (error) {
        console.error("Error in schedulerNode:", error);
        return { error: `Tool error: ${error}` };
    }
}


export const presenterNode: GraphNode<TravelPlannerStateType> = async (state, config) => {
    try {
        const modelWithStructure = presenterModel.withStructuredOutput(PresenterOutputSchema);
        const schedulerOutput = state.scheduler_output;
        const validatorOutput = (state.validator_output as NonNullable<typeof state.validator_output>);

        const filePath = path.resolve(process.cwd(), 'prompts', 'presenter_prompt.txt');
        const presenterPrompt = await fs.readFile(filePath, 'utf-8');

        const context = [
            { role: "system", content: presenterPrompt },
            { role: "system", content: `Validator Output and User Intent: ${JSON.stringify(validatorOutput)}` },
        ];

        if (state.validator_output?.is_feasible) {
            context.push({ role: "system", content: `Itinerary Data: ${JSON.stringify(schedulerOutput)}` });
        }

        const response = await modelWithStructure.invoke(context);

        return {
            presenter_output: response
        };

    } catch (error) {
        console.error("Error in presenterNode:", error);
        return { error: `Tool error: ${error}` };
    }
}

export const routePresentationNode = (state: TravelPlannerStateType) => {
    return interrupt({
        ...state,
    });
}