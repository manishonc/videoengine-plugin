# AI Video Engine for Claude

Make finished, on-brand videos from a brief, right from Claude. Describe the video you want.
Claude writes it as a [HyperFrames](https://hyperframes.heygen.com) composition in your
[AI Video Engine](https://video.ariva.cloud) studio, follows the studio's brand, saves a version,
and gives you a link to watch it, render the MP4 and keep editing.

## What you get

- **The AI Video Engine connector** (MCP server at
  `https://video-mcp.ariva.cloud/api/mcp/videoengine/mcp`). Claude can list and create studios
  and videos, write a video's files, save versions, manage your brand's design systems and get a
  link to each video.
- **`make-video` skill.** "Make a 20-second vertical promo for our oat latte." Claude picks the
  studio, reads its brand once, writes the composition, saves a version and ends with the link.
  It also edits videos you already have.
- **`brand-kit` skill.** "Set up our brand from acme.com." Claude builds a design system
  (colours, type, logos, fonts, rules) and attaches it to a studio, so every video follows it.
- **HyperFrames by HeyGen**, installed alongside as a dependency, which teaches Claude how to
  write compositions.

You need an AI Video Engine account. Sign up at https://video.ariva.cloud.

Full guide, with troubleshooting: https://video.ariva.cloud/claude

## Install

### Claude Code

```bash
claude plugin marketplace add manishonc/videoengine-plugin
```

```bash
claude plugin install videoengine@videoengine
```

Then run `/mcp` in Claude Code, pick `videoengine` and sign in. If HyperFrames did not install
with it, run:

```bash
claude plugin install hyperframes@claude-plugins-official
```

Update later with `claude plugin update videoengine@videoengine`.

### claude.ai, Cowork and the Claude desktop app

1. Open **Customize → Plugins → Add → Add marketplace** and enter
   `https://github.com/manishonc/videoengine-plugin`.
2. Install **AI Video Engine**.
3. On the plugin's **Connectors** tab, connect **videoengine** and sign in.

The plugin also appears in your Claude Code as `videoengine@synced`.

### Team and Enterprise organizations

An Owner opens **Organization settings → Plugins & skills**, uploads the plugin (or syncs a
private fork or mirror of this repo; org sync needs a private or internal repo) and sets it to
Available, Installed by default or Required.

### Only the connector

To get the tools without the skills: **Customize → Connectors → Add custom connector**, paste
`https://video-mcp.ariva.cloud/api/mcp/videoengine/mcp` and sign in.

### Other agents

The skills work in any agent that reads Agent Skills:

```bash
npx skills add manishonc/videoengine-plugin
```

Add the MCP server above in that agent's own settings.

## Signing in

Sign-in uses OAuth with your AI Video Engine account. No API key is stored in this plugin. When
you sign in you pick which organization Claude acts for; Claude then sees only that
organization's studios, videos and design systems. To switch organization, disconnect and sign
in again.

If you already added AI Video Engine as a custom connector on claude.ai, Claude Code uses that
connector and skips the plugin's copy of the same server, so there is nothing more to sign in
to. The skills work with either.

## Try it

- "Set up our brand from https://example.com and use it in the Launches studio."
- "Make a 15-second landscape intro for our product launch in the Launches studio."
- "In the oat latte video, make the last scene say Try it today."

## Watch renders in Claude Code

When Claude starts an MP4 render in Claude Code, a **Render** pane opens beside the chat. It
shows whether the video renders on our servers or on this computer, the stage and the progress.
When the MP4 is done, it plays in Claude Code's browser with video controls. The pane has
buttons to preview it again, ask for changes, open the video in the web app, cancel, or move a
waiting render from your computer to our servers. The player link lasts an hour; Preview makes a
new one.

The player opens in the Claude Code desktop app. In the terminal, use **Open in web app** to watch
it. On claude.ai there is no pane: Claude gives you the link instead.

## Render on your own computer

Videos can render on your own computer instead of our servers. You need Node.js 22.18 or newer,
on macOS 13 or newer, Linux (x64, with `unzip` and `xz`) or Windows (x64).

```sh
npx github:manishonc/videoengine-plugin connect
```

It shows a code and opens a page to approve it. Then leave this running:

```sh
npx github:manishonc/videoengine-plugin start
```

On a video's page in AI Video Engine, pick **My computer** before **Render MP4**. The MP4 goes
back to the video page, ready to download or publish. The first run downloads the Chrome and
FFmpeg versions our servers use (about 250 MB), so a video looks the same wherever it renders.

In Claude Code you can also just ask for an MP4: Claude starts the render and runs
`npx github:manishonc/videoengine-plugin run-once`, which renders it here and exits.

To skip a further browser download that the engine does not use (about 580 MB), put
`PUPPETEER_SKIP_DOWNLOAD=1 ` before `npx` the first time (macOS and Linux). To disconnect this
computer, run `npx github:manishonc/videoengine-plugin sign-out`.

## Privacy and support

- Privacy policy: https://video.ariva.cloud/privacy
- Terms: https://video.ariva.cloud/terms
- Help and bug reports: https://github.com/manishonc/videoengine-plugin/issues
