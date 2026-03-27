import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { TravelPlannerState } from "./state";
import * as n from "./nodes";

const workflow = new StateGraph(TravelPlannerState)
    .addNode("validator", n.validatorNode)
    .addNode("scheduler", n.schedulerNode)
    .addNode("presenter", n.presenterNode)
    .addNode("route_presenter", n.routePresentationNode)
    .addEdge(START, "validator")
    .addConditionalEdges("validator", n.routeValidationNode, { Pass: "scheduler", Fail: "presenter" })
    .addEdge("scheduler", "presenter")
    .addEdge("presenter", "route_presenter")
    .addEdge("route_presenter", END);

const checkpointer = new MemorySaver();
export const app = workflow.compile({ checkpointer });