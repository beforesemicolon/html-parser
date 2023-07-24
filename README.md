# HTML Parser
A flexible and forgiven HTML parser for both NodeJs and Browsers.

***This is a Beta Release***

This module is still in beta and lacks robust testing despite having all the MVP features.

### Good to know
- Only works with HTML and SVG tags. Duh!
- `<!Doctype>` tags are ignored
- Keeps all white spaces by default
- Throws errors when unbalanced tags. It validates that you correctly opened and closed all tags


### Benchmark
#### Using Custom Handler
```2.52784 ms/file ± 1.62924```

#### Using JsDOM
```27.3563 ms/file ± 19.1060```
