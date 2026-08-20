'use client';

import { useEffect } from "react";

import { ErrorFeedback } from "../../components/error-feedback";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[document route] Unexpected failure", {
      digest: error.digest,
      error,
    });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 bg-white px-8 py-24 dark:bg-black sm:px-16">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Document
          </p>
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            We couldn&apos;t open this document
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Something unexpected happend while loading the document.
          </p>
        </div>
        <ErrorFeedback
          message="The document could not be loaded. Please try again or start over."
          onRetry={retry}
        />
      </main>
    </div>
  );
}