package main

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/yuin/goldmark/ast"
	extast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/util"
)

// renderContext carries per-document state through the renderer.
type renderContext struct {
	width  int
	color  bool
	reveal bool
	src    []byte
	// footnotes maps a footnote's numeric index to its label.
	footnotes map[int]string
}

var namedEntities = map[string]string{
	"amp": "&", "lt": "<", "gt": ">", "quot": `"`, "apos": "'", "nbsp": " ",
	"copy": "©", "reg": "®", "trade": "™", "mdash": "—", "ndash": "–",
	"hellip": "…", "larr": "←", "rarr": "→",
}

var entityPattern = regexp.MustCompile(`(?i)&(#x[0-9a-f]+|#\d+|[a-z]+);`)

func decodeHTMLEntities(s string) string {
	return entityPattern.ReplaceAllStringFunc(s, func(match string) string {
		body := match[1 : len(match)-1]
		if body[0] == '#' {
			var code int64
			var err error
			if len(body) > 1 && (body[1] == 'x' || body[1] == 'X') {
				code, err = strconv.ParseInt(body[2:], 16, 32)
			} else {
				code, err = strconv.ParseInt(body[1:], 10, 32)
			}
			if err != nil || code > 0x10ffff || code < 0 {
				return match
			}
			return string(rune(code))
		}
		if v, ok := namedEntities[strings.ToLower(body)]; ok {
			return v
		}
		return match
	})
}

var (
	reComment   = regexp.MustCompile(`(?s)<!--.*?-->`)
	reScript    = regexp.MustCompile(`(?is)<script\b.*?</script\s*>`)
	reStyle     = regexp.MustCompile(`(?is)<style\b.*?</style\s*>`)
	reImg       = regexp.MustCompile(`(?i)<img\b[^>]*>`)
	reBr        = regexp.MustCompile(`(?i)<br\s*/?>`)
	reBlockEnd  = regexp.MustCompile(`(?i)</(p|div|h[1-6]|li|tr|table|ul|ol|blockquote|details|summary|pre)\s*>`)
	reAnyTag    = regexp.MustCompile(`<[^>]+>`)
	reAltAttr   = regexp.MustCompile(`(?i)\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`)
	reURLScheme = regexp.MustCompile(`(?i)^[a-z][a-z0-9+.-]*:`)
)

// htmlToText reduces raw HTML to readable text: images become "[image: alt]", <br>
// and closing block tags become line breaks, comments and remaining tags are dropped.
func htmlToText(html string) string {
	text := reComment.ReplaceAllString(html, "")
	text = reScript.ReplaceAllString(text, "")
	text = reStyle.ReplaceAllString(text, "")
	text = reImg.ReplaceAllStringFunc(text, func(tag string) string {
		m := reAltAttr.FindStringSubmatch(tag)
		if m != nil {
			alt := decodeHTMLEntities(m[1] + m[2] + m[3])
			if alt != "" {
				return "[image: " + alt + "]"
			}
		}
		return "[image]"
	})
	text = reBr.ReplaceAllString(text, "\n")
	text = reBlockEnd.ReplaceAllString(text, "\n")
	text = reAnyTag.ReplaceAllString(text, "")
	return decodeHTMLEntities(text)
}

// nodeText returns the unescaped text of a text-like inline node.
func textValue(n *ast.Text, src []byte) string {
	raw := n.Segment.Value(src)
	return string(util.ResolveNumericReferences(util.ResolveEntityNames(util.UnescapePunctuations(raw))))
}

func plainText(n ast.Node, src []byte) string {
	var b strings.Builder
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		switch t := c.(type) {
		case *ast.Text:
			b.WriteString(textValue(t, src))
		case *ast.String:
			b.Write(t.Value)
		default:
			b.WriteString(plainText(c, src))
		}
	}
	return b.String()
}

// hyperlink: only absolute URLs make useful terminal hyperlinks.
func hyperlink(url string) string {
	if reURLScheme.MatchString(url) {
		return url
	}
	return ""
}

