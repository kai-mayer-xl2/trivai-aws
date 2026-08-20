"use client";

import { useState } from "react";


type QuestionItemProps = {
    index: number;
    question: string;
    answers: string[];
    selectedAnswer: number | undefined;
    isOpen: boolean;
    submitted: boolean;
    onToggle: () => void;
    onAnswer: (answerIndex: number) => void;
};

function AnswerChoices({
    questionId,
    answers,
    selectedAnswer,
    submitted,
    onAnswer,
}: {
    questionId: string;
    answers: string[];
    selectedAnswer: number | undefined;
    submitted: boolean;
    onAnswer: (answerIndex: number) => void;
}) {
    const [shuffledAnswers] = useState(() =>
        answers
            .map((answer, answerIndex) => ({ answer, answerIndex }))
            .sort(() => Math.random() - 0.5),
    );

    return (
        <div
            className="space-y-2 border-t border-black/[.08] px-4 py-3 dark:border-white/[.145]"
            id={`${questionId}-answers`}
        >
            {shuffledAnswers.map(({ answer, answerIndex }, displayIndex) => (
                (() => {
                    const isSelected = selectedAnswer === answerIndex;
                    const isCorrectAnswer = answerIndex === 0;
                    const isSelectedCorrect = submitted && isSelected && isCorrectAnswer;
                    const isSelectedWrong = submitted && isSelected && !isCorrectAnswer;
                    const isRevealedCorrect = submitted && isCorrectAnswer;
                    const feedbackLabel = isSelectedCorrect || isRevealedCorrect
                        ? "Correct answer"
                        : isSelectedWrong
                            ? "Your answer - incorrect"
                            : null;
                    const feedbackClassName = isSelectedWrong
                        ? "border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-200"
                        : isRevealedCorrect
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : isSelected
                                ? "border-foreground bg-black/[.05] text-foreground dark:bg-white/[.1]"
                                : "border-black/[.08] text-zinc-600 hover:border-black/[.18] hover:bg-black/[.03] dark:border-white/[.145] dark:text-zinc-400 dark:hover:border-white/[.25] dark:hover:bg-white/[.04]";

                    return (
                        <button
                            aria-label={`${String.fromCharCode(97 + displayIndex)}. ${answer}${feedbackLabel ? `, ${feedbackLabel}` : ""}`}
                            aria-pressed={isSelected}
                            className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm leading-5 transition-colors ${submitted ? "cursor-default" : "cursor-pointer"} ${feedbackClassName}`}
                            disabled={submitted}
                            key={answerIndex}
                            onClick={() => onAnswer(answerIndex)}
                            type="button"
                        >
                            <span className="font-medium uppercase text-zinc-400 dark:text-zinc-500">
                                {String.fromCharCode(97 + displayIndex)}
                            </span>
                            <span className="min-w-0 flex-1">{answer}</span>
                            {feedbackLabel ? (
                                <span className="shrink-0 text-xs font-medium">
                                    {feedbackLabel}
                                </span>
                            ) : null}
                        </button>
                    );
                })()
            ))}
        </div>
    );
}

export function QuestionItem({
    index,
    question,
    answers,
    selectedAnswer,
    isOpen,
    submitted,
    onToggle,
    onAnswer,
}: QuestionItemProps) {
    const questionId = `question-${index}`;

    return (
        <li className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
            <button
                aria-controls={`${questionId}-answers`}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 px-4 py-3 text-left text-base leading-6 text-zinc-700 transition-colors hover:bg-black/[.03] dark:text-zinc-300 dark:hover:bg-white/[.04]"
                onClick={onToggle}
                type="button"
            >
                <span className="font-medium text-zinc-400 dark:text-zinc-500">
                    {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">{question}</span>
                {submitted ? (
                    <span
                        aria-label={selectedAnswer === 0 ? "Correct answer" : "Incorrect answer"}
                        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${selectedAnswer === 0 ? "bg-emerald-600" : "bg-red-600"}`}
                    >
                        {selectedAnswer === 0 ? "✓" : "!"}
                    </span>
                ) : selectedAnswer !== undefined ? (
                    <span
                        aria-label="Answered"
                        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] text-background"
                    >
                        ✓
                    </span>
                ) : null}
                <span aria-hidden="true" className="text-zinc-400 w-2">
                    {isOpen ? "-" : "+"}
                </span>
            </button>
            {isOpen ? (
                <AnswerChoices
                    questionId={questionId}
                    answers={answers}
                    selectedAnswer={selectedAnswer}
                    submitted={submitted}
                    onAnswer={onAnswer}
                />
            ) : null}
        </li>
    );
}