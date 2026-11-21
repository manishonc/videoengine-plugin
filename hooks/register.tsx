// The render pane: when Claude starts an AI Video Engine render (render_version), a pane follows it
// live through our MCP server, and when the MP4 is done it plays in the built-in browser.
// Plan: https://claude.ai/artifact/TNEJCTGYziYmPQdEw4bJ1Y#b86534a6-d145
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderInput } from 'claude-code'

import type { RenderRow } from '../types'

const PANE = 'render'
const TITLE = 'Render'
const POLL_MS = 2000
/** How many renders the pane keeps; the newest first. */
const KEEP = 5

const renders = atom({ plugin: 'videoengine', key: 'renders' } as const, [], {
  shape: 'renders-1',
})

/** The plugin's own server first (its manifest key), then the installed plugin's. */
const SERVERS = ['videoengine', 'plugin:videoengine:videoengine']

const isActive = (row: RenderRow) => row.status === 'queued' || row.status === 'running'

async function server($: EngineInterface) {
  for (const name of SERVERS) {
    const found = await $.mcp.connect(name)
    if (found.isConnected) return found.server
  }
  throw new Error('The AI Video Engine server is not connected. Sign in with /mcp.')
}

/** Calls one of our MCP tools and returns its structured result. */
async function callTool<T>($: EngineInterface, tool: string, args: Record<string, unknown>) {
  const result = await $.mcp.call(await server($), tool, args)
  const block = result.content.find((one) => one.type === 'text')
  const text = (block && 'text' in block ? block.text : undefined) ?? ''
  if (result.isError) throw new Error(text.slice(0, 300) || `${tool} failed`)
  if (result.structuredContent) return result.structuredContent as T
  return JSON.parse(text || '{}') as T
}

type Progress = {
  renderId: string
  videoId: string
  where: RenderRow['where']
  status: RenderRow['status']
  stage: string | null
  progress: number | null
  error: string | null
}

function patch($: EngineInterface, renderId: string, change: Partial<RenderRow>) {
  return update($, renders, (list) =>
    list.map((row) => (row.renderId === renderId ? { ...row, ...change } : row)),
  )
}

/** Opens a page in Claude Code's built-in browser and brings that pane into view. */
async function openInBrowser($: EngineInterface, url: string) {
  const browser = await $.mcp.connect('Claude Browser')
  if (!browser.isConnected) {
    await $.ui.toast('Could not open the built-in browser. Use Open in web app instead.')
    return
  }
  await $.mcp.call(browser.server, 'preview_start', { url })
  const view = await $.mcp.connect('ccd_view')
  if (view.isConnected) await $.mcp.call(view.server, 'show_pane', { pane: 'preview' })
}

/** A fresh player link (they last an hour), opened beside the chat. */
async function preview($: EngineInterface, row: RenderRow) {
  try {
    const link = await callTool<{ url: string }>($, 'get_player_link', { renderId: row.renderId })
    await patch($, row.renderId, { playerUrl: link.url })
    await openInBrowser($, link.url)
  } catch (error) {
    await $.ui.toast(`Preview failed: ${String(error)}`)
  }
}

let isPolling = false

/** Asks for every render still waiting or running; on done, opens its preview. */
async function poll($: EngineInterface) {
  if (isPolling) return
  isPolling = true
  try {
    for (const row of (await read($, renders)).filter(isActive)) {
      let now: Progress
      try {
        now = await callTool<Progress>($, 'get_render', { renderId: row.renderId })
      } catch {
        continue // Try again on the next tick.
      }
      await patch($, row.renderId, {
        videoId: now.videoId,
        where: now.where,
        status: now.status,
        stage: now.stage,
        progress: now.progress ?? 0,
        error: now.error,
      })
      if (now.status !== 'done') continue
      try {
        const page = await callTool<{ url: string }>($, 'get_video_preview', {
          videoId: now.videoId,
        })
        await patch($, row.renderId, { webUrl: page.url })
      } catch {
        // The pane works without the web app link.
      }
      await preview($, { ...row, ...now, progress: 100 })
    }
  } finally {
    isPolling = false
  }
}

/** The renderId in a render_version result, however the host wrapped it. */
function renderIdIn(result: unknown) {
  return JSON.stringify(result ?? null).match(/renderId\\*"\s*:\s*\\*"([0-9a-f-]{36})/)?.[1]
}

