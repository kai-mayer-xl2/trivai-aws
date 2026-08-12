"use client";

type QuestionItemProps = {
    index: number;
    question: string;
    answers: string[];
    selectedAnswer: number | undefined;
    isOpen: boolean;
    onToggle: () => void;
    onAnswer: (answerIndex: number) => void;
};

export function QuestionItem({
    index,
    question,
    answers,
    selectedAnswer,
    isOpen,
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
                {selectedAnswer !== undefined ? (
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
                <div
                    className="space-y-2 border-t border-black/[.08] px-4 py-3 dark:border-white/[.145]"
                    id={`${questionId}-answers`}
                >
                    {answers.map((answer, answerIndex) => (
                        <button
                            aria-pressed={selectedAnswer === answerIndex}
                            className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm leading-5 transition-colors cursor-pointer ${selectedAnswer === answerIndex
                                ? "border-foreground bg-black/[.05] text-foreground dark:bg-white/[.1]"
                                : "border-black/[.08] text-zinc-600 hover:border-black/[.18] hover:bg-black/[.03] dark:border-white/[.145] dark:text-zinc-400 dark:hover:border-white/[.25] dark:hover:bg-white/[.04]"
                                }`}
                            key={answer}
                            onClick={() => onAnswer(answerIndex)}
                            type="button"
                        >
                            <span className="font-medium uppercase text-zinc-400 dark:text-zinc-500">
                                {String.fromCharCode(97 + answerIndex)}
                            </span>
                            <span>{answer}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </li>
    );
}