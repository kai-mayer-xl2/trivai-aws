"use client";

import { useState } from "react";

import type {  Question } from "@/lib/documents";

import { QuestionItem } from "./question-item";

type QuestionPanelProps = {
    documentId: string;
    initialQuestions: Question[];
    onGenerate: (documentId: string) => Promise<Question[]>;
    onSubmit: (documentId: string, correctAnswers: Record<string, string>, wrongAnswers: Record<string, string>) => Promise<string>;
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
    const [studyGuidance, setStudyGuidance] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleGenerateQuestions() {
        setIsGenerating(true);

        try {
            const generatedQuestions = await onGenerate(documentId);
            setQuestions(generatedQuestions);
            setOpenQuestion(0);
            setSelectedAnswers({});
            setStudyGuidance(null);
        } finally {
            setIsGenerating(false);
        }
    }

    if (isGenerating) {
        return <QuestionShimmer />;
    }

    if (questions.length === 0) {
        return (
            <button
                className="flex h-12 min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-wait disabled:opacity-70 dark:hover:bg-[#ccc] cursor-pointer"
                onClick={handleGenerateQuestions}
                type="button"
            >
                Generate Questions
            </button>
        );
    }

    const allQuestionsAnswered = questions.every(
        (_, index) => selectedAnswers[index] !== undefined,
    );

    async function handleSubmit() {
        setIsSubmitting(true);

        const correctAnswers: Record<string, string> = {};
        const wrongAnswers: Record<string, string> = {};

        for (const [index, answerIndex] of Object.entries(selectedAnswers)) {
            if (answerIndex === 0) {
                correctAnswers[index] = answerIndex.toString();
            } else {
                wrongAnswers[index] = answerIndex.toString();
            }
        }

        try {
            setStudyGuidance(await onSubmit(documentId, correctAnswers, wrongAnswers));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-5">
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
