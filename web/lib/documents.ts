"use server";

export type DocumentQuestion = {
    id: string;
    question: string;
    answers: string[];
};

export type DocumentRecord = {
    id: string;
    title: string;
    url: string;
    questions: DocumentQuestion[];
};

export async function getDocumentById(id: string): Promise<DocumentRecord> {
    return {
        id,
        title: "Document title",
        url: `/documents/${id}/file`,
        questions: [],
    };
}

export async function generateQuestionsForDocument(
    documentId: string,
): Promise<DocumentQuestion[]> {
    void documentId;
    await new Promise((resolve) => setTimeout(resolve, 2000));


    return [
        {
            id: "1",
            question: "What is the main topic of the document?",
            answers: [
                "Its central subject and purpose",
                "The document's publication history",
                "The author's personal biography",
                "A list of unrelated references",
            ],
        },
        {
            id: "2",
            question: "Which idea is most important to remember?",
            answers: [
                "The supporting example",
                "The main argument",
                "The document's page count",
                "The formatting choices",
            ],
        },
        {
            id: "3",
            question: "How does the document support its main idea?",
            answers: [
                "With evidence and explanations",
                "With decorative headings only",
                "By avoiding any examples",
                "By repeating the title",
            ],
        },
        {
            id: "4",
            question: "What should you review more closely?",
            answers: [
                "The concepts you found least clear",
                "Only the introduction",
                "The document's file name",
                "Nothing beyond the summary",
            ],
        },
    ];
}

export async function submitQuestionsForDocument(
    documentId: string,
    answers: Record<string, number>,
): Promise<string> {
    void documentId;
    void answers;

    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "Review the document's main argument, the evidence supporting it, and any concepts you found difficult while answering. Revisit those sections and summarize them in your own words.";
}