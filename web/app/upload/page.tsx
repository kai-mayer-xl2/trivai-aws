"use client";

import { useState } from "react";

export default function UploadPage() {    
    const [fileName, setFileName] = useState("Choose a PDF");

    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 bg-white px-8 py-24 dark:bg-black sm:px-16">
                <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                    Upload your document here
                </h1>
                <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                    Select a PDF to be asked about its content.
                </p>
                <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:gap-4">
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
                                setFileName(event.target.files?.[0]?.name ?? "Choose a PDF");
                            }}
                        />
                    </label>
                    <button
                        className="flex h-12 min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] sm:w-auto"
                        type="submit"
                    >
                        Upload
                    </button>
                </form>
            </main>
        </div>
    );
}
