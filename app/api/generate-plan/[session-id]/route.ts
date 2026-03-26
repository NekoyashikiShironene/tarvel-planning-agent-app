import { NextRequest } from "next/server";
import { app } from "@/app/lib/graph";
import { TravelPlannerStateType } from "@/app/lib/state";

const stausMessages: Record<string, string> = {
    "validator": "Validating your input...",
    "scheduler": "Generating your travel plan...",
    "presenter": "Finalizing the plan and preparing your summary...",
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ "session-id": string }> }) {
    const body = await request.json();
    const { "session-id": sessionId } = await params;

    const mode = request.nextUrl.searchParams.get("mode") || "submit";

    let state: TravelPlannerStateType;

    if (mode === "submit") {
        state = {
            user_input: {
                location: body.location as string,
                budget: Number(body.budget),
                days: Number(body.days),
                travelers: body.travelers as number,
                userNote: body.userNote as string,
                mainRoute: body.mainRoute as string,
                localTransport: body.localTransport as string,
                includeTags: body.includeTags as string[],
                preferredActivities: body.preferredActivities as string[]
            },
            user_feedback_message: "",
            validator_output: null,
            scheduler_output: null,
            presenter_output: null,
            error: null
        }
    }
    else {
        state = {
            user_feedback_message: body.feedback_message as string
        }
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (payload: any) => {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                )
            };


            const eventStream = app.streamEvents(state, {
                version: "v2",
                configurable: { thread_id: sessionId },
            });

            for await (const event of eventStream) {
                const eventType = event.event;
                const nodeName = event.name;
                // console.log("Event type:", eventType, "Node name:", nodeName);

                if (nodeName.startsWith("__")) continue;

                if (eventType === "on_chain_start") {
                    const statusMessage = stausMessages[nodeName];
                    if (statusMessage) {
                        sendEvent({ type: "status", message: statusMessage });
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate delay

                }
                else if (eventType === "interrupt") {
                    const finalState = event.data.output;
                    sendEvent({ type: "interrupt", message: "The process was interrupted.", data: finalState });
                }
                else if (eventType === "on_chain_end" && nodeName === "LangGraph") {
                    const finalState = event.data.output;
                    sendEvent({ type: "done", data: finalState });

                }
            }

            controller.close()

        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    })
}