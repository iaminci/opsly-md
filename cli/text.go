package main

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/mattn/go-runewidth"
)

// Style holds the visual attributes of a run of text. Fg and Bg are SGR colour
// parameters: a basic code ("33", "90") or an extended one such as "38;5;228".
type Style struct {
	Bold, Dim, Italic, Underline, Strike bool
	Fg, Bg                               string
	// Link is the target of an OSC 8 terminal hyperlink.
	Link string
}

type Span struct {
	Text  string
	Style Style
}

type Line []Span

const esc = "\x1b"

var controlChars = regexp.MustCompile("[\u0000-\u0008\u000b-\u001f\u007f-\u009f]")

// sanitize strips control characters so a document cannot smuggle its own escape
// sequences (cursor moves, title changes, clipboard writes) into the terminal.
func sanitize(text string) string {
	return controlChars.ReplaceAllString(strings.ReplaceAll(text, "\t", "    "), "")
}

func span(text string, style ...Style) Span {
	s := Style{}
	if len(style) > 0 {
		s = style[0]
	}
	return Span{Text: sanitize(text), Style: s}
}

func textWidth(text string) int { return runewidth.StringWidth(text) }

func lineWidth(line Line) int {
	total := 0
	for _, s := range line {
		total += textWidth(s.Text)
	}
	return total
}

// hardSplitFirst returns the longest prefix of text that fits in max columns
// (always at least one rune, so callers make progress).
func hardSplitFirst(text string, max int) string {
	w := 0
	for i, r := range text {
		rw := runewidth.RuneWidth(r)
		if w+rw > max && i > 0 {
			return text[:i]
		}
		w += rw
	}
	return text
}

var wrapSplit = regexp.MustCompile(`\n| +`)

// splitKeep splits on newlines and runs of spaces, keeping the separators.
func splitKeep(s string) []string {
	var out []string
	last := 0
	for _, loc := range wrapSplit.FindAllStringIndex(s, -1) {
		if loc[0] > last {
			out = append(out, s[last:loc[0]])
		}
		out = append(out, s[loc[0]:loc[1]])
		last = loc[1]
	}
	if last < len(s) {
		out = append(out, s[last:])
	}
	return out
}

// wrap word-wraps styled spans to max columns. A "\n" inside a span is a hard
// break; spaces are break opportunities and are dropped at line edges. Adjacent
// spans with no space between them form one word and are never separated.
func wrap(spans []Span, max int) []Line {
	limit := max
	if limit < 1 {
		limit = 1
	}
	var lines []Line
	var current Line
	currentWidth := 0
	var pendingSpace *Span
	var word []Span
	wordWidth := 0

	newLine := func() {
		lines = append(lines, current)
		current = nil
		currentWidth = 0
		pendingSpace = nil
	}

	commitWord := func() {
		if len(word) == 0 {
			return
		}
		spaceWidth := 0
		if pendingSpace != nil {
			spaceWidth = len(pendingSpace.Text)
		}
		if len(current) > 0 && currentWidth+spaceWidth+wordWidth > limit {
			newLine()
		}
		if pendingSpace != nil {
			current = append(current, *pendingSpace)
			currentWidth += len(pendingSpace.Text)
			pendingSpace = nil
		}
		if wordWidth <= limit {
			current = append(current, word...)
			currentWidth += wordWidth
		} else {
			// Too long for any line (a URL, say): fill lines rune by rune.
			for _, part := range word {
				rest := part.Text
				for rest != "" {
					if currentWidth >= limit {
						newLine()
					}
					chunk := hardSplitFirst(rest, limit-currentWidth)
					current = append(current, Span{Text: chunk, Style: part.Style})
					currentWidth += textWidth(chunk)
					rest = rest[len(chunk):]
				}
			}
		}
		word = nil
		wordWidth = 0
	}

	for _, s := range spans {
		for _, piece := range splitKeep(s.Text) {
			switch {
			case piece == "\n":
				commitWord()
				newLine()
			case strings.TrimSpace(piece) == "":
				commitWord()
				if len(current) > 0 {
					p := Span{Text: piece, Style: s.Style}
					pendingSpace = &p
				}
			default:
				word = append(word, Span{Text: piece, Style: s.Style})
				wordWidth += textWidth(piece)
			}
		}
	}

	commitWord()
	if len(current) > 0 || len(lines) == 0 {
		lines = append(lines, current)
	}
	return lines
}

func sgr(s Style) string {
	var codes []string
	if s.Bold {
		codes = append(codes, "1")
	}
	if s.Dim {
		codes = append(codes, "2")
	}
	if s.Italic {
		codes = append(codes, "3")
	}
	if s.Underline {
		codes = append(codes, "4")
	}
	if s.Strike {
		codes = append(codes, "9")
	}
	if s.Fg != "" {
		codes = append(codes, s.Fg)
	}
	if s.Bg != "" {
		codes = append(codes, s.Bg)
	}
	if len(codes) == 0 {
		return ""
	}
	return fmt.Sprintf("%s[%sm", esc, strings.Join(codes, ";"))
}

// serialize turns a styled line into a string, with ANSI sequences only when color is on.
func serialize(line Line, color bool) string {
	var b strings.Builder
	if !color {
		for _, s := range line {
			b.WriteString(s.Text)
		}
		return b.String()
	}

	// Merge neighbours that share a style so each run is emitted once.
	var runs []Span
	for _, s := range line {
		if s.Text == "" {
			continue
		}
		if n := len(runs); n > 0 && runs[n-1].Style == s.Style {
			runs[n-1].Text += s.Text
		} else {
			runs = append(runs, s)
		}
	}

	for _, s := range runs {
		chunk := s.Text
		if open := sgr(s.Style); open != "" {
			chunk = open + s.Text + esc + "[0m"
		}
		if s.Style.Link != "" {
			url := controlChars.ReplaceAllString(s.Style.Link, "")
			chunk = esc + "]8;;" + url + esc + "\\" + chunk + esc + "]8;;" + esc + "\\"
		}
		b.WriteString(chunk)
	}
	return b.String()
}

// pad pads a line with plain spaces to exactly target columns.
func pad(line Line, target int, align string) Line {
	gap := target - lineWidth(line)
	if gap <= 0 {
		return line
	}
	spaces := func(n int) Span { return Span{Text: strings.Repeat(" ", n)} }
	switch align {
	case "right":
		return append(Line{spaces(gap)}, line...)
	case "center":
		left := gap / 2
		return append(append(Line{spaces(left)}, line...), spaces(gap-left))
	}
	return append(append(Line{}, line...), spaces(gap))
}

func trimRightSpace(s string) string { return strings.TrimRight(s, " \t\r\n") }
