"use client";

type ErrorFeedbackProps = {
    message: string;
    onRetry: () => void;
    title?: string;
};

export function ErrorFeedback({
    message,
    onRetry,
    title = "Something unexpected happend",
}: ErrorFeedbackProps) {
    return (
        <div
            aria-live="assertive"
            className="max-w-md space-y-4 rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900 dark:bg-red-950/30"
            role="alert"
        >
            <div className="space-y-1">
                <h2 className="text-base font-semibold text-red-800 dark:text-red-300">
                    {title}
                </h2>
                <p className="text-sm leading-6 text-red-700 dark:text-red-400">
                    {message}
                </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    className="flex h-12 min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                    onClick={onRetry}
                    type="button"
                >
                    Retry
                </button>
                <a
                    className="flex h-12 min-h-12 items-center justify-center rounded-full border border-black/[.08] px-5 text-sm font-medium text-foreground transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                    href="/upload"
                >
                    Start over
                </a>
            </div>
        </div>
    );
}