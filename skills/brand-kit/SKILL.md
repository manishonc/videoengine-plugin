---
name: brand-kit
description: Set up a brand in AI Video Engine as a design system (colours, type, logos, fonts and rules) that a studio's videos follow. Use when someone asks to set up their brand, use their colours or fonts, add a logo, build a brand kit or style guide for their videos, turns a website or a Claude design system into one, or asks which brand a studio uses.
---

# Set up a brand kit in AI Video Engine

In AI Video Engine a brand is a **design system**: an Agent Skill folder that belongs to the
organization. Each studio follows at most one, and every video made in that studio reads it
first. Everything here goes through the AI Video Engine MCP tools (`list_design_systems`,
`create_design_system` and the rest), which may show under the name of a connector the person
added for our server.

If the tools are missing or answer "unauthorized", ask the person to connect AI Video Engine
(`/mcp` in Claude Code, or the plugin's Connectors tab on claude.ai) and stop.

## What a design system holds

| Path | What it is | Written with |
| --- | --- | --- |
| `SKILL.md` | Frontmatter `name` (the slug), `description`, `metadata: kind: design-system`; a short body pointing at the files | `write_design_system_file` |
| `DESIGN.md` | The brand book in plain sentences, at most 20,000 characters | `write_design_system_file` |
| `tokens.json` | Exact values: colours, type, spacing, radius | `write_design_system_file` |
| `tokens.css` | The same values as CSS variables | `write_design_system_file` |
| `assets/<Group>/` | Logos and images (`assets/Logos/logo.svg`), with a `README.md` per folder | SVG: `write_design_system_file`; PNG, JPG, WebP: `save_design_system_file_from_url` |
| `fonts/` | Font files (woff2, woff, ttf, otf) | `save_design_system_file_from_url` |

File formats and a `tokens.json` example: `references/design-system-files.md`.

## Steps

1. **Check what exists.** `list_design_systems`. If one already fits, `read_design_system` and
   change it rather than making a second. To change a file, read it first, then write it whole.
2. **Gather the brand.** From what the person gives, in this order of trust:
   - Files or values they paste (hex codes, font names, a logo link).
   - Their website: read it and take the real colours, fonts, logo and voice from it. Never
     invent values; ask for anything you cannot find.
   - A Claude design system: `references/from-claude-design-system.md`.
3. **Create it.** `create_design_system` with the name the person gave (never make one up). It
   starts with a starter `SKILL.md`, `DESIGN.md` and `tokens.json`. The slug comes from the name
   and cannot change later.
4. **Write the files.** `tokens.json` first, then `tokens.css` from the same values, then
   `DESIGN.md` (use the starter's headings: look and feel, colour roles, type, logo, motion and
   pacing, sound, layout and safe areas, do's and don'ts, agent prompt guide; name tokens, not
   raw values), then `SKILL.md`. A `SKILL.md` that breaks the rules is refused with the reason;
   fix it and write again.
5. **Add logos and fonts.** SVG logos as text with `write_design_system_file`. PNG, JPG and WebP
   logos and images with `save_design_system_file_from_url` under `assets/<Group>/`; font files
   under `fonts/`. Links must be https. List each file in its folder's `README.md`.
6. **Attach it to a studio, only if asked.** `list_studios`, then `set_studio_design_system`
   with the studio and design system ids. `null` clears it.
7. **Tell the person** what you set up: the name, the main colours and fonts, the files saved,
   and which studio uses it. Offer the `make-video` skill to make a first video with it.

## Rules

- Exact values only. A colour you are not sure of is a question, not a guess.
- Keep `DESIGN.md` short and concrete: every video reads all of it.
- Fonts need a file: a font that is not in `fonts/` will not show in the video.
