import type { DockSelection } from './chat-dock'

export type ChatWindowPosition = { x: number; y: number }
export type ChatWindow = {
  id: string
  selection: DockSelection | null
  title: string
  minimized: boolean
  position: ChatWindowPosition | null
  z: number
}

export function openChatWindow(
  windows: ChatWindow[],
  id: string,
  selection: DockSelection | null,
  title: string
): ChatWindow[] {
  const z = Math.max(0, ...windows.map((window) => window.z)) + 1
  const existing = windows.find((window) => window.id === id)
  if (existing)
    return windows.map((window) => (window.id === id ? { ...window, title, minimized: false, z } : window))
  return [{ id, selection, title, minimized: false, position: null, z }, ...windows]
}

export function dockChatWindow(windows: ChatWindow[], id: string, beforeId?: string): ChatWindow[] {
  const target = windows.find((window) => window.id === id)
  if (!target) return windows
  const remaining = windows.filter((window) => window.id !== id)
  const before = beforeId ? remaining.findIndex((window) => window.id === beforeId) : remaining.length
  remaining.splice(before < 0 ? remaining.length : before, 0, { ...target, position: null })
  return remaining
}

export function clampChatWindow(
  position: ChatWindowPosition,
  viewport: { width: number; height: number },
  size: { width: number; height: number }
): ChatWindowPosition {
  return {
    x: Math.max(8, Math.min(position.x, Math.max(8, viewport.width - size.width - 8))),
    y: Math.max(8, Math.min(position.y, Math.max(8, viewport.height - size.height - 8))),
  }
}

export function isChatWindowDrag(start: ChatWindowPosition, current: ChatWindowPosition) {
  return Math.hypot(current.x - start.x, current.y - start.y) >= 6
}
