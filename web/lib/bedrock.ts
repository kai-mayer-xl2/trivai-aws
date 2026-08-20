import {
    BedrockRuntimeClient,
    ConverseStreamCommand,
    DocumentFormat,
    type ConverseStreamCommandInput,
} from "@aws-sdk/client-bedrock-runtime";

import { CREATE_QUESTIONS_PROMPT, CREATE_STUDY_GUIDANCE_PROMPT } from "./prompts";

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME;

const bedrock = new BedrockRuntimeClient({
    region: process.env.AWS_REGION,
});

function documentContent(documentId: string, text: string) {
    return [
        { text },
        {
            document: {
                format: DocumentFormat.PDF,
                name: "document",
                source: {
                    s3Location: {
                        uri: `s3://${ASSETS_BUCKET_NAME}/documents/${documentId}.pdf`,
                    },
                },
            },
        },
    ];
}

function streamInput(documentId: string, text: string): ConverseStreamCommandInput {
    return {
        modelId: "eu.amazon.nova-pro-v1:0",
        messages: [
            {
                role: "user",
                content: documentContent(documentId, text),
            },
        ],
    };
}

export function streamQuestions(documentId: string, signal: AbortSignal) {
    return bedrock.send(
        new ConverseStreamCommand(streamInput(documentId, CREATE_QUESTIONS_PROMPT)),
        { abortSignal: signal },
    );
}

export function streamStudyGuidance(
    documentId: string,
    correctAnswers: Record<string, string>,
    wrongAnswers: Record<string, string>,
    signal: AbortSignal,
) {
    return bedrock.send(
        new ConverseStreamCommand(
            streamInput(
                documentId,
                CREATE_STUDY_GUIDANCE_PROMPT(correctAnswers, wrongAnswers),
            ),
        ),
        { abortSignal: signal },
    );
}