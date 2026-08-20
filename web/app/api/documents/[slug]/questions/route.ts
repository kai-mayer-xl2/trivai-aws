import { collectConverseText, parseAndValidateQuestions } from "@/lib/bedrock-stream";
import { streamQuestions } from "@/lib/bedrock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuestionsRouteContext = {
    params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, { params }: QuestionsRouteContext) {
    const { slug } = await params;

    if (!slug) {
        return Response.json({ error: "A document is required." }, { status: 400 });
    }

    try {
        const response = await streamQuestions(slug, _request.signal);
        const text = await collectConverseText(response.stream, _request.signal);
        const questions = parseAndValidateQuestions(text);

        return Response.json({ questions }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        if (_request.signal.aborted) {
            return new Response(null, { status: 499 });
        }

        console.error("[question generation] Stream request failed", { documentId: slug, error });
        return Response.json(
            { error: "Questions could not be generated. Please try again." },
            { status: 502 },
        );
    }
}