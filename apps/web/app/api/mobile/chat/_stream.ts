// Newline-delimited JSON streaming (SSE-style) for the chat endpoint. One JSON
// object per line; the client splits on '\n'. JSON.stringify escapes any inner
// newlines, so frames never break across lines.
export function sseEvent(obj: unknown): string {
  return JSON.stringify(obj) + '\n'
}

/**
 * Build a streaming Response whose body is produced by `producer`, which is
 * handed an `emit` that writes one JSON frame per call. The stream closes when
 * `producer` resolves; an error inside it emits a final error frame.
 */
export function streamingResponse(
  producer: (emit: (obj: unknown) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(sseEvent(obj)))
      try {
        await producer(emit)
      } catch (e) {
        emit({ type: 'error', error: (e as Error).message || 'stream_failed' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
