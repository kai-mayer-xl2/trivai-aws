"use server";

import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, ConverseCommand, DocumentFormat } from "@aws-sdk/client-bedrock-runtime";
import { notFound, redirect } from "next/navigation";
import { CREATE_QUESTIONS_PROMPT, CREATE_STUDY_GUIDANCE_PROMPT } from "./prompts";

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
});


export type Question = {
    question: string;
    answers: string[];
};

export type DocumentRecord = {
    id: string;
    title: string;
    url: string;
    questions: Question[];
};

export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

function logUnexpectedError(operation: string, error: unknown, documentId?: string) {
    console.error(`[${operation}] Unexpected failure`, { documentId, error });
}

export async function handleDocumentUpload(formData: FormData): Promise<ActionResult<never>> {
    const file = formData.get("document") as File | null;
    if (!file) {
        return { success: false, error: "Please choose a PDF before uploading." };
    }

    let documentId: string;

    try {
        const body = await file.bytes();
        documentId = crypto.randomUUID();

        if (body.length > 1 * 1024 * 1024) {
            return { success: false, error: "File size exceeds the 1MB limit." };
        }

        await s3.send(new PutObjectCommand({
            Bucket: ASSETS_BUCKET_NAME,
            Key: `documents/${documentId}.pdf`,
            Body: body,
            Metadata: {
                name: file.name,
            },
        }));

    } catch (error) {
        logUnexpectedError("upload", error);
        return { success: false, error: "The document could not be uploaded. Please try again." };
    }

    redirect(`/documents/${documentId}`);
}

export async function getDocumentById(id: string): Promise<DocumentRecord> {
    const metadata = await s3.send(new HeadObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: `documents/${id}.pdf`,
    })).catch((error) => {
        if (error.name === "NotFound") {
            notFound();
        }

        throw error;
    });

    return {
        id,
        title: metadata.Metadata?.name || "Untitled Document",
        url: `/documents/${id}/file`,
        questions: [],
    };
}

export async function generateQuestionsForDocument(
    documentId: string,
): Promise<ActionResult<Question[]>> {
    try {
        const response = await bedrock.send(new ConverseCommand({
        modelId: "eu.amazon.nova-pro-v1:0",
        messages: [
            {
                role: "user",
                content: [
                    {
                        text: CREATE_QUESTIONS_PROMPT, 
                    },
                    {
                        document: {
                            format: DocumentFormat.PDF,
                            name: "document",
                            source: {
                                s3Location: {
                                    uri: `s3://${ASSETS_BUCKET_NAME}/documents/${documentId}.pdf`,
                                },
                            },
                        }
                    }
                ]
            },
        ],
        }));

        const text = response.output?.message?.content?.[0]?.text;
        if (!text) {
            throw new Error("No text response from model");
        }

        const json = JSON.parse(text) as { questions: Question[] };
        return { success: true, data: json.questions };
    } catch (error) {
        logUnexpectedError("question generation", error, documentId);
        return { success: false, error: "Questions could not be generated. Please try again." };
    }
}

export async function submitQuestionsForDocument(
    documentId: string,
    correctAnswers: Record<string, string>,
    wrongAnswers: Record<string, string>,
): Promise<ActionResult<string>> {
    try {
        const response = await bedrock.send(new ConverseCommand({
        modelId: "eu.amazon.nova-pro-v1:0",
        messages: [
            {
                role: "user",
                content: [
                    {
                        text: CREATE_STUDY_GUIDANCE_PROMPT(correctAnswers, wrongAnswers),
                    },
                    {
                        document: {
                            format: DocumentFormat.PDF,
                            name: "document",
                            source: {
                                s3Location: {
                                    uri: `s3://${ASSETS_BUCKET_NAME}/documents/${documentId}.pdf`,
                                },
                            },
                        }
                    }
                ]
            },
        ],
        }));

        const text = response.output?.message?.content?.[0]?.text;
        if (!text) {
            throw new Error("No text response from model");
        }

        return { success: true, data: text };
    } catch (error) {
        logUnexpectedError("study guidance", error, documentId);
        return { success: false, error: "Study guidance could not be created. Please try again." };
    }
}
