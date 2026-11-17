# Composition details for AI Video Engine

What the `hyperframes` skill leaves to the host, as AI Video Engine runs it.

## Sizes

| Format  | Size        | Use                                   |
| ------- | ----------- | ------------------------------------- |
| `full`  | 1920 x 1080 | Landscape: YouTube, websites, decks   |
| `short` | 1080 x 1920 | Portrait: Reels, Shorts, TikTok, up to about 60 s |

Always 30 fps. The video's length is the root's `data-duration`.

## Minimal `index.html`

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="design-system/tokens.css" />
    <style>
      html, body { margin: 0; background: #000; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="8"
         data-width="1920" data-height="1080">
      <h1 id="title" class="clip" data-start="0" data-duration="8">Hello</h1>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.from("#title", { opacity: 0, y: 40, duration: 0.8, ease: "power3.out" }, 0.2);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
```

Leave out the `tokens.css` link when the studio has no design system.

## Paths

| Prefix           | What is there                                          | How it gets there        |
| ---------------- | ------------------------------------------------------ | ------------------------ |
| `assets/`        | Images, audio and clips for this video                 | The person uploads them in the web app, or `save_file_from_url` |
| `design-system/` | Logo, fonts, `tokens.css` from the studio's design system | `use_design_system_file` |
| `compositions/`  | One HTML file per scene, if the video uses scenes      | `write_file`             |

All paths are relative, with no leading `/`. Fonts from the design system need an
`@font-face` pointing at `design-system/fonts/<file>`.

## Editing an existing video

1. `list_files`, then `read_file` each file you will touch.
2. Change only what was asked. Keep the person's own edits.
3. Write whole files back with `write_file`.
4. `save_version` when the change is done and the person wants it kept.
5. `get_video_preview` and give the link.

## Working on disk in Claude Code

In Claude Code you may draft the files in a local folder first and run `npx hyperframes check`
there, then send each file with `write_file`. Our server is still the source of truth: read the
draft from it before changing a video someone else may have edited.
