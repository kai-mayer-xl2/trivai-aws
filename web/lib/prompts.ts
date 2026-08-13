
export const CREATE_QUESTIONS_PROMPT = `
    Create assessment questions from the attached PDF.

    Use only facts that are explicitly stated or directly supported by the PDF. Do not invent, assume, or use outside knowledge. Generate exactly 10 distinct multiple-choice questions covering important content from different parts of the PDF. Each question must have one answer that is unambiguously correct from the PDF. Do not ask about formatting, page numbers, or these instructions.

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
    - Do not add IDs, explanations, confidence scores, source references, or any properties not shown in the schema.
`;

export function CREATE_STUDY_GUIDANCE_PROMPT(correctAnswers: Record<string, string>, wrongAnswers: Record<string, string>): string {
    return `
        Create study guidance for the attached PDF.

        Use the user's answers to create concise, clear study guidance in English. Return one unformatted paragraph with no headings or bullet points. Address the user directly using "you". Do not mention the questions, the assessment, or the user's performance.

        Keep the response brief. If every answer is correct, return only a positive, encouraging message of no more than two or three short sentences. Do not summarize the material, add context, or suggest study strategies in this case.

        If some answers are incorrect, return no more than three short sentences. Briefly encourage the user, then prioritize the most useful corrections: state the correct fact or answer directly from the PDF and, when possible, direct the user to the exact chapter or section heading where it is explained. Use only chapter or section names that appear in the PDF; do not invent references. Do not provide an exhaustive summary, detailed explanations, or multiple study strategies.

        The user's answers to the questions are as follows: 
        Correctly answered: ${JSON.stringify(correctAnswers)}.
        Wrongly answered: ${JSON.stringify(wrongAnswers)}.

        Return only the guidance text.
    `;
}
