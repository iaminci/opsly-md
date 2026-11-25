package main

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"golang.org/x/term"
)

// version is overridden at build time: go build -ldflags "-X main.version=1.2.3".
var version = "0.2.0"

const (
	maxAutoWidth  = 120
	fallbackWidth = 80
)

const help = `Usage: opslymd [options] [file ...]

Render Markdown files (.md, .markdown, .mdown, .mkd, .mdx) in the terminal.
Other files are printed unchanged, like cat. With no file, or when file is "-",
reads standard input as Markdown.

Options:
  -w, --width <n>   Wrap output at <n> columns (default: terminal width, max 120)
      --reveal      Show the contents of ` + "```secure" + ` blocks instead of masking them
      --color       Always use colors, even when output is piped
      --no-color    Never use colors
  -v, --version     Print version
  -h, --help        Print this help

Examples:
  opslymd README.md
  opslymd docs/setup.md docs/usage.md
  cat notes.md | opslymd
  opslymd --color README.md | less -R
`

type args struct {
	files  []string
	width  int // 0 = auto
	color  *bool
	reveal bool
}

func fail(message string) {
	fmt.Fprintf(os.Stderr, "opslymd: %s\nTry 'opslymd --help' for more information.\n", message)
	os.Exit(2)
}

func parseWidth(value string, ok bool) int {
	n, err := strconv.Atoi(value)
	if !ok || err != nil || n < 20 {
		fail(fmt.Sprintf("invalid width '%s' (expected an integer of at least 20)", value))
	}
	return n
}

func parseArgs(argv []string) args {
	var a args
	boolPtr := func(b bool) *bool { return &b }

	for i := 0; i < len(argv); i++ {
		arg := argv[i]
		switch {
		case arg == "--":
			a.files = append(a.files, argv[i+1:]...)
			return a
		case arg == "-" || !strings.HasPrefix(arg, "-"):
			a.files = append(a.files, arg)
		case arg == "-h" || arg == "--help":
			fmt.Print(help)
			os.Exit(0)
		case arg == "-v" || arg == "--version":
			fmt.Println(version)
			os.Exit(0)
		case arg == "-w" || arg == "--width":
			i++
			if i < len(argv) {
				a.width = parseWidth(argv[i], true)
			} else {
				a.width = parseWidth("", false)
			}
		case strings.HasPrefix(arg, "--width="):
			a.width = parseWidth(strings.TrimPrefix(arg, "--width="), true)
		case arg == "--reveal":
			a.reveal = true
		case arg == "--color":
			a.color = boolPtr(true)
		case arg == "--no-color":
			a.color = boolPtr(false)
		default:
			fail(fmt.Sprintf("unknown option '%s'", arg))
		}
	}
	return a
}

func shouldUseColor(flag *bool) bool {
	if flag != nil {
		return *flag
	}
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	if force, ok := os.LookupEnv("FORCE_COLOR"); ok && force != "" {
		return force != "0"
	}
	return term.IsTerminal(int(os.Stdout.Fd())) && os.Getenv("TERM") != "dumb"
}

func describeError(err error) string {
	switch {
	case errors.Is(err, fs.ErrNotExist):
		return "No such file or directory"
	case errors.Is(err, fs.ErrPermission):
		return "Permission denied"
	case errors.Is(err, syscall.EISDIR):
		return "Is a directory"
	}
	var pathErr *fs.PathError
	if errors.As(err, &pathErr) {
		return pathErr.Err.Error()
	}
	return err.Error()
}

func isMarkdown(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".md", ".markdown", ".mdown", ".mkd", ".mdx":
		return true
	}
	return false
}

func write(s string) {
	if _, err := io.WriteString(os.Stdout, s); err != nil {
		// Exit quietly when the reader goes away, e.g. `opslymd file.md | head`.
		if errors.Is(err, syscall.EPIPE) {
			os.Exit(0)
		}
		fmt.Fprintf(os.Stderr, "opslymd: %v\n", err)
		os.Exit(1)
	}
}

func main() {
	a := parseArgs(os.Args[1:])

	if len(a.files) == 0 {
		if term.IsTerminal(int(os.Stdin.Fd())) {
			fmt.Fprint(os.Stderr, help)
			os.Exit(2)
		}
		a.files = []string{"-"}
	}

	width := a.width
	if width == 0 {
		width = fallbackWidth
		if cols, _, err := term.GetSize(int(os.Stdout.Fd())); err == nil && cols > 0 {
			width = cols
		}
		if width > maxAutoWidth {
			width = maxAutoWidth
		}
	}
	opts := renderOptions{width: width, color: shouldUseColor(a.color), reveal: a.reveal}

	failed := false
	printed := 0
	for _, file := range a.files {
		var data []byte
		var err error
		if file == "-" {
			data, err = io.ReadAll(os.Stdin)
		} else {
			data, err = os.ReadFile(file)
		}
		if err != nil {
			fmt.Fprintf(os.Stderr, "opslymd: %s: %s\n", file, describeError(err))
			failed = true
			continue
		}

		// Only Markdown files are rendered; anything else is printed as-is, like cat.
		if file != "-" && !isMarkdown(file) {
			write(string(data))
			printed++
			continue
		}

		output := renderMarkdown(string(data), opts)
		// Styled output gets a blank line above it so it stands clear of the prompt;
		// plain (piped) output stays cat-like and only separates consecutive files.
		if output != "" && (opts.color || printed > 0) {
			write("\n")
		}
		if output != "" {
			write(output + "\n")
		}
		printed++
	}

	if failed {
		os.Exit(1)
	}
}
