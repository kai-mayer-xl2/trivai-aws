"use client";

import { useRef, useState } from "react";

import type { Question } from "@/lib/documents";

import { ErrorFeedback } from "../../components/error-feedback";
import { QuestionItem } from "./question-item";

type QuestionPanelProps = {
    documentId: string;
    initialQuestions: Question[];
};


function GuidanceProgress({ text, onCancel }: { text: string | null; onCancel: () => void }) {
    return (
        <div className="space-y-3">
            {text ? (
                <p
                    aria-live="polite"
                    className="rounded-lg border border-black/[.08] px-4 py-3 text-base leading-7 text-zinc-600 dark:border-white/[.145] dark:text-zinc-400"
                >
                    {text}
                </p>
            ) : (
                <div className="h-[208px] overflow-hidden rounded-lg border border-black/[.08] bg-zinc-100 dark:border-white/[.145] dark:bg-zinc-900">
                    <div className="document-shimmer h-full w-2/3" />
                </div>
            )}
            <button
                className="flex h-12 min-h-12 items-center justify-center rounded-full border border-black/[.08] px-5 text-base font-medium text-foreground transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08] cursor-pointer"
                onClick={onCancel}
                type="button"
            >
                Cancel
            </button>
        </div>
    );
}

function QuestionShimmer() {
    return (
        <div className="space-y-3" role="status">
            {Array.from({ length: 5 }, (_, index) => (
                <div
                    className="h-[52px] overflow-hidden rounded-lg border border-black/[.08] bg-zinc-100 dark:border-white/[.145] dark:bg-zinc-900"
                    key={index}
                >
                    <div className="document-shimmer h-full w-2/3" />
                </div>
            ))}
        </div>
    );
}

