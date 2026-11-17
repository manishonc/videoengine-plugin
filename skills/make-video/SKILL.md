---
name: make-video
description: Make or change a video in AI Video Engine from a brief, in the person's studio and on their brand, and end with a link to watch it. Use when someone asks to make, create or edit a video, reel, short, promo, explainer or ad with AI Video Engine, or to change a scene, the intro, the copy or the timing of a video already there.
---

# Make a video with AI Video Engine

AI Video Engine keeps each video in a **studio**. A video is a HyperFrames HTML composition stored
on our server; its files are a draft, and saving a version freezes the draft. Each studio may
follow one **design system** (the brand's colours, type, logos and rules). Everything here goes
through the AI Video Engine MCP tools (`list_studios`, `create_video`, `write_file` and the
rest). If the person also added our server as a connector, the same tools may show under that
connector's name; use them.

If the tools are missing or answer "unauthorized", the person has not signed in yet: tell them
to connect AI Video Engine (`/mcp` in Claude Code, or the plugin's Connectors tab on claude.ai)
and stop.

## 1. Find the studio

- `list_studios`. Use the studio the person named. With no name and exactly one studio, use it.
  Otherwise ask which one, listing the names.
- No studio yet: ask for a name and `create_studio`. Never make a name up.

## 2. Make or find the video

- **New video:** `create_video` with the studio id, the brief and the format.
  - The brief is the person's whole description, in their words. Do not shorten or reword it.
  - Format is `"full"` (landscape 16:9, 1920x1080) or `"short"` (portrait 9:16, 1080x1920, up to
    about 60 seconds). "Reel", "story", "vertical" and "TikTok" mean short. If they did not say,
    ask.
- **Existing video:** `list_videos` for the studio and match the brief the person describes. Then
  `list_files` and `read_file` what you will change. Change only what they asked for: the draft
  may hold edits they made in the web app.

## 3. Read the brand once

`read_design_system` with the video id, once per video.

- It returns `null` when the studio has none: go on with a clean, neutral look, and say at the
  end that the `brand-kit` skill can set one up.
- Otherwise read its `SKILL.md` and `DESIGN.md` and follow them, with their exact values. Read
  `tokens.json` or other text files with `read_design_system_file` only when you need them.
- Put the files the video uses (logo, `tokens.css`, fonts) into the draft with **one**
  `use_design_system_file` call, then refer to them as `design-system/<path>`, for example
  `<img src="design-system/assets/Logos/logo.svg">`.

## 4. Write the composition

Load the `hyperframes` skill and follow its contract and its reference for this kind of video.
Then apply these rules, which win where they differ from it:

- The files live on our server, not on disk. Write each whole file with `write_file`; read a file
  before changing it.
- The root is `index.html`, a complete HTML document whose root element is
  `<div id="root" data-composition-id="main" data-start="0" data-duration="<seconds>" data-width="<w>" data-height="<h>">`,
  at 30 fps. Scene files go under `compositions/`, as the skill describes.
- Load GSAP with
  `<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`. Do not load
  the HyperFrames runtime: the player adds it.
- Skip the skill's `npx hyperframes` commands (init, preview, render, snapshot, events) and its
  desktop app. Our web app previews and renders the video.
- Fonts: use the design system's fonts (`design-system/fonts/`, through `tokens.css`) or the
  fonts the HyperFrames skill bundles. Never load fonts from Google Fonts or another site.
- Media: use what is under `assets/` (`list_files` shows it) by relative path, such as
  `assets/clip.mp4`. To add an image, audio or video file from an https link, use
  `save_file_from_url` to save it under `assets/` first. Draw everything else with HTML, CSS and
  inline SVG.

Details and a minimal skeleton: `references/composition.md`.

## 5. Save and show it

- `save_version` once every `write_file` has returned, never in the same step as a write. For an
  edit, save only when the person asks or the change is finished.
- `get_video_preview` with the video id, and end your reply with that link. It opens the video's
  page, where the person watches it in the player, picks a version, renders an MP4 and keeps
  editing. It opens for anyone signed in to the studio's organization.
- Reply in one or two sentences: what you made or changed, then the link.

## Deleting

`delete_video` and `delete_studio` cannot be undone, and a studio takes all its videos with it.
Use them only when the person asked, and only after they confirm the exact name in a later
message.

## When something goes wrong

`references/troubleshooting.md`.
