# Opsly MD Preview — VS Code Extension

Preview `.md` files with the same rendering pipeline as [Opsly MD](https://md.opsly.dev):

- GitHub Flavored Markdown
- Syntax highlighting (highlight.js)
- LaTeX math (KaTeX)
- Mermaid diagrams
- Opsly secure code fences (`opsly-mask`)
- ASCII tree structure detection

## Requirements

- [VS Code](https://code.visualstudio.com/) 1.85 or newer
- [Node.js](https://nodejs.org/) 20.9+ and [pnpm](https://pnpm.io/) (for building from source)

## Usage

1. Open a Markdown file in VS Code.
2. Open the Opsly preview using one of:
   - **Command Palette** → `Opsly MD: Open Opsly MD Preview`
   - **Editor title bar** → preview icon (when a `.md` file is active)
   - **Explorer context menu** → Open Opsly MD Preview
   - **Keyboard shortcut** → `Cmd+Shift+O` (macOS) / `Ctrl+Shift+O` (Windows/Linux)
3. Or right-click a tab → **Reopen Editor With…** → **Opsly MD Preview**

The preview updates as you edit the file. Theme follows your VS Code color theme (light/dark). External links open in your default browser.

## Install from source

From the repository root:

```bash
pnpm install
cd vscode-extension
pnpm run build
pnpm run package
```

Install the generated `.vsix` in VS Code:

1. **Extensions** view → `…` menu → **Install from VSIX…**
2. Select `vscode-extension/opsly-md-0.1.0.vsix` (version may differ)

## Development

This extension lives in the monorepo workspace at `vscode-extension/`. Install dependencies once from the repo root:

```bash
pnpm install
```

Build the extension:

```bash
cd vscode-extension
pnpm run build
```

Press **F5** in VS Code with the `vscode-extension` folder open to launch an Extension Development Host.

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm run build` | Compile extension host, webview bundle, and CSS |
| `pnpm run watch` | Watch mode for all build targets |
| `pnpm run package` | Create a `.vsix` installable package |

Build output (`out/`, `media/`, `*.vsix`) is gitignored — run `pnpm run build` locally before debugging or packaging.

### Architecture

- **Extension host** (`src/`) — custom editor provider, file change sync, theme sync
- **Webview** (`webview/`) — React app importing `MarkdownRenderer` from the main app via esbuild alias
- **CSS** — Tailwind v4 + typography plugin, scoped to renderer components
- **Icons** — copied from `public/` favicons (`favicon-64.png`, `favicon.ico`, `apple-icon.png`)

## License

MIT — see [LICENSE.md](./LICENSE.md).
