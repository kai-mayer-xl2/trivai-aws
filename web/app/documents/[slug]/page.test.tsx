import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/documents", () => ({
    generateQuestionsForDocument: vi.fn(),
    getDocumentById: vi.fn().mockResolvedValue({
        id: "document-123",
        title: "Guide.pdf",
        url: "https://signed.example/document.pdf",
        questions: [],
    }),
    submitQuestionsForDocument: vi.fn(),
}));

vi.mock("./question-panel", () => ({
    QuestionPanel: () => <div data-testid="question-panel" />,
}));

import DocumentPage from "./page";

describe("DocumentPage", () => {
    it("renders the signed document URL as an accessible new-tab link", async () => {
        render(await DocumentPage({ params: Promise.resolve({ slug: "document-123" }) }));

        const link = screen.getByRole("link", {
            name: "Guide.pdf (opens in a new tab)",
        });

        expect(link).toHaveAttribute("href", "https://signed.example/document.pdf");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noreferrer");
        expect(link).toHaveTextContent("Guide.pdf");
    });
});