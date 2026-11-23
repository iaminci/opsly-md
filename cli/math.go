package main

import (
	"bytes"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

// Minimal $$ block and $inline$ math, matching what remark-math recognises.

var (
	kindMathBlock  = ast.NewNodeKind("MathBlock")
	kindInlineMath = ast.NewNodeKind("InlineMath")
	kindRawCode    = ast.NewNodeKind("RawCode")
)

type mathBlock struct {
	ast.BaseBlock
	Value string // set for single-line $$ ... $$ blocks
}

func (n *mathBlock) Kind() ast.NodeKind         { return kindMathBlock }
func (n *mathBlock) Dump(src []byte, level int) { ast.DumpHelper(n, src, level, nil, nil) }
func (n *mathBlock) IsRaw() bool                { return true }

type inlineMath struct {
	ast.BaseInline
	Value string
}

func (n *inlineMath) Kind() ast.NodeKind         { return kindInlineMath }
func (n *inlineMath) Dump(src []byte, level int) { ast.DumpHelper(n, src, level, nil, nil) }

// rawCode is a code block synthesised by the tree-structure pass.
type rawCode struct {
	ast.BaseBlock
	Lang, Value string
}

func (n *rawCode) Kind() ast.NodeKind         { return kindRawCode }
func (n *rawCode) Dump(src []byte, level int) { ast.DumpHelper(n, src, level, nil, nil) }

// advanceLine consumes a line but leaves its newline for the parser, as the built-in fenced code parser does.
func advanceLine(reader text.Reader, line []byte) {
	n := len(line)
	if n > 0 && line[n-1] == '\n' {
		n--
	}
	reader.Advance(n)
}

type mathBlockParser struct{}

func (p *mathBlockParser) Trigger() []byte { return []byte{'$'} }

func (p *mathBlockParser) Open(parent ast.Node, reader text.Reader, pc parser.Context) (ast.Node, parser.State) {
	line, _ := reader.PeekLine()
	trimmed := bytes.TrimSpace(line)
	if !bytes.HasPrefix(trimmed, []byte("$$")) {
		return nil, parser.NoChildren
	}
	if len(trimmed) >= 4 && bytes.HasSuffix(trimmed, []byte("$$")) {
		node := &mathBlock{Value: string(bytes.TrimSpace(trimmed[2 : len(trimmed)-2]))}
		advanceLine(reader, line)
		return node, parser.Close | parser.NoChildren
	}
	if len(bytes.TrimSpace(trimmed[2:])) != 0 {
		return nil, parser.NoChildren
	}
	advanceLine(reader, line)
	return &mathBlock{}, parser.NoChildren
}

func (p *mathBlockParser) Continue(node ast.Node, reader text.Reader, pc parser.Context) parser.State {
	line, segment := reader.PeekLine()
	if bytes.HasPrefix(bytes.TrimSpace(line), []byte("$$")) {
		advanceLine(reader, line)
		return parser.Close
	}
	node.Lines().Append(segment)
	advanceLine(reader, line)
	return parser.Continue | parser.NoChildren
}

func (p *mathBlockParser) Close(node ast.Node, reader text.Reader, pc parser.Context) {}
func (p *mathBlockParser) CanInterruptParagraph() bool                                { return true }
func (p *mathBlockParser) CanAcceptIndentedLine() bool                                { return false }

type inlineMathParser struct{}

func (p *inlineMathParser) Trigger() []byte { return []byte{'$'} }

func (p *inlineMathParser) Parse(parent ast.Node, block text.Reader, pc parser.Context) ast.Node {
	line, _ := block.PeekLine()
	if len(line) < 3 || line[1] == '$' || line[1] == ' ' {
		return nil
	}
	for i := 2; i < len(line); i++ {
		if line[i] == '\\' {
			i++
			continue
		}
		if line[i] != '$' || line[i-1] == ' ' {
			continue
		}
		if i+1 < len(line) && line[i+1] >= '0' && line[i+1] <= '9' {
			continue
		}
		block.Advance(i + 1)
		return &inlineMath{Value: string(line[1:i])}
	}
	return nil
}

type mathExtension struct{}

func (mathExtension) Extend(m goldmark.Markdown) {
	m.Parser().AddOptions(
		parser.WithBlockParsers(util.Prioritized(&mathBlockParser{}, 701)),
		parser.WithInlineParsers(util.Prioritized(&inlineMathParser{}, 500)),
	)
}
