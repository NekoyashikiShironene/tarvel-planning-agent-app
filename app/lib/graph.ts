import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { TravelPlannerState } from "./state";
import * as n from "./nodes";

const workflow = new StateGraph(TravelPlannerState)
    .addNode("validator", n.validatorNode)
    .addNode("scheduler", n.schedulerNode)
    .addNode("presenter", n.presenterNode)
    .addEdge(START, "validator")
    .addConditionalEdges("validator", n.routeValidationNode, { Pass: "scheduler", Fail: END })
    .addEdge("scheduler", "presenter")
    .addEdge("presenter", END);

export const app = workflow.compile();

app.invoke({})