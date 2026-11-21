import { expect, test } from 'claude-code/testing'


const ID = 'fe27d742-979f-4d11-bc10-031238e763f0'

const PANE = {
  plugin: 'videoengine',
  component: 'Pane',
  requestId: 'render',
  surface: 'desktop',
  props: {
    title: 'Render',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const row = (change: object) => ({
  renderId: ID,
  videoId: 'v1',
  where: 'our-server',
  status: 'running',
  stage: 'capturing',
  progress: 42,
  error: null,
  startedAt: 0,
  playerUrl: null,
  webUrl: null,
  ...change,
})

test('a render_version call adds the render and opens the pane', async ($, on) => {
  let opened = ''
  on('ui.open', (_, e) => {
    opened = e.id
    return { value: { isPlaced: true } }
  })
  on('tool.call', () => ({
    result: { content: [{ type: 'text', text: JSON.stringify({ renderId: ID, status: 'queued', where: 'my-computer' }) }] },
  }))

  // Our MCP tools are not in the types: a plain call keeps tsc from expanding every tool's input.
  const { call } = $.tool as unknown as { call: (input: Record<string, unknown>) => Promise<unknown> }
  await call({
    tool: 'mcp__plugin_videoengine_videoengine__render_version',
    versionId: 'x',
    where: 'my-computer',
  })

  expect(opened).toBe('render')
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /Waiting/ }))?.text).toBe('Waiting to render')
  expect((await ui.find({ type: 'Text', text: /computer/ }))?.text).toBe('On this computer')
  expect(await ui.find({ type: 'Button', text: /our servers/ })).toBeTruthy()
  await ui.unmount()
})

test('other tools leave the pane alone', async ($, on) => {
  let opened = false
  on('ui.open', () => {
    opened = true
    return { value: { isPlaced: true } }
  })
  on('tool.call', () => ({ result: { content: [{ type: 'text', text: `{"renderId":"${ID}"}` }] } }))

  // Our MCP tools are not in the types: a plain call keeps tsc from expanding every tool's input.
  const { call } = $.tool as unknown as { call: (input: Record<string, unknown>) => Promise<unknown> }
  await call({ tool: 'mcp__plugin_videoengine_videoengine__get_render', renderId: ID })
  expect(opened).toBe(false)
})

test('a running render shows its stage and percent', async ($, on) => {
  // What the mod stored: its atom keeps { shape, value }.
  on('state.get', () => ({ value: { value: { shape: 'renders-1', value: [row({})] }, version: 1 } }))
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /^Rendering$/ }))?.text).toBe('Rendering')
  // A Progress is drawn as its label and figure in one Text, over a bar of Boxes.
  expect((await ui.find({ type: 'Text', text: /Capturing frames/ }))?.text).toContain('42%')
  expect(await ui.find({ type: 'Button', text: /Cancel/ })).toBeTruthy()
  await ui.unmount()
})

test('a done render offers Preview, changes and the web app', async ($, on) => {
  // What the mod stored: its atom keeps { shape, value }.
  on('state.get', () => ({ value: { value: { shape: 'renders-1', value: [row({ status: 'done', progress: 100, webUrl: 'https://video.ariva.cloud/x' })] }, version: 1 } }))
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /Ready/ }))?.text).toBe('Ready to watch')
  expect(await ui.find({ type: 'Button', text: /Preview/ })).toBeTruthy()
  expect(await ui.find({ type: 'Button', text: /Make changes/ })).toBeTruthy()
  expect(await ui.find({ type: 'Link', text: /web app/ })).toBeTruthy()
  expect(await ui.find({ type: 'Button', text: /Cancel/ })).toBeFalsy()
  await ui.unmount()
})

test('a failed render shows the reason', async ($, on) => {
  // What the mod stored: its atom keeps { shape, value }.
  on('state.get', () => ({ value: { value: { shape: 'renders-1', value: [row({ status: 'failed', error: 'Chrome crashed' })] }, version: 1 } }))
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /crashed/ }))?.text).toBe('Chrome crashed')
  await ui.unmount()
})
