# Troubleshooting

| What you see | What to do |
| --- | --- |
| No `videoengine` tools, or "unauthorized" | The person is not signed in. Claude Code: run `/mcp`, pick `videoengine`, sign in. claude.ai, Cowork, desktop: Customize, Plugins, AI Video Engine, Connectors, Connect. |
| Signed in to the wrong organization | Sign out of the connector and sign in again; the sign-in page asks which organization Claude acts for. |
| `list_studios` is empty | Ask for a studio name and `create_studio`. |
| `read_design_system` returns `null` | The studio has no design system. Use a neutral look; offer the `brand-kit` skill. |
| `save_version` saved older files | It ran in the same step as a `write_file`. Call it again on its own. |
| The player shows a blank or black frame | Check the root's `data-duration`, that every timed element has `class="clip"`, `data-start` and `data-duration`, and that the timeline is registered as `window.__timelines["main"]`. |
| An image or clip does not show | The path must be relative (`assets/x.png`, not `/assets/x.png`) and the file must be in `list_files`. |
| `save_file_from_url` refuses a link | It must be https and reach a real image, audio or video file. Links from generators expire quickly; save as soon as the file is ready. |
| `get_video_preview` is missing | The server is older than the plugin. Tell the person to open the studio at https://video.ariva.cloud/studios. |

Support: https://github.com/manishonc/videoengine-plugin/issues
