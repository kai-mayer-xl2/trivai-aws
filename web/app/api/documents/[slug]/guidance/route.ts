import { collectConverseText } from "@/lib/bedrock-stream";
import { streamStudyGuidance } from "@/lib/bedrock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GuidanceRouteContext = {
    params: Promise<{ slug: string }>;
};

type AnswerRecords = Record<string, string>;

function isAnswerRecords(value: unknown, allowedAnswers: Set<string>): value is AnswerRecords {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    ) {
        return false;
    }

    const entries = Object.entries(value);
    return entries.length <= 10 && entries.every(([questionKey, answer]) => (
        /^(?:[0-9]|10)$/.test(questionKey) &&
        Number(questionKey) < 10 &&
        allowedAnswers.has(answer)
    ));
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
        !isAnswerRecords((body as Record<string, unknown>).correctAnswers, new Set(["0"])) ||
        !isAnswerRecords((body as Record<string, unknown>).wrongAnswers, new Set(["1", "2", "3"]))
    ) {
        return Response.json({ error: "Invalid guidance request." }, { status: 400 });
    }

    const requestBody = body as {
        correctAnswers: AnswerRecords;
        wrongAnswers: AnswerRecords;
    };

    if (Object.keys(requestBody.correctAnswers).some((key) => key in requestBody.wrongAnswers)) {
        return Response.json({ error: "Invalid guidance request." }, { status: 400 });
    }

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