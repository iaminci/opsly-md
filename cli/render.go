package main

import (
	"bytes"
	"encoding/json"
	"regexp"
	"strconv"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
)

type renderOptions struct {
	width  int
	color  bool
	reveal bool
}

var (
	frameStyle = Style{Fg: "90"}
	secureMask = strings.Repeat("•", 16)
	bullets    = []string{"•", "◦", "▪"}

	headingStyles = map[int]Style{
		1: {Bold: true, Fg: "38;5;228", Bg: "48;5;63"},
		2: {Bold: true, Fg: "94"},
		3: {Bold: true, Fg: "95"},
		4: {Bold: true, Fg: "92"},
		5: {Bold: true},
		6: {Bold: true, Dim: true},
	}

	treePatterns = regexp.MustCompile(`├──|└──|│\s|├\s|└\s`)
)

const minColumnWidth = 5

func prefixLines(lines []Line, first, rest []Span) []Line {
	out := make([]Line, len(lines))
	for i, line := range lines {
		prefix := rest
		if i == 0 {
			prefix = first
		}
		out[i] = append(append(Line{}, prefix...), line...)
	}
	return out
}

func renderHeading(n *ast.Heading, width int, ctx *renderContext) []Line {
	// A terminal has one font size, so levels are told apart by colour and weight alone.
	style, ok := headingStyles[n.Level]
	if !ok {
		style = Style{Bold: true}
	}
	if n.Level != 1 || !ctx.color {
		return wrap(renderInline(n, style, ctx), width)
	}
	// The title is a filled badge: one cell of padding either side of the text.
	edge := span(" ", style)
	lines := wrap(renderInline(n, style, ctx), width-2)
	for i, line := range lines {
		lines[i] = append(append(Line{edge}, line...), edge)
	}
	return lines
}

func framed(label string, body []Line) []Line {
	top := "┌─"
	if label != "" {
		top = "┌─ " + label
	}
	out := []Line{{span(top, frameStyle)}}
	for _, line := range body {
		out = append(out, append(Line{span("│ ", frameStyle)}, line...))
	}
	return append(out, Line{span("└─", frameStyle)})
}

func renderCode(lang, value string, ctx *renderContext) []Line {
	lower := strings.ToLower(lang)
	label := lang
	if lower == "text" {
		label = ""
	}
	var body []Line

	switch {
	case lower == "secure":
		if ctx.reveal {
			body = plainLines(value)
		} else {
			label = "secure · hidden (use --reveal to show)"
			body = []Line{{span(secureMask, Style{Dim: true})}}
		}
	default:
		if lower == "json" && strings.TrimSpace(value) != "" && json.Valid([]byte(value)) {
			var buf bytes.Buffer
			if err := json.Indent(&buf, []byte(value), "", "  "); err == nil {
				value = buf.String()
			}
		}
		body = highlightCode(value, lower)
	}
	// Body lines are left unwrapped so copied code stays intact.
	return framed(label, body)
}

func codeValue(n ast.Node, src []byte) string {
	return strings.TrimSuffix(rawSegments(n, src), "\n")
}

func renderList(n *ast.List, width int, ctx *renderContext, depth int) []Line {
	start := 1
	if n.IsOrdered() {
		start = n.Start
	}
	count := 0
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		count++
	}
	numberWidth := len(strconv.Itoa(start+count-1)) + 1
	var out []Line
	index := 0

	for item := n.FirstChild(); item != nil; item = item.NextSibling() {
		var marker Span
		checked, hasCheck := taskState(item)
		switch {
		case hasCheck && checked:
			marker = span("[x]", Style{Fg: "32"})
		case hasCheck:
			marker = span("[ ]", frameStyle)
		case n.IsOrdered():
			label := strconv.Itoa(start+index) + "."
			for len(label) < numberWidth {
				label = " " + label
			}
			marker = span(label, Style{Fg: "36"})
		default:
			marker = span(bullets[depth%len(bullets)], Style{Fg: "36"})
		}

		indent := lineWidth(Line{marker}) + 1
		body := renderBlocks(blockChildren(item), maxInt(10, width-indent), ctx, !n.IsTight, depth+1, true)
		if len(body) == 0 {
			body = []Line{{}}
		}
		if len(out) > 0 && !n.IsTight {
			out = append(out, Line{})
		}
		out = append(out, prefixLines(body, []Span{marker, span(" ")}, []Span{span(strings.Repeat(" ", indent))})...)
		index++
	}
	return out
}

