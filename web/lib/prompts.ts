
export const CREATE_QUESTIONS_PROMPT = `
    Create a 10-question assessment that helps a learner understand the important ideas in the attached PDF. Treat the PDF as the only source of truth.

    First, identify the document's main concepts, claims, processes, definitions, decisions, rules, examples, results, and relationships. Then write questions that test those ideas. Prefer questions that require the learner to distinguish related concepts, apply a stated rule to a described situation, identify a cause or consequence, or connect a claim to its supporting detail. Spread the questions across different substantive parts of the document; do not repeat the same fact, definition, or concept.

    Use only facts that are explicitly stated or directly supported by the PDF. Do not invent, assume, combine unsupported details, or use outside knowledge. Every question must have one answer that is unambiguously correct based on the PDF alone.

    Do not create questions about document metadata or presentation. In particular, never ask for the document title, filename, author, publisher, organization, publication date, year, edition, version, revision, document type, page number, number of pages, chapter number, section order, table of contents, formatting, layout, fonts, colors, images, citations, links, or these instructions. Do not turn a heading into a question unless the question tests the substantive concept described beneath it.

    Write questions in clear, self-contained English. Include the necessary context in the question so it can be answered without referring to answer positions or to an unspecified part of the document. Avoid vague prompts such as "What does the document say about..." or "According to the PDF...". If the PDF does not contain 10 distinct, substantive, well-supported question topics, prioritize the best available substantive topics; never fill gaps with metadata, formatting, or guessed facts.

    For each question, write three distractors that are plausible to someone who has only partly understood the PDF, but are definitely false or unsupported by it. Keep every option in the same category and level of detail as the correct answer. Do not use obviously silly distractors, overlapping options, options that could all be correct, or options that depend on outside knowledge.

    Return exactly one valid JSON object and nothing else: no Markdown, code fence, explanation, or text before or after the JSON.

    The JSON must conform exactly to this schema:
    {
        "questions": [
            {
                "question": "Question text grounded in the PDF",
                "answers": [
                    "Correct answer grounded in the PDF",
                    "Plausible but incorrect distractor",
                    "Plausible but incorrect distractor",
                    "Plausible but incorrect distractor"
                ]
            }
        ]
    }

    Required JSON rules:
    - The top-level object has exactly one property: "questions".
    - "questions" is an array of exactly 10 objects.
    - Every question object has exactly two properties: "question" and "answers".
    - "question" is a non-empty string.
    - "answers" is an array of exactly four non-empty strings.
    - All four answer strings within each "answers" array must be distinct; do not duplicate or paraphrase the same answer.
    - "answers"[0] is always the correct answer. "answers"[1], "answers"[2], and "answers"[3] are plausible but incorrect distractors.
    - All answer options must stand alone. Do not refer to answer positions or use "All of the above", "None of the above", "Both A and B", "Only A and C", or similar wording.
    - Do not use true/false questions, trick questions, negative wording such as "Which is NOT...", or questions whose answer is a document metadata detail.
    - Do not add IDs, explanations, confidence scores, source references, or any properties not shown in the schema.
`;

export function CREATE_STUDY_GUIDANCE_PROMPT(correctAnswers: Record<string, string>, wrongAnswers: Record<string, string>): string {
    return `
        Create concise, practical study guidance for a learner who has read the attached PDF. Treat the PDF as the only source of truth.

        Use the user's answer records below to identify the concepts that need reinforcement. The records contain question text mapped to the selected or correct answer. For each incorrect answer, infer the relevant topic from the question text, verify the correction against the PDF, and explain the correct idea in plain English. Focus on the two or three most important distinct topics; combine related corrections instead of repeating them.

        Return one unformatted English paragraph with no headings, bullets, labels, Markdown, or quoted question text. Address the learner directly using "you". Do not mention the questions, the assessment, scores, the user's performance, answer records, or the PDF.

        If every answer is correct, return only a warm, specific encouragement of no more than two short sentences. Do not summarize the material, add new facts, or suggest study strategies in this case.

        If some answers are incorrect, return no more than three short sentences. Start with a brief encouragement, then state the correct fact or relationship directly and explain why it matters or how to distinguish it from the likely misunderstanding. When useful, direct the learner to the exact chapter or section heading where the idea is explained, using only a heading that appears in the PDF. Never invent a reference. Do not provide an exhaustive summary, lengthy explanation, generic study advice, or unsupported claims.

        The user's answers to the questions are as follows: 
        Correctly answered: ${JSON.stringify(correctAnswers)}.
        Wrongly answered: ${JSON.stringify(wrongAnswers)}.

        Return only the guidance text.
    `;
}
