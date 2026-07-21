# Contributing to Opsly MD

Thanks for taking the time to contribute to Opsly MD.

The goal of this project is to improve the experience of reading and using markdown documentation during real development workflows.

Please keep contributions focused, practical, and aligned with the local-first philosophy of the project.

---

## Development Setup

Clone the repository:

```bash
git clone https://github.com/iaminci/opsly-md.git
cd opsly-md
```

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

### VS Code extension

The preview extension lives in `vscode-extension/`. From the repo root:

```bash
pnpm install
cd vscode-extension
pnpm run build
```

See [`vscode-extension/README.md`](vscode-extension/README.md) for usage, packaging, and F5 debugging.

---

## Before Submitting Changes

Please ensure the following pass before opening a PR:

```bash
pnpm lint
pnpm build
```

If applicable:
- test markdown rendering behavior
- verify responsive layouts
- verify copy-to-clipboard interactions
- verify Mermaid/math rendering

For changes under `vscode-extension/`:

```bash
cd vscode-extension
pnpm run build
```

---

## Pull Request Guidelines

- Keep PRs focused and scoped
- Avoid unrelated refactors
- Write clear commit messages
- Explain the problem being solved
- Include screenshots for UI changes when possible

---

## Reporting Issues

When opening issues, please include:
- browser and OS information
- reproduction steps
- expected behavior
- screenshots if relevant

---

## Philosophy

Opsly MD is intentionally designed to stay:
- local-first
- lightweight
- workflow-focused
- practical over flashy

Please avoid introducing unnecessary complexity or features that conflict with those goals.