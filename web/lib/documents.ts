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

export async function handleDocumentUpload(formData: FormData): Promise<{ success: boolean, error?: string }> {
    const file = formData.get("document") as File | null;
    if (!file) {
        throw new Error("No file provided");
    }

    const body = await file.bytes();
    const id = crypto.randomUUID();

    if (body.length > 1 * 1024 * 1024) {
        return { success: false, error: "File size exceeds the 1MB limit." };
    }

    await s3.send(new PutObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: `documents/${id}.pdf`,
        Body: body,
        Metadata: {
            name: file.name,
        },
    }));

    redirect(`/documents/${id}`);
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
): Promise<Question[]> {
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
    return json.questions;
}

export async function submitQuestionsForDocument(
    documentId: string,
    correctAnswers: Record<string, string>,
    wrongAnswers: Record<string, string>,
): Promise<string> {
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

    return text;
}
