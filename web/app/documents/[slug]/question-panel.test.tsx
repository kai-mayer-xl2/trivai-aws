import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuestionPanel } from "./question-panel";

describe("QuestionPanel streaming guidance", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("renders partial guidance and clears it when cancelled", async () => {
        let wasCancelled = false;
        const reader = {
            read: vi.fn()
                .mockResolvedValueOnce({
                    done: false,
                    value: new TextEncoder().encode(`${JSON.stringify({ type: "text", value: "First part." })}\n`),
                })
                .mockReturnValue(new Promise(() => {})),
            cancel: vi.fn().mockImplementation(() => {
                wasCancelled = true;
            }),
        };
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            body: { getReader: () => reader },
        } as unknown as Response);

        render(
            <QuestionPanel
                documentId="doc-123"
                initialQuestions={[{
                    question: "What is the correct answer?",
                    answers: ["Correct", "Wrong one", "Wrong two", "Wrong three"],
                }]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /What is the correct answer/ }));
        fireEvent.click(screen.getByRole("button", { name: /Correct$/ }));
        fireEvent.click(screen.getByRole("button", { name: "Get Study Guidance" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            "/api/documents/doc-123/guidance",
            expect.objectContaining({ method: "POST" }),
        ));
        await waitFor(() => expect(screen.getByText("First part.")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        await waitFor(() => expect(screen.queryByText("First part.")).not.toBeInTheDocument());
        expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(wasCancelled).toBe(true);
    });
});