import { describe, expect, it } from "vitest";

import type { ConverseStreamOutput } from "@aws-sdk/client-bedrock-runtime";

import { BedrockStreamError, collectConverseText, parseAndValidateQuestions } from "./bedrock-stream";

function streamOf(...events: ConverseStreamOutput[]): AsyncIterable<ConverseStreamOutput> {
    return {
        async *[Symbol.asyncIterator]() {
            yield* events;
        },
    };
}

function textDelta(text: string): ConverseStreamOutput {
    return { contentBlockDelta: { contentBlockIndex: 0, delta: { text } } };
}

function completedStream(...events: ConverseStreamOutput[]): AsyncIterable<ConverseStreamOutput> {
    return streamOf(...events, { messageStop: { stopReason: "end_turn" } });
}

describe("collectConverseText", () => {
    it("assembles ordered text deltas and ignores structural events", async () => {
        await expect(collectConverseText(completedStream(
            { messageStart: { role: "assistant" } },
            textDelta("first "),
            { metadata: { metrics: { latencyMs: 1 }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } } },
            textDelta("second"),
        ))).resolves.toBe("first second");
    });

    it("rejects model failures and incomplete streams", async () => {
        await expect(collectConverseText(streamOf({
            modelStreamErrorException: { message: "model failed" },
        } as ConverseStreamOutput))).rejects.toThrow("model failed");
        await expect(collectConverseText(streamOf(textDelta("partial")))).rejects.toThrow("without completing");
    });

    it("rejects cancellation before accepting another delta", async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(collectConverseText(completedStream(textDelta("partial")), controller.signal))
            .rejects.toBeInstanceOf(BedrockStreamError);
    });
});

describe("parseAndValidateQuestions", () => {
    const questions = Array.from({ length: 10 }, (_, index) => ({
        question: `Question ${index}`,
        answers: [`Correct ${index}`, "Wrong one", "Wrong two", "Wrong three"],
    }));

    it("accepts the exact question contract and preserves answer index zero", () => {
        expect(parseAndValidateQuestions(JSON.stringify({ questions }))).toEqual(questions);
        expect(parseAndValidateQuestions(JSON.stringify({ questions }))[0].answers[0]).toBe("Correct 0");
    });

    it.each([
        ["malformed JSON", "{"],
        ["the wrong question count", JSON.stringify({ questions: questions.slice(0, 9) })],
        ["the wrong answer count", JSON.stringify({ questions: questions.map((question) => ({ ...question, answers: question.answers.slice(0, 3) })) })],
        ["duplicate answers", JSON.stringify({ questions: questions.map((question) => ({ ...question, answers: ["same", "same", "other", "another"] })) })],
    ])("rejects %s", (_, value) => {
        expect(() => parseAndValidateQuestions(value)).toThrow(BedrockStreamError);
    });
});