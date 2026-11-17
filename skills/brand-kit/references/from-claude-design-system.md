# From a Claude design system

A Claude design system (made with Claude's Design System artifact type) already has the pieces.
Map them like this:

1. Read its `README.md` and `tokens.json`.
2. `create_design_system` with the same name.
3. `tokens.json`: write it in the same format.
4. `DESIGN.md`: the README's brand book, cut to at most 20,000 characters. Keep the parts a
   video needs: look and feel, colour roles, type, logo use, motion, do's and don'ts.
5. `tokens.css`: the same values as CSS variables.
6. `SKILL.md`: as in `design-system-files.md`, with `name` equal to the slug.
7. SVG logos: `write_design_system_file` under `assets/Logos/`. PNG, JPG or WebP logos and font
   files: `save_design_system_file_from_url` from their https links, under `assets/<Group>/` and
   `fonts/`.
