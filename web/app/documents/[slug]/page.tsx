
import {
    generateQuestionsForDocument,
    getDocumentById,
    submitQuestionsForDocument,
} from "@/lib/documents";

import { QuestionPanel } from "./question-panel";

type DocumentPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
    const { slug } = await params;
    const document = await getDocumentById(slug);

    return (
        <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex w-full max-w-3xl flex-1 flex-col gap-10 bg-white px-8 py-24 dark:bg-black sm:px-16">
                <header className="space-y-3">
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Document
                    </p>
                    <a
                        className="group inline-flex max-w-full items-center gap-2 text-3xl font-semibold leading-10 tracking-tight text-black underline decoration-zinc-300 decoration-2 underline-offset-8 transition-colors hover:text-zinc-600 hover:decoration-zinc-500 dark:text-zinc-50 dark:decoration-zinc-700 dark:hover:text-zinc-300 dark:hover:decoration-zinc-400"
                        href={document.url}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <span className="truncate">{document.title}</span>
                        <span aria-hidden="true" className="shrink-0 text-lg no-underline">
                            ↗
                        </span>
                    </a>
                </header>

                <section aria-labelledby="questions-heading" className="max-w-2xl space-y-5">
                    <div className="space-y-1">
                        <h1
                            className="text-xl font-semibold leading-7 text-black dark:text-zinc-50"
                            id="questions-heading"
                        >
                            Questions
                        </h1>
                        <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
                            Explore the key ideas in this document.
                        </p>
                    </div>
                    <QuestionPanel
                        documentId={document.id}
                        initialQuestions={document.questions}
                        onGenerate={generateQuestionsForDocument}
                        onSubmit={submitQuestionsForDocument}
                    />
                </section>
            </main>
        </div>
    );
}
