import { collectConverseText } from "@/lib/bedrock-stream";
import { streamStudyGuidance } from "@/lib/bedrock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GuidanceRouteContext = {
    params: Promise<{ slug: string }>;
};

type AnswerRecords = Record<string, string>;

function isAnswerRecords(value: unknown): value is AnswerRecords {
    return typeof value === "object" && value !== null && Object.values(value).every((answer) => typeof answer === "string");
}

function frame(event: { type: "text"; value: string } | { type: "done" } | { type: "error"; message: string }) {
    return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request, { params }: GuidanceRouteContext) {
    const { slug } = await params;
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid guidance request." }, { status: 400 });
    }

    if (
        !slug ||
        typeof body !== "object" ||
        body === null ||
        !isAnswerRecords((body as Record<string, unknown>).correctAnswers) ||
        !isAnswerRecords((body as Record<string, unknown>).wrongAnswers)
    ) {
        return Response.json({ error: "Invalid guidance request." }, { status: 400 });
    }

    const requestBody = body as {
        correctAnswers: AnswerRecords;
        wrongAnswers: AnswerRecords;
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const response = await streamStudyGuidance(
                    slug,
                    requestBody.correctAnswers,
                    requestBody.wrongAnswers,
                    request.signal,
                );
                await collectConverseText(
                    response.stream,
                    request.signal,
                    (text) => controller.enqueue(encoder.encode(frame({ type: "text", value: text }))),
                );
                controller.enqueue(encoder.encode(frame({ type: "done" })));
                controller.close();
            } catch (error) {
                if (request.signal.aborted) {
                    controller.close();
                    return;
                }

                console.error("[study guidance] Stream request failed", { documentId: slug, error });
                controller.enqueue(encoder.encode(frame({
                    type: "error",
                    message: "Study guidance could not be created. Please try again.",
                })));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
        },
    });
}