const HEADLINE: Record<RenderRow['status'], string> = {
  queued: 'Waiting to render',
  running: 'Rendering',
  done: 'Ready to watch',
  failed: 'Render failed',
  canceled: 'Render canceled',
}

/** The first line of an engine error, short enough for a card; the full text is on the web app. */
function shortError(error: string) {
  const line = error.split('\n').find((one) => one.trim()) ?? error
  return line.length > 160 ? `${line.slice(0, 157)}...` : line
}

const STAGE: Record<string, string> = {
  preparing: 'Preparing',
  capturing: 'Capturing frames',
  encoding: 'Encoding the MP4',
  uploading: 'Uploading',
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    $.clock.every(POLL_MS, () => void poll($))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (!e.tool.endsWith('__render_version')) return ran
    // The call has run: nothing here may fail it.
    await follow($, e, ran).catch(() => undefined)
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    return drawPane($, e)
  })
}

/** Adds a render Claude just started to the pane and opens it. */
async function follow($: EngineInterface, call: unknown, ran: unknown) {
  {
    const renderId = renderIdIn(ran)
    if (!renderId) return
    const where = JSON.stringify(call).includes('my-computer') ? 'my-computer' : 'our-server'
    const row: RenderRow = {
      renderId,
      videoId: '',
      where,
      status: 'queued',
      stage: null,
      progress: 0,
      error: null,
      startedAt: Date.now(),
      playerUrl: null,
      webUrl: null,
    }
    await update($, renders, (list) =>
      [row, ...list.filter((one) => one.renderId !== renderId)].slice(0, KEEP),
    )
    await $.ui.open({ id: PANE, title: TITLE })
  }
}

async function drawPane($: EngineInterface, e: RenderInput) {
  {
    const { Box, Text, Button, Link, Progress } = $.ui.resolve(e)
    const list = await read($, renders)
    if (list.length === 0) {
      return <Text dimColor>No renders yet. Ask Claude to render a video.</Text>
    }

    const act = (work: () => Promise<unknown>) => async () => {
      try {
        await work()
        await poll($)
      } catch (error) {
        await $.ui.toast(String(error))
      }
    }

    return (
      <Box flexDirection="column" gap={1}>
        {list.map((row) => (
          <Box key={row.renderId} flexDirection="column" borderStyle="round" paddingX={1}>
            <Text bold>{HEADLINE[row.status]}</Text>
            <Text dimColor>{row.where === 'my-computer' ? 'On this computer' : 'On our servers'}</Text>
            {row.status === 'running' && (
              <Progress
                label={STAGE[row.stage ?? ''] ?? 'Starting'}
                value={row.progress}
                max={100}
                valueText={`${Math.round(row.progress)}%`}
              />
            )}
            {row.status === 'queued' && row.where === 'my-computer' && (
              <Text dimColor>Waiting for this computer to pick it up.</Text>
            )}
            {row.error && <Text color="error">{shortError(row.error)}</Text>}
            <Box flexDirection="row" gap={1}>
              {row.status === 'done' && (
                <Button variant="primary" onPress={act(() => preview($, row))}>
                  Preview
                </Button>
              )}
              {row.status === 'done' && (
                <Button
                  onPress={act(() =>
                    $.prompt.fill({ text: 'Change the video: ', mode: 'replace' }),
                  )}
                >
                  Make changes
                </Button>
              )}
              {row.webUrl && <Link href={row.webUrl}>Open in web app</Link>}
              {row.status === 'queued' && row.where === 'my-computer' && (
                <Button
                  onPress={act(() =>
                    callTool($, 'move_render_to_cloud', { renderId: row.renderId }),
                  )}
                >
                  Render on our servers
                </Button>
              )}
              {isActive(row) && (
                <Button
                  role="dismiss"
                  onPress={act(() => callTool($, 'cancel_render', { renderId: row.renderId }))}
                >
                  Cancel
                </Button>
              )}
              {!isActive(row) && (
                <Button
                  onPress={act(() =>
                    update($, renders, (all) => all.filter((one) => one.renderId !== row.renderId)),
                  )}
                >
                  Clear
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    )
  }
}
