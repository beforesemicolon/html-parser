# HTML Parser Specification

## 1. Purpose

`@beforesemicolon/html-parser` is a small, fast, environment-independent HTML
and SVG parser. It converts a markup string into a document fragment by using
either:

- the package's lightweight DOM-like `Doc`;
- a browser `Document`;
- a compatible custom document implementation; or
- the default `Doc` plus a callback invoked as nodes are parsed.

The parser prioritizes predictable output, low overhead, portability, and a
pleasant extension API. It is not intended to implement the complete WHATWG
HTML parsing algorithm or reproduce every browser error-recovery rule.

## 2. Goals

The parser must:

1. Run in JavaScript environments without relying on Node.js, browser globals,
   or platform-specific APIs.
2. Preserve source text and whitespace as text nodes.
3. Parse common HTML, SVG, MathML, comments, attributes, raw-text elements,
   custom elements, void elements, and explicitly self-closing elements.
4. Support the package's `Doc`, native DOM documents, and compatible custom
   document implementations through one API.
5. Recover deterministically from incomplete and mismatched markup without
   throwing for ordinary malformed input.
6. Be safe to call recursively or concurrently because parsing state is local
   to each invocation.
7. Operate in linear time for normal inputs and avoid copying the unparsed
   remainder of the document.
8. Demonstrably improve performance over the parser replaced by this change.

## 3. Non-goals

The parser does not promise:

- full WHATWG tree-construction behavior;
- browser-equivalent correction of malformed tables, paragraphs, formatting
  elements, foster parenting, or adoption-agency cases;
- entity decoding;
- validation or sanitization;
- execution of scripts;
- CSS or JavaScript parsing;
- mutation APIs beyond those provided by the selected document handler; or
- byte-for-byte preservation when a parsed tree is serialized.

Consumers that require browser-identical error recovery must provide a native
or browser-compatible parser instead.

## 4. Public API

```ts
parse(markup)
parse(markup, callback)
parse(markup, documentLike)
```

### 4.1 `markup`

`markup` is a string containing the source to parse.

### 4.2 Default behavior

When the second argument is omitted, the parser uses the package's lightweight
`Doc` implementation and returns its document-fragment-like root.

### 4.3 Callback behavior

When the second argument is a function, the parser uses `Doc` and invokes the
callback for each created node.

The callback:

- receives elements, comments, and ordinary text nodes;
- is invoked after a node has been attached to its parent;
- is invoked once for each reported node;
- may call `parse()` recursively without corrupting the active parse; and
- receives a completed element callback after raw script content is attached.

Script text remains an implementation detail of the script element and is not
reported as a separate callback event. Text in `style`, `textarea`, and `title`
is reported normally.

### 4.4 Custom document behavior

A custom document handler must provide:

```ts
interface DocumentLike {
    createTextNode(value: string): NodeLike
    createComment(value: string): NodeLike
    createDocumentFragment(): DocumentFragmentLike
    createElementNS(namespaceURI: string, tagName: string): ElementLike
}
```

Created fragments and elements must implement `appendChild`. Created elements
must implement `setAttribute` and expose `tagName` and `namespaceURI`.

The parser uses only these capabilities. A conforming custom handler therefore
works in Node.js, browsers, Deno, Bun, workers, and other JavaScript runtimes.

## 5. Parsing model

Each call maintains:

- a cursor into the original markup string;
- a stack containing the root fragment and currently open elements; and
- local helper state for tag, attribute, comment, and raw-text scanning.

The parser scans the original input from left to right. It searches for the next
`<`, emits preceding content as one text node, and classifies the construct that
follows.

Module-level mutable parser state, global regular-expression cursors, and caches
whose correctness depends on parse order are prohibited.

## 6. Text

Text outside tags must:

- be preserved exactly, including spaces, tabs, and line breaks;
- be appended to the currently active element, not automatically to the root;
- remain inside an unclosed element through the end of input; and
- be emitted as literal text when `<` does not begin a recognized construct.

An input containing no `<` may take a fast path but must produce the same
logical result.

## 7. Elements and tag names

An element begins with `<` followed by an ASCII letter. Tag names may contain:

- ASCII letters;
- ASCII digits; and
- hyphens.

The source tag-name spelling is passed to `createElementNS`. Comparisons for
void elements, closing tags, namespaces, and raw-text elements are
ASCII-case-insensitive.

Custom elements are supported when their names follow these scanner rules.

## 8. Attributes

The parser supports:

- boolean attributes;
- unquoted values;
- single-quoted values;
- double-quoted values;
- whitespace around `=`; and
- `>` inside quoted values.

For every parsed attribute, the parser calls:

```ts
element.setAttribute(name, value)
```

A boolean attribute has an empty-string value. Attribute names retain their
source spelling. Attribute values are not entity-decoded.

