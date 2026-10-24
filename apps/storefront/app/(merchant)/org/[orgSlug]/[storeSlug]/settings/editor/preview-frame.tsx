'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { cn } from '@mcloud/ui/utils'

export type Device = 'desktop' | 'tablet' | 'mobile'
export type PreviewHandle = { post: (msg: Record<string, unknown>) => void }

const WIDTH: Record<Device, string> = { desktop: '100%', tablet: '768px', mobile: '390px' }

/**
 * The live preview, double-buffered.
 *
 * Copy and structure changes need Liquid re-run server-side, i.e. a new page. Loading
 * it in place blanked the frame and threw the merchant back to the top on every
 * pause in typing. Instead the next page loads in a hidden frame; when it announces
 * itself (`mcloud:preview-ready`) the Editor replays the unsaved theme, scroll
 * position and selection into it, and only then does it replace the visible one.
 *
 * Messages are trusted only from our own frames (origin AND source), and edits only
 * from the visible one: a frame still loading has nothing the merchant could edit.
 */
const PreviewFrame = forwardRef<PreviewHandle, {
    src: string
    /** Bumped for every load, so the same URL can be reloaded (undo back to it after an in-place edit). */
    version: number
    origin: string
    device: Device
    /** A message from the visible frame. */
    onMessage: (data: Record<string, unknown>) => void
    /**
     * A frame announced itself; `post` talks to that frame. Replay unsaved state here.
     * Each page announces twice (theme listener, then editing bridge, in either
     * order); `data.from === 'bridge'` marks the one that can scroll and outline.
     */
    onReady: (post: (msg: Record<string, unknown>) => void, data: Record<string, unknown>) => void
}>(function PreviewFrame({ src, version, origin, device, onMessage, onReady }, ref) {
    const [frames, setFrames] = useState<{ id: number; src: string }[]>(() => [{ id: 0, src }])
    const [activeId, setActiveId] = useState(0)
    const nextId = useRef(1)
    const nodes = useRef(new Map<number, HTMLIFrameElement>())
    const activeRef = useRef(activeId)
    activeRef.current = activeId

    // One stable listener; the callbacks it calls are read through refs.
    const cb = useRef({ onMessage, onReady })
    cb.current = { onMessage, onReady }

    const postTo = (id: number) => (msg: Record<string, unknown>) => {
        try { nodes.current.get(id)?.contentWindow?.postMessage(msg, origin) } catch { /* the preview is an aid, never a gate */ }
    }

    useImperativeHandle(ref, () => ({ post: (msg) => postTo(activeRef.current)(msg) }))

    // A new version loads beside the visible frame. A pending one that has not
    // finished is replaced: only the latest draft is worth showing.
    const loadedVersion = useRef(version)
    useEffect(() => {
        if (loadedVersion.current === version) return
        loadedVersion.current = version
        setFrames((prev) => [...prev.filter((f) => f.id === activeRef.current), { id: nextId.current++, src }])
    }, [version, src])

    function promote(id: number) {
        // A frame superseded by a newer draft is gone; never make it the visible one.
        if (!nodes.current.has(id) || id <= activeRef.current) return
        setActiveId(id)
        setFrames((prev) => prev.filter((f) => f.id >= id))
    }

    useEffect(() => {
        function onWindowMessage(e: MessageEvent) {
            if (e.origin !== origin || !e.data || typeof e.data !== 'object') return
            let fromId: number | null = null
            for (const [id, node] of nodes.current) if (node.contentWindow === e.source) fromId = id
            if (fromId === null) return
            const data = e.data as Record<string, unknown>

            if (data.type === 'mcloud:preview-ready') {
                cb.current.onReady(postTo(fromId), data)
                // Swap once the bridge has restored scroll and outline, not before.
                if (data.from === 'bridge' && fromId !== activeRef.current) {
                    const id = fromId
                    // Two frames: let the replayed scroll and theme paint before the swap.
                    requestAnimationFrame(() => requestAnimationFrame(() => promote(id)))
                }
                return
            }
            if (fromId === activeRef.current) cb.current.onMessage(data)
        }
        window.addEventListener('message', onWindowMessage)
        return () => window.removeEventListener('message', onWindowMessage)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- postTo/promote only touch refs and setters
    }, [origin])

    const pending = frames.some((f) => f.id !== activeId)

    return (
        <div className="relative mx-auto h-full transition-[width] duration-200" style={{ width: WIDTH[device], maxWidth: '100%' }}>
            {frames.map((f) => (
                <iframe
                    key={f.id}
                    ref={(n) => { if (n) nodes.current.set(f.id, n); else nodes.current.delete(f.id) }}
                    src={f.src}
                    title={f.id === activeId ? 'Site preview' : 'Site preview (updating)'}
                    aria-hidden={f.id !== activeId || undefined}
                    tabIndex={f.id === activeId ? undefined : -1}
                    // A page that never announces itself (an error page, a timeout) is
                    // still shown, or the preview would be stuck on the old draft.
                    onLoad={() => {
                        if (f.id === activeRef.current) return
                        setTimeout(() => promote(f.id), 1500)
                    }}
                    className={cn(
                        'absolute inset-0 h-full w-full bg-background',
                        device !== 'desktop' && 'rounded-md border border-border shadow-sm',
                        f.id === activeId ? 'z-10' : 'pointer-events-none z-0 opacity-0',
                    )}
                />
            ))}
            {pending && (
                <div role="status" className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-md border border-border bg-card/95 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
                    <Spinner size={11} />
                    Updating preview
                </div>
            )}
        </div>
    )
})

export default PreviewFrame