func taskState(item ast.Node) (checked, ok bool) {
	first := item.FirstChild()
	if first == nil {
		return false, false
	}
	if box, isBox := first.FirstChild().(*extast.TaskCheckBox); isBox {
		return box.IsChecked, true
	}
	return false, false
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func shrinkColumns(widths, floors []int, available int) {
	total := 0
	for _, w := range widths {
		total += w
	}
	for total > available {
		target := -1
		for i := range widths {
			if widths[i] > floors[i] && (target == -1 || widths[i] > widths[target]) {
				target = i
			}
		}
		if target == -1 {
			return
		}
		widths[target]--
		total--
	}
}

func fitColumns(natural, longestWord []int, available int) []int {
	widths := append([]int{}, natural...)
	floors := make([]int, len(natural))
	for i := range floors {
		floors[i] = minInt(natural[i], maxInt(minColumnWidth, longestWord[i]))
	}
	shrinkColumns(widths, floors, available)
	for i := range floors {
		floors[i] = minInt(natural[i], minColumnWidth)
	}
	shrinkColumns(widths, floors, available)
	return widths
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func renderTable(n *extast.Table, width int, ctx *renderContext) []Line {
	var rows []ast.Node
	for r := n.FirstChild(); r != nil; r = r.NextSibling() {
		rows = append(rows, r)
	}
	columnCount := 0
	for _, r := range rows {
		c := 0
		for cell := r.FirstChild(); cell != nil; cell = cell.NextSibling() {
			c++
		}
		columnCount = maxInt(columnCount, c)
	}
	if columnCount == 0 {
		return nil
	}

	cells := make([][][]Span, len(rows))
	for ri, r := range rows {
		cells[ri] = make([][]Span, columnCount)
		col := 0
		for cell := r.FirstChild(); cell != nil && col < columnCount; cell = cell.NextSibling() {
			style := Style{}
			if ri == 0 {
				style.Bold = true
			}
			cells[ri][col] = renderInline(cell, style, ctx)
			col++
		}
	}

	natural := make([]int, columnCount)
	longestWord := make([]int, columnCount)
	for col := 0; col < columnCount; col++ {
		natural[col], longestWord[col] = 1, 1
		for _, row := range cells {
			for _, l := range wrap(row[col], 1<<30) {
				natural[col] = maxInt(natural[col], lineWidth(l))
			}
			for _, s := range row[col] {
				for _, word := range strings.Fields(s.Text) {
					longestWord[col] = maxInt(longestWord[col], textWidth(word))
				}
			}
		}
	}
	// Each column costs its content plus " │ " padding, plus one closing border.
	available := maxInt(columnCount*minColumnWidth, width-(columnCount*3+1))
	widths := fitColumns(natural, longestWord, available)

	border := func(left, mid, right string) Line {
		parts := make([]string, len(widths))
		for i, w := range widths {
			parts[i] = strings.Repeat("─", w+2)
		}
		return Line{span(left+strings.Join(parts, mid)+right, frameStyle)}
	}
	bar := span("│", frameStyle)

	wrapped := make([][][]Line, len(cells))
	multiLine := false
	for ri, row := range cells {
		wrapped[ri] = make([][]Line, columnCount)
		for col := range row {
			wrapped[ri][col] = wrap(row[col], widths[col])
			if len(wrapped[ri][col]) > 1 {
				multiLine = true
			}
		}
	}

	out := []Line{border("┌", "┬", "┐")}
	for ri, row := range wrapped {
		height := 0
		for _, cell := range row {
			height = maxInt(height, len(cell))
		}
		for i := 0; i < height; i++ {
			line := Line{bar}
			for col, cell := range row {
				var content Line
				if i < len(cell) {
					content = cell[i]
				}
				align := ""
				if col < len(n.Alignments) {
					switch n.Alignments[col] {
					case extast.AlignRight:
						align = "right"
					case extast.AlignCenter:
						align = "center"
					}
				}
				line = append(line, span(" "))
				line = append(line, pad(content, widths[col], align)...)
				line = append(line, span(" "), bar)
			}
			out = append(out, line)
		}
		last := ri == len(wrapped)-1
		if !last && (ri == 0 || multiLine) {
			out = append(out, border("├", "┼", "┤"))
		}
	}
	return append(out, border("└", "┴", "┘"))
}

func blockChildren(n ast.Node) []ast.Node {
	var out []ast.Node
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		out = append(out, c)
	}
	return out
}

func renderBlock(node ast.Node, width int, ctx *renderContext, depth int) []Line {
	switch n := node.(type) {
	case *ast.Paragraph, *ast.TextBlock:
		return wrap(renderInline(n, Style{}, ctx), width)
	case *ast.Heading:
		return renderHeading(n, width, ctx)
	case *ast.FencedCodeBlock:
		return renderCode(string(n.Language(ctx.src)), codeValue(n, ctx.src), ctx)
	case *ast.CodeBlock:
		return renderCode("", codeValue(n, ctx.src), ctx)
	case *rawCode:
		return renderCode(n.Lang, n.Value, ctx)
	case *mathBlock:
		value := n.Value
		if value == "" {
			value = codeValue(n, ctx.src)
		}
		var body []Line
		for _, l := range strings.Split(value, "\n") {
			body = append(body, Line{span(l, Style{Fg: "35"})})
		}
		return framed("math", body)
	case *ast.Blockquote:
		inner := renderBlocks(blockChildren(n), maxInt(10, width-2), ctx, false, depth, false)
		bar := []Span{span("│ ", frameStyle)}
		return prefixLines(inner, bar, bar)
	case *ast.List:
		return renderList(n, width, ctx, depth)
	case *extast.Table:
		return renderTable(n, width, ctx)
	case *ast.ThematicBreak:
		return []Line{{span(strings.Repeat("─", width), frameStyle)}}
	case *ast.HTMLBlock:
		raw := rawSegments(n, ctx.src)
		if n.HasClosure() {
			raw += string(n.ClosureLine.Value(ctx.src))
		}
		var out []Line
		for _, l := range strings.Split(htmlToText(raw), "\n") {
			if l = strings.TrimSpace(l); l != "" {
				out = append(out, wrap([]Span{span(l)}, width)...)
			}
		}
		return out
	case *extast.FootnoteList:
		var out []Line
		for fn := n.FirstChild(); fn != nil; fn = fn.NextSibling() {
			footnote, ok := fn.(*extast.Footnote)
			if !ok {
				continue
			}
			label := span("["+footnoteLabel(ctx, footnote.Index)+"]", Style{Fg: "36"})
			indent := lineWidth(Line{label}) + 1
			inner := renderBlocks(blockChildren(footnote), maxInt(10, width-indent), ctx, false, depth, false)
			if len(inner) == 0 {
				inner = []Line{{}}
			}
			out = append(out, prefixLines(inner, []Span{label, span(" ")}, []Span{span(strings.Repeat(" ", indent))})...)
		}
		return out
	}
	return nil
}

func renderBlocks(nodes []ast.Node, width int, ctx *renderContext, loose bool, depth int, inList bool) []Line {
	var out []Line
	for _, node := range nodes {
		lines := renderBlock(node, width, ctx, depth)
		if len(lines) == 0 {
			continue
		}
		// Items of a tight list pack their blocks together; everywhere else blocks are spaced.
		if len(out) > 0 && (!inList || loose) {
			out = append(out, Line{})
		}
		out = append(out, lines...)
	}
	return out
}

// paragraphText concatenates a paragraph's plain text nodes (code spans, links and
// other inline nodes do not count), as the tree-structure check expects.
func paragraphText(p *ast.Paragraph, src []byte) string {
	var b strings.Builder
	for c := p.FirstChild(); c != nil; c = c.NextSibling() {
		if t, ok := c.(*ast.Text); ok {
			b.WriteString(textValue(t, src))
			if t.SoftLineBreak() {
				b.WriteString("\n")
			}
		}
	}
	return b.String()
}

func paragraphRange(p *ast.Paragraph, src []byte) (start, end int) {
	lines := p.Lines()
	start = lines.At(0).Start
	last := lines.At(lines.Len() - 1)
	end = start + len(trimRightSpace(string(src[start:last.Stop])))
	return
}

// groupTreeStructures turns paragraphs that look like ASCII trees into code blocks
// so they keep their monospace layout and line breaks. Like the web renderer, a
// paragraph followed by tree-like paragraphs is merged with them, using the raw source.
func groupTreeStructures(nodes []ast.Node, src []byte) []ast.Node {
	var out []ast.Node
	for i := 0; i < len(nodes); {
		para, ok := nodes[i].(*ast.Paragraph)
		if !ok || para.Lines().Len() == 0 {
			out = append(out, nodes[i])
			i++
			continue
		}
		start, end := paragraphRange(para, src)

		if treePatterns.MatchString(paragraphText(para, src)) {
			out = append(out, &rawCode{Lang: "text", Value: string(src[start:end])})
			i++
			continue
		}

		j := i + 1
		for j < len(nodes) {
			next, ok := nodes[j].(*ast.Paragraph)
			if !ok || next.Lines().Len() == 0 || !treePatterns.MatchString(paragraphText(next, src)) {
				break
			}
			_, end = paragraphRange(next, src)
			j++
		}
		if j-i > 1 {
			out = append(out, &rawCode{Lang: "text", Value: string(src[start:end])})
			i = j
			continue
		}
		out = append(out, nodes[i])
		i++
	}
	return out
}

func collectFootnotes(root ast.Node) map[int]string {
	labels := map[int]string{}
	_ = ast.Walk(root, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if fn, ok := n.(*extast.Footnote); ok && entering {
			labels[fn.Index] = string(fn.Ref)
		}
		return ast.WalkContinue, nil
	})
	return labels
}

// renderMarkdown renders Markdown source to terminal text (no trailing newline).
func renderMarkdown(source string, opts renderOptions) string {
	input := []byte(strings.TrimPrefix(source, "\uFEFF"))
	md := goldmark.New(goldmark.WithExtensions(
		extension.GFM,
		extension.Footnote,
		mathExtension{},
	), goldmark.WithParserOptions(parser.WithAttribute()))
	root := md.Parser().Parse(text.NewReader(input))

	ctx := &renderContext{
		width:     opts.width,
		color:     opts.color,
		reveal:    opts.reveal,
		src:       input,
		footnotes: collectFootnotes(root),
	}
	nodes := groupTreeStructures(blockChildren(root), input)
	var rendered []string
	for _, line := range renderBlocks(nodes, opts.width, ctx, true, 0, false) {
		rendered = append(rendered, trimRightSpace(serialize(line, opts.color)))
	}
	return strings.Join(rendered, "\n")
}