export function QuestionPanel({
    documentId,
    initialQuestions,
}: QuestionPanelProps) {
    const [questions, setQuestions] = useState(initialQuestions);
    const [isGenerating, setIsGenerating] = useState(false);
    const [openQuestion, setOpenQuestion] = useState<number | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, number> | null>(null);
    const [studyGuidance, setStudyGuidance] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
    const generationController = useRef<AbortController | null>(null);
    const guidanceController = useRef<AbortController | null>(null);
    const guidanceReader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

    async function handleGenerateQuestions() {
        generationController.current?.abort();
        const controller = new AbortController();
        generationController.current = controller;
        setIsGenerating(true);
        setError(null);
        setStudyGuidance(null);

        try {
            const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/questions`, {
                method: "POST",
                signal: controller.signal,
            });
            const result = await response.json() as { questions?: Question[]; error?: string };
            if (!response.ok || !result.questions) {
                throw new Error(result.error || "Questions could not be generated. Please try again.");
            }

            setQuestions(result.questions);
            setOpenQuestion(0);
            setSelectedAnswers({});
            setSubmittedAnswers(null);
            setStudyGuidance(null);
        } catch (error) {
            if (controller.signal.aborted || generationController.current !== controller) {
                return;
            }

            console.error("[question generation] Unexpected client failure", error);
            setError({
                message: error instanceof Error ? error.message : "Questions could not be generated. Please try again.",
                retry: handleGenerateQuestions,
            });
        } finally {
            if (generationController.current === controller) {
                generationController.current = null;
                setIsGenerating(false);
            }
        }
    }

    function handleCancelGeneration() {
        generationController.current?.abort();
        generationController.current = null;
        setIsGenerating(false);
    }

    if (isGenerating) {
        return (
            <div className="space-y-3">
                <QuestionShimmer />
                <button
                    className="flex h-12 min-h-12 items-center justify-center rounded-full border border-black/[.08] px-5 text-base font-medium text-foreground transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08] cursor-pointer"
                    onClick={handleCancelGeneration}
                    type="button"
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="space-y-5">
                {error ? <ErrorFeedback message={error.message} onRetry={error.retry} /> : null}
                <button
                    className="flex h-12 min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-wait disabled:opacity-70 dark:hover:bg-[#ccc] cursor-pointer"
                    onClick={handleGenerateQuestions}
                    type="button"
                >
                    Generate Questions
                </button>
            </div>
        );
    }

    const allQuestionsAnswered = questions.every(
        (_, index) => selectedAnswers[index] !== undefined,
    );

    async function handleSubmit() {
        const submitted = { ...selectedAnswers };
        guidanceController.current?.abort();
        const controller = new AbortController();
        guidanceController.current = controller;

        setSubmittedAnswers(submitted);
        setIsSubmitting(true);
        setStudyGuidance(null);
        setError(null);

        const correctAnswers: Record<string, string> = {};
        const wrongAnswers: Record<string, string> = {};

        for (const [index, answerIndex] of Object.entries(submitted)) {
            if (answerIndex === 0) {
                correctAnswers[index] = answerIndex.toString();
            } else {
                wrongAnswers[index] = answerIndex.toString();
            }
        }

        try {
            const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/guidance`, {
                method: "POST",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correctAnswers, wrongAnswers }),
            });
            if (!response.ok || !response.body) {
                const result = await response.json().catch(() => ({})) as { error?: string };
                throw new Error(result.error || "Study guidance could not be created. Please try again.");
            }

            const reader = response.body.getReader();
            guidanceReader.current = reader;
            const decoder = new TextDecoder();
            let buffer = "";
            let completed = false;

            while (true) {
                const { done, value } = await reader.read();
                buffer += decoder.decode(value, { stream: !done });
                const frames = buffer.split("\n");
                buffer = frames.pop() || "";

                for (const serializedFrame of frames) {
                    if (!serializedFrame) {
                        continue;
                    }

                    const event = JSON.parse(serializedFrame) as
                        | { type: "text"; value: string }
                        | { type: "done" }
                        | { type: "error"; message: string };
                    if (event.type === "text") {
                        setStudyGuidance((current) => (current || "") + event.value);
                    } else if (event.type === "error") {
                        throw new Error(event.message);
                    } else if (event.type === "done") {
                        completed = true;
                    }
                }

                if (done) {
                    break;
                }
            }

            if (buffer.trim()) {
                const event = JSON.parse(buffer) as { type: "done" } | { type: "text"; value: string } | { type: "error"; message: string };
                if (event.type === "text") {
                    setStudyGuidance((current) => (current || "") + event.value);
                } else if (event.type === "error") {
                    throw new Error(event.message);
                } else {
                    completed = true;
                }
            }

            if (!completed) {
                throw new Error("Study guidance stream ended before completion.");
            }
        } catch (error) {
            if (controller.signal.aborted || guidanceController.current !== controller) {
                return;
            }

            setSubmittedAnswers(null);
            setStudyGuidance(null);
            console.error("[study guidance] Unexpected client failure", error);
            setError({
                message: error instanceof Error ? error.message : "Study guidance could not be created. Please try again.",
                retry: handleSubmit,
            });
        } finally {
            if (guidanceController.current === controller) {
                guidanceReader.current = null;
                guidanceController.current = null;
                setIsSubmitting(false);
            }
        }
    }

    function handleCancelSubmit() {
        guidanceReader.current?.cancel();
        guidanceController.current?.abort();
        guidanceReader.current = null;
        guidanceController.current = null;
        setIsSubmitting(false);
        setSubmittedAnswers(null);
        setStudyGuidance(null);
        setError(null);
    }

    const correctAnswerCount = submittedAnswers
        ? Object.values(submittedAnswers).filter((answerIndex) => answerIndex === 0).length
        : 0;

    return (
        <div className="space-y-5">
            {error ? <ErrorFeedback message={error.message} onRetry={error.retry} /> : null}
            <ol className="space-y-3">
                {questions.map((question, index) => (
                    <QuestionItem
                        answers={question.answers}
                        index={index}
                        isOpen={openQuestion === index}
                        key={index}
                        onAnswer={(answerIndex) => {
                            setSelectedAnswers((current) => ({
                                ...current,
                                [index]: answerIndex,
                            }));
                            setOpenQuestion(index + 1 < questions.length ? index + 1 : null);
                        }}
                        onToggle={() => setOpenQuestion(openQuestion === index ? null : index)}
                        question={question.question}
                        selectedAnswer={selectedAnswers[index]}
                        submitted={submittedAnswers !== null}
                    />
                ))}
            </ol>
            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    className="flex h-12 min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc] cursor-pointer"
                    disabled={!allQuestionsAnswered || isSubmitting || studyGuidance !== null}
                    onClick={handleSubmit}
                    type="button"
                    >
                    Get Study Guidance
                </button>
            </div>
            {submittedAnswers ? (
                <p
                    aria-live="polite"
                    className="text-base font-medium text-emerald-700 dark:text-emerald-400"
                    role="status"
                >
                    Score: {correctAnswerCount} of {questions.length} correct
                </p>
            ) : null}
            {isSubmitting ? <GuidanceProgress onCancel={handleCancelSubmit} text={studyGuidance} /> : studyGuidance ? (
                <>
                    <p className="rounded-lg border border-black/[.08] px-4 py-3 text-base leading-7 text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                        {studyGuidance}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            className="flex h-12 min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc] cursor-pointer"
                            disabled={isSubmitting}
                            onClick={handleGenerateQuestions}
                            type="button"
                            >
                            Create New Questions
                        </button>
                        <a
                            className="flex h-12 min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc] cursor-pointer"
                            href="/upload"
                            type="button"
                            >
                            Upload Another Document
                        </a>
                    </div>
                </>
            ) : null}
        </div>
    );
}
