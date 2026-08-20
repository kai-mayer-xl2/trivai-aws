import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: vi.fn(),
}));

const { notFound } = vi.hoisted(() => {
    process.env.ASSETS_BUCKET_NAME = "test-assets-bucket";

    return {
        notFound: vi.fn(() => {
            throw new Error("NEXT_NOT_FOUND");
        }),
    };
});

vi.mock("next/navigation", () => ({ notFound }));

import { getDocumentById } from "./documents";

describe("getDocumentById", () => {
    const send = vi.spyOn(S3Client.prototype, "send");
    const signedUrl = "https://signed.example/document.pdf";

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getSignedUrl).mockResolvedValue(signedUrl);
        send.mockResolvedValue({ Metadata: { name: "Guide.pdf" } } as never);
    });

    it("signs the private PDF with the canonical key for one hour", async () => {
        const document = await getDocumentById("document-123");

        expect(send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
        expect((send.mock.calls[0][0] as HeadObjectCommand).input).toEqual({
            Bucket: "test-assets-bucket",
            Key: "documents/document-123.pdf",
        });
        expect(getSignedUrl).toHaveBeenCalledWith(
            expect.any(S3Client),
            expect.any(GetObjectCommand),
            { expiresIn: 3600 },
        );
        expect((vi.mocked(getSignedUrl).mock.calls[0][1] as GetObjectCommand).input).toEqual({
            Bucket: "test-assets-bucket",
            Key: "documents/document-123.pdf",
            ResponseContentType: "application/pdf",
            ResponseContentDisposition: "inline",
        });
        expect(document.url).toBe(signedUrl);
    });

    it("keeps missing documents on the not-found path without signing", async () => {
        send.mockRejectedValueOnce(Object.assign(new Error("missing"), { name: "NotFound" }));

        await expect(getDocumentById("missing-document")).rejects.toThrow("NEXT_NOT_FOUND");
        expect(notFound).toHaveBeenCalledOnce();
        expect(getSignedUrl).not.toHaveBeenCalled();
    });
});