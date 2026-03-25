import { Command, GraphNode, END } from "@langchain/langgraph";
import type { TravelPlannerStateType } from "./state";

export const validatorNode: GraphNode<TravelPlannerStateType> = async (state, config) => {
    console.log("Validator node received state:", state);
    try {
        const userInput = state.user_input;
        const isFeasible = true;

        return {
            validator_output: {
                intent: {

                },
                is_feasible: isFeasible,
                reject_message: "เที่ยวไม่ได้หรอกไอควาย กลับบ้านไปนอนตากแอร์",
            },
        };
    } catch (error) {
        return { toolResult: `Tool error: ${error}` };
    }
}

export const routeValidationNode = (state: TravelPlannerStateType) => {
    console.log(state.validator_output);
    if (state.validator_output?.is_feasible) {
        return "Pass";
    } else {
        return "Fail";
    }
}

export const schedulerNode: GraphNode<TravelPlannerStateType> = async (state, config) => {
    try {
        const validatorOutput = state.validator_output;

        return { scheduler_output: {} };
    } catch (error) {
        return { toolResult: `Tool error: ${error}` };
    }
}


export const presenterNode: GraphNode<TravelPlannerStateType> = async (state, config) => {
    console.log("Presenter node received state:", state);
    try {
        const schedulerOutput = state.scheduler_output;

        return { presenter_output: {} };
    } catch (error) {
        return { toolResult: `Tool error: ${error}` };
    }
}