import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConverseStreamOutput } from "@aws-sdk/client-bedrock-runtime";

vi.mock("@/lib/bedrock", () => ({
    streamQuestions: vi.fn(),
}));

import { streamQuestions } from "@/lib/bedrock";

import { POST } from "./route";

const streamQuestionsMock = streamQuestions as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

function questionStream(): AsyncIterable<ConverseStreamOutput> {
    const questions = Array.from({ length: 10 }, (_, index) => ({
        question: `Question ${index}`,
        answers: [`Correct ${index}`, "Wrong one", "Wrong two", "Wrong three"],
    }));
    const text = JSON.stringify({ questions });

    return {
        async *[Symbol.asyncIterator]() {
            yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text: text.slice(0, 20) } } };
            yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text: text.slice(20) } } };
            yield { messageStop: { stopReason: "end_turn" } };
        },
    };
}

describe("POST /api/documents/[slug]/questions", () => {
    it("returns questions only after the complete stream validates", async () => {
        streamQuestionsMock.mockResolvedValueOnce({ stream: questionStream() });

        const response = await POST(new Request("http://localhost/api/documents/doc-123/questions", { method: "POST" }), {
            params: Promise.resolve({ slug: "doc-123" }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect((await response.json()).questions).toHaveLength(10);
        expect(streamQuestions).toHaveBeenCalledWith("doc-123", expect.any(AbortSignal));
    });

    it("returns a generic failure when the stream is incomplete", async () => {
        streamQuestionsMock.mockResolvedValueOnce({
            stream: {
                async *[Symbol.asyncIterator]() {
                    yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text: "partial" } } };
                },
            },
        } as never);

        const response = await POST(new Request("http://localhost/api/documents/doc-123/questions", { method: "POST" }), {
            params: Promise.resolve({ slug: "doc-123" }),
        });

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
            error: "Questions could not be generated. Please try again.",
        });
    });
});