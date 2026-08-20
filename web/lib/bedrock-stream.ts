import type { ConverseStreamOutput } from "@aws-sdk/client-bedrock-runtime";

import type { Question } from "./documents";

export class BedrockStreamError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BedrockStreamError";
    }
}

function getStreamFailure(event: ConverseStreamOutput): string | null {
    for (const key of [
        "internalServerException",
        "modelStreamErrorException",
        "serviceUnavailableException",
        "throttlingException",
        "validationException",
    ] as const) {
        const failure = event[key];
        if (failure) {
            return failure.message || "Bedrock returned a streaming error.";
        }
    }

    return null;
}

function abortError(): BedrockStreamError {
    return new BedrockStreamError("The Bedrock stream was cancelled.");
}

export async function collectConverseText(
    stream: AsyncIterable<ConverseStreamOutput> | undefined,
    signal?: AbortSignal,
    onText?: (text: string) => void,
): Promise<string> {
    if (!stream) {
        throw new BedrockStreamError("Bedrock did not return a stream.");
    }

    let text = "";
    let completed = false;

    for await (const event of stream) {
        if (signal?.aborted) {
            throw abortError();
        }

        const failure = getStreamFailure(event);
        if (failure) {
            throw new BedrockStreamError(failure);
        }

        if (event.contentBlockDelta) {
            const delta = event.contentBlockDelta.delta;
            if (!delta || !("text" in delta) || typeof delta.text !== "string") {
                throw new BedrockStreamError("Bedrock returned a non-text content delta.");
            }

            text += delta.text;
            onText?.(delta.text);
            continue;
        }

        if (event.messageStop) {
            if (event.messageStop.stopReason !== "end_turn") {
                throw new BedrockStreamError("Bedrock ended the stream before completing its response.");
            }

            completed = true;
            continue;
        }

        if (
            event.messageStart ||
            event.contentBlockStart ||
            event.contentBlockStop ||
            event.metadata
        ) {
            continue;
        }

        throw new BedrockStreamError("Bedrock returned an unsupported stream event.");
    }

    if (!completed) {
        throw new BedrockStreamError("Bedrock ended the stream without completing its response.");
    }

    return text;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function hasExactKeys(value: object, keys: string[]): boolean {
    const actualKeys = Object.keys(value).sort();
    return actualKeys.length === keys.length && actualKeys.every((key, index) => key === keys.slice().sort()[index]);
}

export function parseAndValidateQuestions(text: string): Question[] {
    let value: unknown;

    try {
        value = JSON.parse(text);
    } catch {
        throw new BedrockStreamError("Bedrock returned malformed question JSON.");
    }

    if (typeof value !== "object" || value === null || !hasExactKeys(value, ["questions"])) {
        throw new BedrockStreamError("Bedrock did not return exactly 10 questions.");
    }

    const questionsValue = (value as Record<string, unknown>).questions;
    if (!Array.isArray(questionsValue) || questionsValue.length !== 10) {
        throw new BedrockStreamError("Bedrock did not return exactly 10 questions.");
    }

    const questions = questionsValue.map((question) => {
        if (typeof question !== "object" || question === null || !hasExactKeys(question, ["question", "answers"])) {
            throw new BedrockStreamError("Bedrock returned an invalid question payload.");
        }

        const questionRecord = question as Record<string, unknown>;
        const questionText = questionRecord.question;
        const answers = questionRecord.answers;
        if (
            !isNonEmptyString(questionText) ||
            !Array.isArray(answers) ||
            answers.length !== 4 ||
            !answers.every(isNonEmptyString) ||
            new Set(answers).size !== 4
        ) {
            throw new BedrockStreamError("Bedrock returned an invalid question payload.");
        }

        return {
            question: questionText,
            answers,
        };
    });

    return questions;
}