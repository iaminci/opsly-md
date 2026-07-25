# Opsly MD Preview

Preview Markdown files with the same rendering as [Opsly MD](https://md.opsly.dev) — a local-first workspace for notes and documentation.

## Why use it?

The built-in Markdown preview is fine for basics. Opsly MD Preview is for documents that go further: math, diagrams, styled code blocks, secure fences, and the same Geist prose surface you get in the web app.

Everything renders in a custom editor that updates as you type and follows your editor theme (light, dark, or high-contrast).

## Features

- **GitHub Flavored Markdown** — tables, task lists, strikethrough, autolinks
- **Syntax highlighting** — fenced code blocks with language labels and copy
- **LaTeX math** — inline and display equations via KaTeX
- **Mermaid diagrams** — flowcharts, sequence diagrams, and more
- **Secure code fences** — masked content with reveal and copy (`opsly-mask`)
- **ASCII tree blocks** — directory-style trees rendered as monospace code
- **Heading anchors** — permalink icons on headings for deep links
- **External link icons** — clear affordance for links that open in the browser
- **Live preview** — updates on every edit
- **Theme sync** — light, dark, and high-contrast follow your color theme

## Usage

1. Open a Markdown file (`.md`).
2. Open the Opsly preview using one of:
   - **Command Palette** → `Opsly MD: Open Opsly MD Preview`
   - **Editor title bar** → preview icon (when a `.md` file is active)
   - **Explorer context menu** → Open Opsly MD Preview
   - **Keyboard shortcut** → `Cmd+Shift+O` (macOS) / `Ctrl+Shift+O` (Windows/Linux)
3. Or right-click a tab → **Reopen Editor With…** → **Opsly MD Preview**

The preview updates as you edit. External `http`/`https` links open in your default browser. Anchor links (`#section`) work inside the preview.

## Install

Install from your editor's extension marketplace, or build a `.vsix` from the repository — see the [main README](../README.md#extension) for development and packaging instructions.

## Links

- **Web app:** https://md.opsly.dev
- **Repository:** https://github.com/iaminci/opsly-md
- **Issues:** https://github.com/iaminci/opsly-md/issues

## License

MIT — see [LICENSE.md](./LICENSE.md).