The compatibility exceptions are boolean attributes matching `$val[0-9]+` and
that same placeholder followed by one stray quote. They are reported without
the leading `$` or trailing quote (for example, `$val0` and `$val0"` are both
reported as `val0`). The previous parser produced this result and
`@beforesemicolon/markup` relies on it for dynamic attribute placeholders.
Other names beginning with `$` retain the `$`, and quotes on other malformed
attributes retain the recovery behavior described below.

A `/` immediately before the closing `>` marks an explicitly self-closing
element and is not part of an unquoted attribute value.

## 9. Closing and malformed tags

Closing tags are matched case-insensitively.

When a closing tag matches an open ancestor, the matching element and every
still-open descendant are removed from the active stack. This provides
deterministic recovery for markup such as:

```html
<div><span>text</div>
```

An unmatched closing tag is consumed and does not alter the stack.

If a tag-like construct never reaches an unquoted `>`, the remaining source is
emitted as text under the current parent. Invalid `<` sequences are also
preserved as text rather than discarded.

## 10. Comments and declarations

`<!--value-->` creates a comment whose value excludes the delimiters.

An unterminated comment is preserved as text from its opening `<` through the
end of input.

Declarations and processing-instruction-like constructs beginning with `<!` or
`<?` are ignored through their next unquoted `>`. This includes doctypes. They
do not create nodes or callback events.

## 11. Void and self-closing elements

The following HTML names are treated as void elements:

`area`, `base`, `br`, `col`, `command`, `embed`, `hr`, `img`, `input`,
`keygen`, `link`, `menuitem`, `meta`, `param`, `source`, `track`, and `wbr`.

Void elements and elements ending in `/>` are attached but never pushed onto
the open-element stack.

The `Doc` serializer must use the same void-element definition without creating
a new regular expression on every serialization.

## 12. Raw-text handling

The contents of `script`, `style`, `textarea`, and `title` are treated as text
until the corresponding case-insensitive closing tag.

Markup-looking content inside these elements must not create child elements.
For example:

```html
<style>.example::before { content: "<b>"; }</style>
```

must produce one `style` element containing text, not a nested `b` element.

Script scanning preserves the package's existing nested same-name behavior:
same-name opening script tags increase a local depth and the matching closing
tag decreases it. The first same-name closing tag at depth zero ends the outer
script.

Raw-text scanning must use indices into the original input. It must not allocate
a copy of the entire remaining source for each raw-text element.

If no matching closing tag exists, the element remains on the normal open stack
and subsequent input is parsed according to the general parser rules.

## 13. Namespaces

The parser recognizes:

| Context | Namespace |
|---|---|
| Default HTML content | `http://www.w3.org/1999/xhtml` |
| `svg` and descendants | `http://www.w3.org/2000/svg` |
| `math` and descendants | `http://www.w3.org/1998/Math/MathML` |
| Content inside SVG `foreignObject` | HTML namespace |

Namespace selection is derived from the current parent and tag name. It must
not be cached by tag name alone because the same tag name can validly occur in
different namespaces.

An explicit `html`, `svg`, or `math` element starts its corresponding
namespace regardless of the preceding parse history.

## 14. Lightweight `Doc` requirements

The built-in DOM-like implementation must:

- preserve child insertion order;
- expose `childNodes` and element-only `children`;
- expose DOM-like `nodeType`, `nodeName`, `nodeValue`, `tagName`,
  `namespaceURI`, `attributes`, `textContent`, and `outerHTML` behavior already
  covered by the test suite;
- store ordered children in arrays to avoid repeated `Set`-to-array
  conversion;
- maintain attribute insertion behavior through its named-node-map-like API;
  and
- serialize void elements without closing tags.

The parser contract does not require a complete DOM implementation.

## 15. Complexity and allocation requirements

For an input of length `n` and nesting depth `d`:

- normal scanning should be `O(n)`;
- active tree state should be `O(d)`, excluding the output tree;
- the parser must not use backtracking expressions over the whole input;
- tag comparison must not allocate dynamic regular expressions;
- parsing must not retain cross-call mutable state; and
- raw-text search must not repeatedly slice the unprocessed suffix.

Substring allocation for actual node text, tag names, attribute names, and
attribute values is expected because these values are delivered to handlers.

## 16. Compatibility

Source code and distributed builds must remain usable through the package's
documented entry points in supported JavaScript runtimes.

Parser code must not depend on:

- `window`, `document`, or other browser globals;
- Node.js built-ins;
- filesystem access;
- timers; or
- runtime-specific module APIs.

Native DOM compatibility is verified by running the same behavioral cases
against both the built-in `Doc` and a DOM `Document`.

## 17. Correctness acceptance criteria

Before merge:

