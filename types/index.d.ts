/** One render the pane follows, as get_render last answered it. */
export type RenderRow = {
  renderId: string
  videoId: string
  where: 'my-computer' | 'our-server'
  status: 'queued' | 'running' | 'done' | 'failed' | 'canceled'
  stage: string | null
  progress: number
  error: string | null
  startedAt: number
  playerUrl: string | null
  webUrl: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'videoengine': { renders: Shaped<RenderRow[]> }
  }
}
