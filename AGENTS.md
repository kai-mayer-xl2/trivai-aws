# TrivAI Agent Guide

## Purpose and Working Principles

TrivAI is a demonstration application for turning a PDF into a focused multiple-choice assessment and PDF-grounded study guidance. It is a real end-to-end demonstration, not a collection of shortcuts: prefer complete, understandable implementations that prove the intended architecture and user flow.

Do not add a workaround solely to make a command, test, or UI appear to work. In particular, do not replace AWS or Bedrock behavior with hidden mock paths, weaken validation, bypass authorization, silently swallow failures, or hard-code results unless the issue explicitly calls for a local test double. Keep the scope proportionate to a demonstration project; do not add production complexity that does not support a stated requirement.

When the repository, issue, or acceptance criteria leave a product, technical, AWS, or security decision ambiguous, stop and ask the user. Do not assume the desired behavior, data model, AWS service choice, deployment configuration, or migration strategy.

## Repository Layout

- `web/` is the Next.js 16 application. It uses React server actions, S3 for PDF storage, and Amazon Bedrock Converse for question generation and study guidance.
- `infrastructure/` is the AWS CDK TypeScript application that deploys the web app and its AWS resources.
- `.vscode/mcp.json` configures the GitHub MCP server. Use this MCP server for GitHub issues, pull requests, branches, and repository information; do not substitute GitHub CLI or direct GitHub API calls.

Each directory has its own `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`. Run package commands from the owning directory, using pnpm.

## Current Product Contracts

- Uploaded PDFs are limited to 1 MiB and stored in S3 under `documents/<uuid>.pdf`.
- Question generation uses `eu.amazon.nova-pro-v1:0` through Bedrock and must rely only on the uploaded PDF. The model returns exactly 10 multiple-choice questions and JSON only.
- The generated `answers` array has a canonical contract: index `0` is correct. The client shuffles rendered choices, so preserve the correct-answer mapping whenever changing the question or quiz UI.
- Study guidance is also grounded only in the PDF and receives the submitted answer records.
- There is currently no durable persistence for generated question sets or quiz attempts, and no authentication. Treat the existing GitHub issues as the source of truth for the planned behavior; do not implement a neighboring issue incidentally.

Current open issues include durable DynamoDB-backed question sets and attempts, per-question answer feedback, optional Cognito authentication, and asynchronous Bedrock workflows. Read the relevant issue and its comments through the GitHub MCP before starting work. Confirm scope with the user when issues depend on each other or do not specify a design choice.

## GitHub Workflow

Use the GitHub MCP configured in `.vscode/mcp.json` for all GitHub operations. It runs the official GitHub MCP server in Docker and prompts for a personal access token through VS Code.

Before creating an issue, search open issues for duplicates. Before changing an issue, read its description, labels, comments, and related work. Keep issue updates and pull-request descriptions tied to observable behavior, tests, and deployment impact. Before creating a pull request, inspect the repository for a pull-request template and use it when present.

## Web Application

### Next.js Compatibility

This is not necessarily the Next.js version assumed by model training. Before editing Next.js behavior, read the relevant guide under `web/node_modules/next/dist/docs/` and follow its deprecation notices.

`web/next.config.ts` uses standalone output for Lambda packaging and configures server-action request limits and CloudFront origins. Keep that deployment contract in mind when changing server actions, request sizes, or runtime behavior.

### UI Style

When adding or refactoring forms and action controls, follow the existing visual language in `web/app/upload/page.tsx`:

- Use neutral zinc surfaces with matching light and dark mode classes.
- Use `rounded-full` for inputs, file pickers, and primary action buttons.
- Use subtle alpha borders, compact medium-weight text, and restrained hover transitions.
- Keep form controls at a stable `h-12`; use responsive layouts that stack on small screens and align in rows when space permits.
- Use native controls where practical. When visually hiding a file input, keep it accessible through an associated `<label>`.
- Keep primary actions high contrast with `bg-foreground` and `text-background`, with matching dark-mode hover states.

### Web Commands

Run these from `web/`:

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

Run `pnpm lint` for relevant source changes and `pnpm build` for changes that can affect the production Lambda package. The web project currently has no committed automated test files; add focused tests when adding logic whose behavior can be tested independently.

## Infrastructure and Deployment

The CDK entrypoint creates the `dev` stage in `eu-west-1` with stack ID `trivai-app-stack`. It provisions:

- An S3 bucket for public assets and uploaded documents. It is destroyed and emptied when the demonstration stack is destroyed.
- A bucket deployment that copies `web/public` to the `public` key prefix.
- An ARM64 Docker-image Lambda built from `web/Dockerfile`, with `ASSETS_BUCKET_NAME` injected and S3 read/write plus Bedrock invoke permissions.
- API Gateway, though CloudFront currently reaches the Lambda Function URL directly because API Gateway has a shorter timeout.
- A CloudFront distribution that sends app requests to the Function URL and `/assets/*` to the S3 bucket.

Changes to `web/` can change the Docker image built by CDK. Changes to assets, Lambda environment variables, IAM permissions, CloudFront behavior, request sizes, or AWS resources must be reviewed as infrastructure changes, not patched around in application code.

Run these from `infrastructure/`:

```bash
pnpm build
pnpm test
pnpm cdk synth
pnpm cdk diff
pnpm cdk deploy
```

Use `pnpm cdk synth` to validate CloudFormation generation and `pnpm cdk diff` to inspect the intended AWS change before `pnpm cdk deploy`. Deploy only with explicit user intent and AWS credentials for the target account. Record or report the resulting `DistributionDomainName` output so the deployed demonstration can be exercised.

The infrastructure Jest configuration expects tests under `infrastructure/test/**/*.test.ts`; none are currently committed. Add focused CDK assertions for new or materially changed resources, permissions, environment variables, or CloudFront behavior.

## Change and Validation Workflow

1. Read the relevant code, configuration, GitHub issue, and nearby tests before changing behavior.
2. State the smallest falsifiable hypothesis and make the narrowest implementation that satisfies the issue's acceptance criteria.
3. Run the focused validation for the changed area: web lint/build, infrastructure build/test/synth/diff, and targeted tests where they exist.
4. For user-facing changes, exercise the affected flow locally. For deployment changes, inspect the CDK diff before any deploy and verify the deployed flow only after an explicit deployment request.
5. Report changed files, validation performed, unrun checks, and any unresolved product decisions. Do not claim tests or deployment succeeded unless they actually ran.