1. All pre-existing tests pass.
2. Regression tests cover:
   - trailing text inside an unclosed element;
   - mismatched closing-tag recovery;
   - `>` inside quoted attributes;
   - legacy `$val[0-9]+` attribute-placeholder compatibility;
   - text around ignored and unterminated declarations;
   - markup-looking text inside `style`;
   - identical tag names in HTML and SVG namespaces; and
   - recursive `parse()` calls from callbacks.
3. Tests exercise both built-in and native/custom document behavior where
   applicable.
4. TypeScript and lint checks pass.
5. No parser state leaks between calls.

The implementation accompanying this specification passes 46 tests: the
original 36 plus ten regression tests.

## 18. Performance specification

Performance is measured separately for:

1. **Tokenizer mode** — a minimal custom document handler intended to expose
   parser overhead.
2. **Default Doc mode** — the package's complete default parsing path,
   including node allocation and DOM-like bookkeeping.

The comparison must:

- use the exact pre-change implementation as the baseline;
- feed identical markup and handlers to both implementations;
- include small, attribute-heavy, Markup-template, medium, large,
  script-heavy, SVG-heavy, and malformed inputs;
- build the baseline from `BENCHMARK_BASE_REF` (defaulting to
  `origin/master`) and the candidate from the current working tree with
  identical production module-build settings;
- execute the generated minified ESM module trees while measuring a separate
  identical single-file bundle for the size comparison;
- run every mode/workload pair in a fresh Node.js process so JIT history from
  one workload cannot influence another;
- warm both implementations before measurement;
- calibrate identical iteration counts to a target sample duration;
- alternate measurement order to reduce ordering bias;
- collect 15 paired timed samples;
- compare paired sample medians and report a bootstrapped 95% confidence
  interval;
- report milliseconds per parse, throughput, statistical confidence, and
  practical materiality;
- report per-case percentage changes and a geometric-mean change; and
- disclose runtime, bundle-size, and methodology tradeoffs.

The reproducible benchmark command is:

```sh
node --expose-gc benchmark.compare.mjs
```

The command materializes and bundles both implementations in a temporary
directory; no manually prepared `/tmp` modules are required. Environment
variables can select cases or modes, change the base ref, adjust sample count
or duration, and write the complete samples to JSON.

Two independent full runs on Node.js 24 for macOS/arm64 produced these median
change ranges:

| Workload | Tokenizer change | Default `Doc` change |
|---|---:|---:|
| Small HTML | −9.4% to −8.7% | +15.1% to +16.1% |
| Attributes | +8.4% to +9.3% | +18.7% to +22.2% |
| Markup template | +1.6% to +2.5% | +21.7% to +22.0% |
| Medium HTML | +14.0% to +15.4% | +21.0% to +26.7% |
| Large HTML | +13.4% to +14.0% | +26.9% to +29.6% |
| Script-heavy | +93.4% to +102.7% | +90.0% to +90.5% |
| SVG-heavy | +3.7% to +7.2% | +6.2% to +16.2% |
| Malformed HTML | +27.8% to +33.2% | +15.6% to +22.9% |
| **Geometric mean** | **+16.3% to +18.3%** | **+26.8% to +27.3%** |

Positive percentages indicate faster execution. The small tokenizer-only
regression is approximately 0.00007 milliseconds per parse, below the
benchmark's default practical materiality threshold of 0.001 milliseconds.
The default `Doc` path improves for every workload in both independent runs.

With identical minified, bundled, keep-name esbuild settings, the candidate
measured 6,414 bytes versus 4,626 bytes for the baseline: an increase of 1,788
bytes or 38.7%. This size cost is an explicit tradeoff for the correctness
fixes and scanner implementation and must remain visible during review.

## 19. Performance acceptance criteria

For this change, a regression is considered materially repeatable when its
paired 95% confidence interval excludes zero and its median effect is at least
3% and 0.001 milliseconds per parse. Under that definition:

- no benchmark workload may show a material repeatable regression;
- tokenizer geometric-mean performance must improve;
- default `Doc` geometric-mean performance must improve; and
- correctness takes precedence over optimizing a knowingly incorrect result.

Future performance claims must be based on reproducible measurements rather
than a single run or an isolated best case.

## 20. Security considerations

Parsing does not make untrusted HTML safe. The parser preserves scripts,
attributes, URLs, and other potentially dangerous content in the output tree.
Consumers must sanitize untrusted input before rendering or executing it.

The parser must not evaluate input or invoke code discovered inside markup.

## 21. Definition of done

A parser change is complete when:

- behavior is consistent with this specification;
- required correctness and regression tests pass;
- lint and type checks pass;
- cross-runtime code remains platform-neutral;
- benchmarks are reproducible and results are documented;
- bundle-size changes are reported; and
- intentional deviations or newly discovered limitations are documented before
  merge.
