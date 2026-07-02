export const HOME_MARKDOWN_PREVIEW = `# Opsly MD Renderer

| Feature | Supported |
|----------|----------|
| Tables | ✓ |
| Code | ✓ |
| Math | ✓ |
| Mermaid | ✓ |
| Secure | ✓ |

## Tasks

- [x] Render markdown
- [x] Syntax highlighting
- [ ] Write documentation

## Code

\`\`\`typescript
const app = "Opsly MD";
\`\`\`

## Math

$$
a^2 + b^2 = c^2
$$

## Diagram

\`\`\`mermaid
flowchart LR
  A[Write] --> B[Render]
  B --> C[Preview]
\`\`\`

## Secure

\`\`\`secure
api_key=AKtWVlxeYcVjZlFHOWnKZuVxEUjXggDf
\`\`\`
`;

export const SAMPLE_MARKDOWN = `# Welcome to Opsly MD

A local-first Markdown workspace with **GFM**, syntax highlighting, \`secure\` fences, math, Mermaid, and more.

## Features

| Feature | Supported |
|---------|-----------|
| GFM tables | Yes |
| Task lists & strikethrough | Yes |
| Code blocks | Syntax highlighting + copy |
| \`secure\` fences | Masked until revealed |
| JSON blocks | Auto-formatted when valid |
| ASCII trees | Rendered as monospace blocks |
| LaTeX | Inline and block math |
| Mermaid | Flowcharts and diagrams |
| Links & images | Yes |
| Blockquotes | Caution callout styling |

## Typography

**Bold text**, *italic text*, ~~strikethrough~~, and \`inline code\` all render inline.

## Links

Manual link: [Opsly MD on GitHub](https://github.com/iaminci/opsly-md)

Autolink: https://github.com/iaminci/opsly-md

## Lists

Unordered:

- Plain markdown
- Live preview
- Local-first storage

Ordered:

1. Write a note
2. Organize into folders
3. Find it later

Task list:

- [x] Explore the sample document
- [ ] Create your first note
- [ ] Try a \`secure\` fence for secrets

## Caution blockquote

> Rotating credentials regularly limits blast radius if a secret is exposed.

## Code blocks

\`\`\`bash
echo "Hello, Markdown!"
\`\`\`

\`\`\`typescript
type Note = { title: string; content: string };

export function summarize(note: Note): string {
  return note.title.trim() || "Untitled";
}
\`\`\`

Minified JSON is expanded automatically:

\`\`\`json
{"name":"opsly-md","features":["markdown","local-first"],"version":1}
\`\`\`

Fences without a language tag render as plain text:

\`\`\`
No language tag — still monospace with copy support.
\`\`\`

## Opsly Mask: Secure block

Use a \`secure\` language tag for values you want masked by default—hover to copy, or use the eye control to reveal:

\`\`\`secure
password=example@123
api_key: AKtWVlxeYcVjZlFHOWnKZuVxEUjXggDf
\`\`\`

## Project tree

ASCII directory trees are detected and rendered as code blocks:

project/
├── src/
│   ├── app/
│   └── lib/
└── package.json

## Math

Inline: \\(a^2 + b^2 = c^2\\)

Block:
$$
\\frac{1}{2} + \\frac{\\pi}{4}
$$

## Mermaid

\`\`\`mermaid
flowchart LR
  A[Start] --> B[Markdown]
  B --> C[Render]
  C --> D[View]
\`\`\`

## Images

![Opsly MD icon](/favicon-64.png)

---

### Heading level 3

Useful for nested sections and table-of-contents navigation.

#### Heading level 4

Smaller section labels inside longer documents.

##### Heading level 5

Fine-grained structure for deep notes.

###### Heading level 6

The smallest heading level supported.
`;
