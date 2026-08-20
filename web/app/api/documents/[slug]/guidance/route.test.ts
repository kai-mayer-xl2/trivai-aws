import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConverseStreamOutput } from "@aws-sdk/client-bedrock-runtime";

vi.mock("@/lib/bedrock", () => ({
    streamStudyGuidance: vi.fn(),
}));

import { streamStudyGuidance } from "@/lib/bedrock";

import { POST } from "./route";

const streamStudyGuidanceMock = streamStudyGuidance as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

function guidanceStream(): AsyncIterable<ConverseStreamOutput> {
    return {
        async *[Symbol.asyncIterator]() {
            yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text: "First part. " } } };
            yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text: "Second part." } } };
            yield { messageStop: { stopReason: "end_turn" } };
        },
    };
}

async function readFrames(response: Response) {
    const text = await response.text();
    return text.trim().split("\n").map((line) => JSON.parse(line));
}

describe("POST /api/documents/[slug]/guidance", () => {
    it("streams text frames followed by a done frame", async () => {
        streamStudyGuidanceMock.mockResolvedValueOnce({ stream: guidanceStream() });

        const response = await POST(new Request("http://localhost/api/documents/doc-123/guidance", {
            method: "POST",
            body: JSON.stringify({ correctAnswers: { "0": "0" }, wrongAnswers: { "1": "2" } }),
            headers: { "Content-Type": "application/json" },
        }), { params: Promise.resolve({ slug: "doc-123" }) });

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("content-type")).toContain("application/x-ndjson");
        await expect(readFrames(response)).resolves.toEqual([
            { type: "text", value: "First part. " },
            { type: "text", value: "Second part." },
            { type: "done" },
        ]);
        expect(streamStudyGuidance).toHaveBeenCalledWith(
            "doc-123",
            { "0": "0" },
            { "1": "2" },
            expect.any(AbortSignal),
        );
    });

    it("rejects malformed input before starting Bedrock", async () => {
        const response = await POST(new Request("http://localhost/api/documents/doc-123/guidance", {
            method: "POST",
            body: JSON.stringify({ wrongAnswers: {} }),
            headers: { "Content-Type": "application/json" },
        }), { params: Promise.resolve({ slug: "doc-123" }) });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "Invalid guidance request." });
        expect(streamStudyGuidance).not.toHaveBeenCalled();
    });

    it.each([
        { correctAnswers: [], wrongAnswers: {} },
        { correctAnswers: { "0": "1" }, wrongAnswers: {} },
        { correctAnswers: {}, wrongAnswers: { "0": "0" } },
        { correctAnswers: { "10": "0" }, wrongAnswers: {} },
        { correctAnswers: { "0": "0" }, wrongAnswers: { "0": "1" } },
    ])("rejects invalid answer record shapes and values: %#", async (body) => {
        const response = await POST(new Request("http://localhost/api/documents/doc-123/guidance", {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        }), { params: Promise.resolve({ slug: "doc-123" }) });

        expect(response.status).toBe(400);
        expect(streamStudyGuidance).not.toHaveBeenCalled();
    });
});