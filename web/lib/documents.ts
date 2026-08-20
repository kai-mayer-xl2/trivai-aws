"use server";

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { notFound, redirect } from "next/navigation";

const ASSETS_BUCKET_NAME = process.env.ASSETS_BUCKET_NAME;

const s3 = new S3Client({
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
            ContentType: "application/pdf",
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
    const key = `documents/${id}.pdf`;
    const metadata = await s3.send(new HeadObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: key,
    })).catch((error) => {
        if (error.name === "NotFound") {
            notFound();
        }

        throw error;
    });
    const url = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: key,
        ResponseContentType: "application/pdf",
        ResponseContentDisposition: "inline",
    }), { expiresIn: 3600 });

    return {
        id,
        title: metadata.Metadata?.name || "Untitled Document",
        url,
        questions: [],
    };
}
