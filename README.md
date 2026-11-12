# Opsly MD

Local-first Markdown workspaces that run entirely in your browser.

No accounts. No servers. No tracking.

Your notes, documentation, and knowledge base stay on your device.

## Features

### Organize

* Workspaces and folders
* Nested document organization
* Fast navigation between documents
* Import and export your data anytime

### Search

* Search across your entire workspace
* Section-aware search results
* See exactly where matches live before opening a document
* Jump directly to matching content

### Retrieve

* Find relevant information across your documentation
* Surface the sections that answer your question
* Navigate directly to the source content

### Write

* GitHub Flavored Markdown
* Syntax highlighting
* LaTeX (KaTeX)
* Mermaid diagrams

### Secure

* Passphrase-protected document encryption
* Unlock, export, and remove encryption from the document security menu
* Opsly secure code fences for sensitive inline content

## Why Opsly MD?

Most documentation tools require:

* Accounts
* Cloud storage
* Subscription plans
* Vendor lock-in

Opsly MD keeps things simple.

Open the app and start writing.

Your data never leaves your browser unless you choose to export it.

## Example

```bash
kubectl apply -f deployment.yaml
```

Inline math:

$a^2 + b^2 = c^2$

Mermaid diagrams:

```mermaid
graph TD
    A[Write] --> B[Organize]
    B --> C[Search]
    C --> D[Retrieve]
```

## Philosophy

* Local-first
* Privacy by default
* No lock-in
* Fast and simple tools
* Your data belongs to you

## Get Started

* Open App: https://md.opsly.dev
* GitHub: https://github.com/iaminci/opsly-md

## Extension

Preview `.md` files with the same rendering pipeline as the web app — GFM, syntax highlighting, KaTeX, Mermaid, and Opsly secure code fences.

See [`vscode-extension/README.md`](vscode-extension/README.md) for usage and feature overview.

### Development

The extension lives in `vscode-extension/` and reuses the main app's `MarkdownRenderer` via an esbuild alias — no duplicate rendering logic.

**Requirements:** Node.js 20.9+, pnpm, editor 1.85+

From the repository root:

```bash
pnpm install
cd vscode-extension
pnpm run build
```

Press **F5** with the `vscode-extension` folder open to launch an Extension Development Host.

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm run build` | Compile extension host, webview bundle, and CSS |
| `pnpm run watch` | Watch mode for all build targets |
| `pnpm run package` | Create a `.vsix` installable package |

Build output (`out/`, `media/`, `*.vsix`) is gitignored — run `pnpm run build` locally before debugging or packaging.

### Install from VSIX

```bash
cd vscode-extension
pnpm run build
pnpm run package
```

Then: **Extensions** → `…` menu → **Install from VSIX…** → select `vscode-extension/opsly-md-0.2.0.vsix` (version may differ).

### Architecture

- **Extension host** (`src/`) — custom editor provider, file change sync, theme sync
- **Webview** (`webview/`) — React app importing `MarkdownRenderer` from the main app
- **CSS** — Tailwind v4 + shared `markdown-prose.css`, Geist fonts copied into `media/fonts/`

## Terminal

Render `.md` files straight in your terminal — like `cat`, but formatted.

```bash
opslymd README.md
```

Headings, lists, tables, task lists, blockquotes, links, and syntax-highlighted code blocks are drawn with colors and box characters. Opsly secure code fences stay masked unless you pass `--reveal`.

### Install

**Requirements:** Node.js 20.9+, pnpm

From the repository root:

```bash
pnpm install
pnpm cli:build
npm install -g ./cli
```

### Usage

| Command | Description |
|---------|-------------|
| `opslymd file.md` | Render a file |
| `opslymd a.md b.md` | Render several files in order |
| `cat file.md \| opslymd` | Render standard input |
| `opslymd --width 80 file.md` | Wrap at 80 columns (default: terminal width, max 120) |
| `opslymd --reveal file.md` | Show the contents of secure fences |
| `opslymd --color file.md \| less -R` | Keep colors when piping into a pager |

Colors are turned off automatically when output is piped or `NO_COLOR` is set.

### Architecture

The CLI lives in `cli/` and is bundled to a single file with esbuild. It parses with the same remark plugins as the web app (GFM, math, tree structures, pretty JSON) and renders the result as ANSI text instead of HTML.