func linkSpans(n ast.Node, url string, style Style, ctx *renderContext) []Span {
	linkStyle := style
	linkStyle.Fg = "34"
	linkStyle.Underline = true
	linkStyle.Link = hyperlink(url)
	label := strings.TrimSpace(plainText(n, ctx.src))

	var spans []Span
	if label == "" {
		spans = []Span{span(url, linkStyle)}
	} else {
		spans = renderInline(n, linkStyle, ctx)
	}

	// Keep the target visible for terminals without clickable links, except for
	// bare URLs and in-page anchors, where it adds nothing.
	bare := label == url || label == strings.TrimPrefix(url, "mailto:")
	if label != "" && !bare && !strings.HasPrefix(url, "#") {
		dim := style
		dim.Dim = true
		dimLink := dim
		dimLink.Link = hyperlink(url)
		spans = append(spans, span(" (", dim), span(url, dimLink), span(")", dim))
	}
	return spans
}

func imageSpans(alt, url string, style Style) []Span {
	label := "[image]"
	if a := strings.TrimSpace(alt); a != "" {
		label = "[image: " + a + "]"
	}
	imgStyle := style
	imgStyle.Fg = "35"
	imgStyle.Link = hyperlink(url)
	dim := style
	dim.Dim = true
	return []Span{span(label, imgStyle), span(" ("+url+")", dim)}
}

func rawSegments(n ast.Node, src []byte) string {
	var b strings.Builder
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		seg := lines.At(i)
		b.Write(seg.Value(src))
	}
	return b.String()
}

// renderInline renders the children of n to styled spans. A "\n" in a span is a hard break.
func renderInline(parent ast.Node, style Style, ctx *renderContext) []Span {
	var out []Span
	for n := parent.FirstChild(); n != nil; n = n.NextSibling() {
		switch node := n.(type) {
		case *ast.Text:
			out = append(out, span(strings.ReplaceAll(textValue(node, ctx.src), "\n", " "), style))
			if node.HardLineBreak() {
				out = append(out, Span{Text: "\n", Style: style})
			} else if node.SoftLineBreak() {
				out = append(out, span(" ", style))
			}
		case *ast.String:
			out = append(out, span(strings.ReplaceAll(string(node.Value), "\n", " "), style))
		case *ast.Emphasis:
			s := style
			if node.Level >= 2 {
				s.Bold = true
			} else {
				s.Italic = true
			}
			out = append(out, renderInline(node, s, ctx)...)
		case *extast.Strikethrough:
			s := style
			s.Strike = true
			out = append(out, renderInline(node, s, ctx)...)
		case *ast.CodeSpan:
			s := style
			s.Fg = "33"
			value := plainText(node, ctx.src)
			out = append(out, span(strings.ReplaceAll(value, "\n", " "), s))
		case *inlineMath:
			s := style
			s.Fg = "35"
			s.Italic = true
			out = append(out, span(strings.ReplaceAll(node.Value, "\n", " "), s))
		case *ast.Link:
			out = append(out, linkSpans(node, string(node.Destination), style, ctx)...)
		case *ast.AutoLink:
			url := string(node.URL(ctx.src))
			label := string(node.Label(ctx.src))
			s := style
			s.Fg = "34"
			s.Underline = true
			s.Link = hyperlink(url)
			out = append(out, span(label, s))
		case *ast.Image:
			out = append(out, imageSpans(plainText(node, ctx.src), string(node.Destination), style)...)
		case *extast.FootnoteLink:
			s := style
			s.Fg = "36"
			out = append(out, span("["+footnoteLabel(ctx, node.Index)+"]", s))
		case *ast.RawHTML:
			text := htmlToText(rawSegments(node, ctx.src))
			if text == "\n" {
				out = append(out, Span{Text: "\n", Style: style})
			} else if text != "" {
				out = append(out, span(strings.ReplaceAll(text, "\n", " "), style))
			}
		}
	}
	return out
}

func footnoteLabel(ctx *renderContext, index int) string {
	if l, ok := ctx.footnotes[index]; ok && l != "" {
		return l
	}
	return strconv.Itoa(index)
}
