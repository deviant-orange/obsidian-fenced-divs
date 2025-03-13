# Fenced Divs for Obsidian

This Obsidian plugin adds support for the special fenced div syntax for Pandoc Markdown:

```
::: {.id #className}
This is rendered as _Markdown_.

- Some list items
    - More list items
    - You get the idea ...
:::
```

> [!NOTE]
> This plugin currently does not support rendering fenced divs in Reading Mode,
> since `MarkdownPostProcessor` does not preserve linebreaks.

## Development

To install dependencies:

```bash
npm install
```

Running tests:

```bash
npm test
```

To compile:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```
