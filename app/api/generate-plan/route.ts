import { NextRequest } from "next/server";
import { app } from "@/app/lib/graph";

const stausMessages: Record<string, string> = {
    "validator": "Validating your input...",
    "scheduler": "Generating your travel plan...",
    "presenter": "Finalizing the plan and preparing your summary...",
}

export async function POST(request: NextRequest) {
    const body = await request.json();

    const initialState = {
        user_input: {
            location: body.location,
            budget: body.budget,
            days: body.days,
            travelers: body.travelers,
            userNote: body.userNote,
            mainRoute: body.mainRoute,
            localTransport: body.localTransport,
            includeTags: body.includeTags,
            preferredActivities: body.preferredActivities,
        },

    };

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (payload: any) => {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                )
            };

            const eventStream = app.streamEvents(initialState, {
                version: "v2", 
            });
            for await (const event of eventStream) {
                const eventType = event.event;
                const nodeName = event.name;
                console.log("Event type:", eventType, "Node name:", nodeName);

                if (nodeName.startsWith("__")) continue;



                if (eventType === "on_chain_start") {
                    const statusMessage = stausMessages[nodeName];
                    if (statusMessage) {
                        sendEvent({ type: "status", message: statusMessage });
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate delay
                } else if (eventType === "on_chain_end" && nodeName === "LangGraph") {
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