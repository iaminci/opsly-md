package main

import (
	"path/filepath"
	"regexp"
	"strings"

	"github.com/alecthomas/chroma/v2"
	"github.com/alecthomas/chroma/v2/lexers"
)

// styleForToken maps a chroma token to a terminal style (16-colour palette, so the
// user's terminal theme applies).
func styleForToken(t chroma.TokenType) Style {
	switch {
	case t == chroma.KeywordType, t == chroma.KeywordConstant:
		return Style{Fg: "33"}
	case t.InCategory(chroma.Keyword):
		return Style{Fg: "35"}
	case t == chroma.NameBuiltin, t == chroma.NameBuiltinPseudo, t == chroma.NameAttribute, t == chroma.NameProperty:
		return Style{Fg: "36"}
	case t == chroma.NameFunction, t == chroma.NameTag, t == chroma.NameNamespace:
		return Style{Fg: "34"}
	case t == chroma.NameClass, t == chroma.NameConstant:
		return Style{Fg: "33"}
	case t == chroma.NameVariable, t.InSubCategory(chroma.NameVariable):
		return Style{Fg: "31"}
	case t == chroma.NameDecorator:
		return Style{Fg: "90"}
	case t == chroma.LiteralStringRegex:
		return Style{Fg: "31"}
	case t.InCategory(chroma.LiteralString):
		return Style{Fg: "32"}
	case t.InCategory(chroma.LiteralNumber):
		return Style{Fg: "33"}
	case t.InCategory(chroma.Comment):
		if t == chroma.CommentPreproc || t == chroma.CommentPreprocFile {
			return Style{Fg: "90"}
		}
		return Style{Fg: "90", Italic: true}
	case t.InCategory(chroma.Operator):
		return Style{Fg: "37"}
	case t == chroma.GenericInserted:
		return Style{Fg: "32"}
	case t == chroma.GenericDeleted:
		return Style{Fg: "31"}
	case t == chroma.GenericHeading, t == chroma.GenericSubheading:
		return Style{Fg: "34", Bold: true}
	case t == chroma.GenericEmph:
		return Style{Italic: true}
	case t == chroma.GenericStrong:
		return Style{Bold: true}
	}
	return Style{}
}

func plainLines(code string) []Line {
	var out []Line
	for _, l := range strings.Split(code, "\n") {
		out = append(out, Line{span(l)})
	}
	return out
}

// highlightCode returns one styled line per source line. Unknown or missing
// languages are returned unstyled (no auto-detection, matching the web renderer).
func highlightCode(code, lang string) []Line {
	lang = strings.ToLower(lang)
	if lang == "" {
		return plainLines(code)
	}
	lexer := lexers.Get(lang)
	if lexer == nil {
		return plainLines(code)
	}
	iterator, err := chroma.Coalesce(lexer).Tokenise(nil, code)
	if err != nil {
		return plainLines(code)
	}

	lines := []Line{{}}
	for _, tok := range iterator.Tokens() {
		style := styleForToken(tok.Type)
		for i, part := range strings.Split(strings.TrimSuffix(tok.Value, "\r"), "\n") {
			if i > 0 {
				lines = append(lines, Line{})
			}
			if part != "" {
				lines[len(lines)-1] = append(lines[len(lines)-1], span(part, style))
			}
		}
	}
	// Lexers append a trailing newline; drop the phantom empty line it creates.
	if n := len(lines); n > 1 && len(lines[n-1]) == 0 && !strings.HasSuffix(code, "\n") {
		lines = lines[:n-1]
	}
	return lines
}

var fileControlChars = regexp.MustCompile("[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]")

// highlightFile colours a non-Markdown file for display, keeping its text byte-for-byte
// (tabs and all) apart from stripping control characters that could drive the terminal.
// ok is false when no lexer matches the file name, so callers can print it unchanged.
func highlightFile(path string, data []byte) (out string, ok bool) {
	lexer := lexers.Match(filepath.Base(path))
	if lexer == nil {
		return "", false
	}
	source := string(data)
	iterator, err := chroma.Coalesce(lexer).Tokenise(nil, source)
	if err != nil {
		return "", false
	}

	var b strings.Builder
	for _, tok := range iterator.Tokens() {
		value := fileControlChars.ReplaceAllString(tok.Value, "")
		style := styleForToken(tok.Type)
		// Colour each line separately so a pager or `head` never cuts a style mid-run.
		for i, part := range strings.Split(value, "\n") {
			if i > 0 {
				b.WriteString("\n")
			}
			if part == "" {
				continue
			}
			b.WriteString(serialize(Line{{Text: part, Style: style}}, true))
		}
	}
	result := b.String()
	// Lexers append a newline when the source lacks one; restore the original ending.
	if !strings.HasSuffix(source, "\n") {
		result = strings.TrimSuffix(result, "\n")
	}
	return result, true
}
