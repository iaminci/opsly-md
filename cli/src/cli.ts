import { readFileSync } from "node:fs";
import { renderMarkdown } from "./render";

declare const __OPSLY_CLI_VERSION__: string;

const MAX_AUTO_WIDTH = 120;
const FALLBACK_WIDTH = 80;

const HELP = `Usage: opslymd [options] [file ...]

Render Markdown files in the terminal. With no file, or when file is "-",
reads standard input.

Options:
  -w, --width <n>   Wrap output at <n> columns (default: terminal width, max ${MAX_AUTO_WIDTH})
      --reveal      Show the contents of \`\`\`secure blocks instead of masking them
      --color       Always use colors, even when output is piped
      --no-color    Never use colors
  -v, --version     Print version
  -h, --help        Print this help

Examples:
  opslymd README.md
  opslymd docs/setup.md docs/usage.md
  cat notes.md | opslymd
  opslymd --color README.md | less -R
`;

interface Args {
  files: string[];
  width: number | null;
  color: boolean | null;
  reveal: boolean;
}

function fail(message: string): never {
  process.stderr.write(`opslymd: ${message}\nTry 'opslymd --help' for more information.\n`);
  process.exit(2);
}

function parseWidth(value: string | undefined): number {
  const n = Number(value);
  if (value === undefined || !Number.isInteger(n) || n < 20) {
    fail(`invalid width '${value ?? ""}' (expected an integer of at least 20)`);
  }
  return n;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { files: [], width: null, color: null, reveal: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--") {
      args.files.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "-" || !arg.startsWith("-")) {
      args.files.push(arg);
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(HELP);
      process.exit(0);
    } else if (arg === "-v" || arg === "--version") {
      process.stdout.write(`${__OPSLY_CLI_VERSION__}\n`);
      process.exit(0);
    } else if (arg === "-w" || arg === "--width") {
      args.width = parseWidth(argv[++i]);
    } else if (arg.startsWith("--width=")) {
      args.width = parseWidth(arg.slice("--width=".length));
    } else if (arg === "--reveal") {
      args.reveal = true;
    } else if (arg === "--color") {
      args.color = true;
    } else if (arg === "--no-color") {
      args.color = false;
    } else {
      fail(`unknown option '${arg}'`);
    }
  }

  return args;
}

function shouldUseColor(flag: boolean | null): boolean {
  if (flag !== null) return flag;
  if (process.env.NO_COLOR) return false;
  const force = process.env.FORCE_COLOR;
  if (force !== undefined && force !== "") return force !== "0";
  return Boolean(process.stdout.isTTY) && process.env.TERM !== "dumb";
}

function describeError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (code === "ENOENT") return "No such file or directory";
  if (code === "EISDIR") return "Is a directory";
  if (code === "EACCES") return "Permission denied";
  return error instanceof Error ? error.message : String(error);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.files.length === 0) {
    if (process.stdin.isTTY) {
      process.stderr.write(HELP);
      process.exit(2);
    }
    args.files.push("-");
  }

  // Exit quietly when the reader goes away, e.g. `opslymd file.md | head`.
  process.stdout.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE") process.exit(0);
    throw error;
  });

  const options = {
    width: args.width ?? Math.min(process.stdout.columns || FALLBACK_WIDTH, MAX_AUTO_WIDTH),
    color: shouldUseColor(args.color),
    reveal: args.reveal,
  };

  let failed = false;
  let printed = 0;

  for (const file of args.files) {
    let source: string;
    try {
      source = readFileSync(file === "-" ? 0 : file, "utf8");
    } catch (error) {
      process.stderr.write(`opslymd: ${file}: ${describeError(error)}\n`);
      failed = true;
      continue;
    }

    const output = renderMarkdown(source, options);
    // Styled output gets a blank line above it so it stands clear of the prompt;
    // plain (piped) output stays cat-like and only separates consecutive files.
    if (output !== "" && (options.color || printed > 0)) process.stdout.write("\n");
    process.stdout.write(output === "" ? "" : `${output}\n`);
    printed++;
  }

  process.exitCode = failed ? 1 : 0;
}

main();
