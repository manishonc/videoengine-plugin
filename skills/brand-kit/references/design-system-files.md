# Design system files

## SKILL.md

```markdown
---
name: acme
description: "Acme's design system for videos: colours, type, logo and motion. Use when making or changing a video for Acme."
metadata:
  kind: design-system
---

# Acme design system

Read DESIGN.md before writing anything, and follow it. Exact values are in tokens.json; tokens.css
has them as CSS variables a composition can link. Logos are in assets/Logos (read its README.md
first); fonts are in fonts/.
```

`name` must equal the design system's slug.

## tokens.json

```json
{
  "name": "Acme",
  "version": 1,
  "color": {
    "themes": [{ "id": "light", "name": "Light" }],
    "tokens": [
      { "name": "brand", "value": "#FF5A1F", "usage": "Headlines, the logo mark, one accent per frame" },
      { "name": "ink", "value": "#14110F", "usage": "Body text" },
      { "name": "paper", "value": "#FFF8F2", "usage": "Backgrounds" }
    ]
  },
  "type": {
    "fonts": ["fonts/Inter.woff2"],
    "families": { "sans": "Inter, system-ui, sans-serif" },
    "groups": [
      {
        "name": "Headings",
        "family": "sans",
        "styles": [
          { "name": "display", "fontSize": "96px", "fontWeight": "800", "lineHeight": "1.0" },
          { "name": "title", "fontSize": "64px", "fontWeight": "700", "lineHeight": "1.1" }
        ]
      },
      {
        "name": "Text",
        "family": "sans",
        "styles": [{ "name": "body", "fontSize": "36px", "fontWeight": "400", "lineHeight": "1.4" }]
      }
    ]
  },
  "spacing": { "tokens": [{ "name": "md", "value": "24px" }, { "name": "lg", "value": "48px" }] },
  "radius": { "tokens": [{ "name": "card", "value": "24px" }] }
}
```

The web app shows `color.tokens` (a `value` may also be one value per theme id) and
`type.groups[].styles`; `families` maps a short name to a CSS font stack.

## tokens.css

```css
@font-face {
  font-family: "Inter";
  src: url("fonts/Inter.woff2") format("woff2");
  font-weight: 100 900;
}
:root {
  --color-brand: #ff5a1f;
  --color-ink: #14110f;
  --color-paper: #fff8f2;
  --font-sans: Inter, system-ui, sans-serif;
  --space-md: 24px;
  --space-lg: 48px;
  --radius-card: 24px;
}
```

Paths in `tokens.css` are relative to the design system, so they still resolve once a video puts
the file at `design-system/tokens.css` along with `design-system/fonts/`.

## assets/Logos/README.md

```markdown
# Logos

- logo.svg: full colour, on light backgrounds.
- logo-white.svg: on the brand colour or dark backgrounds.
- Keep clear space of at least the height of the mark on every side.
```
