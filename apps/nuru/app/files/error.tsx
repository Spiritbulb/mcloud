'use client'

// Covers /files and /files/[id]: a database outage, say, shows this instead of an uncaught error.
// retry() re-fetches the server page (Next 16.3+); reset() would only re-render what already failed.
export default function FilesError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="ui-sans max-w-2xl">
      <p role="alert" className="text-sm">Nuru couldn&apos;t load your files right now.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Try again
      </button>
    </section>
  )
}
