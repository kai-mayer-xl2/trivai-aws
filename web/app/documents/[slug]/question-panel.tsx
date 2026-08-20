"use client";

import { useState } from "react";

import type { ActionResult, Question } from "@/lib/documents";

import { ErrorFeedback } from "../../components/error-feedback";
import { QuestionItem } from "./question-item";

type QuestionPanelProps = {
    documentId: string;
    initialQuestions: Question[];
    onGenerate: (documentId: string) => Promise<ActionResult<Question[]>>;
    onSubmit: (documentId: string, correctAnswers: Record<string, string>, wrongAnswers: Record<string, string>) => Promise<ActionResult<string>>;
};


function LargeBoxShimmer() {
    return (
        <div className="h-[208px] overflow-hidden rounded-lg border border-black/[.08] bg-zinc-100 dark:border-white/[.145] dark:bg-zinc-900">
            <div className="document-shimmer h-full w-2/3" />
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
    onGenerate,
    onSubmit,
}: QuestionPanelProps) {
    const [questions, setQuestions] = useState(initialQuestions);
    const [isGenerating, setIsGenerating] = useState(false);
    const [openQuestion, setOpenQuestion] = useState<number | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, number> | null>(null);
    const [studyGuidance, setStudyGuidance] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);

    async function handleGenerateQuestions() {
        setIsGenerating(true);
        setError(null);

        try {
            const result = await onGenerate(documentId);
            if (result.success) {
                setQuestions(result.data);
                setOpenQuestion(0);
                setSelectedAnswers({});
                setSubmittedAnswers(null);
                setStudyGuidance(null);
            } else {
                setError({ message: result.error, retry: handleGenerateQuestions });
            }
        } catch (error) {
            console.error("[question generation] Unexpected client failure", error);
            setError({
                message: "Questions could not be generated. Please try again.",
                retry: handleGenerateQuestions,
            });
        } finally {
            setIsGenerating(false);
        }
    }

    if (isGenerating) {
        return <QuestionShimmer />;
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

        setSubmittedAnswers(submitted);
        setIsSubmitting(true);
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
            const result = await onSubmit(documentId, correctAnswers, wrongAnswers);
            if (result.success) {
                setStudyGuidance(result.data);
            } else {
                setSubmittedAnswers(null);
                setError({ message: result.error, retry: handleSubmit });
            }
        } catch (error) {
            setSubmittedAnswers(null);
            console.error("[study guidance] Unexpected client failure", error);
            setError({
                message: "Study guidance could not be created. Please try again.",
                retry: handleSubmit,
            });
        } finally {
            setIsSubmitting(false);
        }
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
            {isSubmitting ? LargeBoxShimmer() : studyGuidance ? (
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
