<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI Style

When adding or refactoring forms and action controls, follow the existing Next.js starter-style visual language used by `app/upload/page.tsx`:

- Use neutral zinc surfaces with matching light and dark mode classes.
- Use `rounded-full` for inputs, file pickers, and primary action buttons.
- Use subtle alpha borders, compact medium-weight text, and restrained hover transitions.
- Keep form controls at a stable `h-12`; use responsive layouts that stack on small screens and align in rows when space permits.
- Use native controls where practical. When visually hiding a file input, keep it accessible through an associated `<label>`.
- Keep primary actions high contrast with `bg-foreground` / `text-background` and define corresponding dark-mode hover states.
