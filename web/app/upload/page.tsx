"use client";

import { handleDocumentUpload } from "@/lib/documents";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ErrorFeedback } from "../components/error-feedback";

function UploadButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="relative flex h-12 min-h-12 w-full shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-wait disabled:opacity-90 dark:hover:bg-[#ccc] sm:w-auto cursor-pointer"
            type="submit"
            disabled={pending}
            aria-busy={pending}
        >
            {pending ? (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="document-shimmer h-full w-2/3" />
                </span>
            ) : null}
            <span className="relative">{pending ? "Uploading..." : "Upload"}</span>
        </button>
    );
}

export default function UploadPage() {    
    const [fileName, setFileName] = useState("Choose a PDF");
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(formData: FormData) {
        setError(null);

        try {
            const result = await handleDocumentUpload(formData);
            if (!result.success) {
                setError(result.error);
            }
        } catch (error) {
            console.error("[upload] Unexpected client failure", error);
            setError("The document could not be uploaded. Please try again.");
        }
    }

    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 bg-white px-8 py-24 dark:bg-black sm:px-16">
                <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                    Upload your document here
                </h1>
                <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                    Select a PDF to be asked about its content.
                </p>
                <form action={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:gap-4" ref={formRef}>
                    <label className="flex h-12 min-h-12 min-w-0 flex-1 cursor-pointer items-center rounded-full border border-solid border-black/[.08] px-4 text-sm text-zinc-600 transition-colors hover:border-black/[.16] hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-400 dark:hover:border-white/[.25] dark:hover:bg-[#1a1a1a]">
                        <span className="truncate">{fileName}</span>
                        <input
                            className="sr-only"
                            type="file"
                            id="document"
                            name="document"
                            accept=".pdf"
                            required
                            onChange={(event) => {
                                setError(null);
                                setFileName(event.target.files?.[0]?.name ?? "Choose a PDF");
                            }}
                        />
                    </label>
                    <UploadButton />
                </form>
                {error ? (
                    <ErrorFeedback
                        message={error}
                        onRetry={() => formRef.current?.requestSubmit()}
                        title={error === "File size exceeds the 1MB limit." || error === "Please choose a PDF before uploading."
                            ? "Upload failed"
                            : undefined}
                    />
                ) : null}
            </main>
        </div>
    );
}
