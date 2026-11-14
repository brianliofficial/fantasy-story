import { onBeforeUnmount, ref, type Ref } from 'vue'

export interface PoolDrag {
  eventId: string
  title: string
  x: number
  y: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  active: boolean
  overPool: string | null
  overIndex: number
}

function hitColumn(board: HTMLElement, x: number, y: number, draggingId: string): { pool: string; index: number } | null {
  const columns = [...board.querySelectorAll<HTMLElement>('[data-pool]')]
  for (const column of columns) {
    const rect = column.getBoundingClientRect()
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue
    const pool = column.dataset.pool
    if (!pool) continue
    let index = 0
    for (const card of column.querySelectorAll<HTMLElement>('[data-card-id]')) {
      if (card.dataset.cardId === draggingId) continue
      const cardRect = card.getBoundingClientRect()
      if (cardRect.height === 0) continue
      if (y > cardRect.top + cardRect.height / 2) index += 1
    }
    return { pool, index }
  }
  return null
}

export function usePoolDrag(boardRef: Ref<HTMLElement | null>, onDrop: (id: string, pool: string, index: number) => void) {
  const drag = ref<PoolDrag | null>(null)
  let pointerId = -1
  let startX = 0
  let startY = 0

  const end = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    const current = drag.value
    drag.value = null
    if (current?.active && current.overPool) onDrop(current.eventId, current.overPool, current.overIndex)
  }

  const onMove = (event: PointerEvent) => {
    const current = drag.value
    if (!current || event.pointerId !== pointerId) return
    const distance = (event.clientX - startX) ** 2 + (event.clientY - startY) ** 2
    if (!current.active && distance < 36) return
    const board = boardRef.value
    const hit = board ? hitColumn(board, event.clientX, event.clientY, current.eventId) : null
    drag.value = {
      ...current,
      active: true,
      x: event.clientX,
      y: event.clientY,
      overPool: hit?.pool ?? null,
      overIndex: hit?.index ?? 0,
    }
    if (!board) return
    if (event.clientX < 72) board.scrollLeft -= 18
    else if (event.clientX > window.innerWidth - 72) board.scrollLeft += 18
  }

  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    end()
  }

  function begin(event: PointerEvent, eventId: string, title: string) {
    if (drag.value || event.button !== 0) return
    const handle = event.currentTarget
    if (!(handle instanceof HTMLElement)) return
    const card = handle.closest<HTMLElement>('[data-card-id]')
    const rect = card?.getBoundingClientRect()
    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    drag.value = {
      eventId,
      title,
      x: event.clientX,
      y: event.clientY,
      offsetX: rect ? event.clientX - rect.left : 28,
      offsetY: rect ? event.clientY - rect.top : 20,
      width: rect?.width ?? 240,
      height: rect?.height ?? 72,
      active: false,
      overPool: null,
      overIndex: 0,
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  onBeforeUnmount(end)

  return { drag, begin }
}
