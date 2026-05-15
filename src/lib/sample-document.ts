export const SAMPLE_MARKDOWN = `# Welcome to Opsly MD

A minimal viewer that supports **tables**, \`inline code\`, code blocks, masked \`secure\` fences, math, and Mermaid diagrams.

## Features

| Feature | Supported |
|---------|-----------|
| \`Tables\` | GFM tables |
| Code blocks | Syntax highlighting |
| \`secure\` fences | Masked until revealed (example below) |
| LaTeX | Inline and block math |
| Mermaid | Flowcharts, diagrams |

## Try Code

\`\`\`bash
echo "Hello, Markdown!"
\`\`\`

## Opsly Mask: Secure fence (Experimental Feature)

Use a \`secure\` language tag for values you want masked by default—hover to copy, or use the eye control to reveal:

\`\`\`secure
password=example@123
api_key: AKtWVlxeYcVjZlFHOWnKZuVxEUjXggDf
\`\`\`

## Math Example

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
`;
