// app/api/upload/route.ts
export async function PUT(req: Request) {
  const key = new URL(req.url).searchParams.get('key')!
  const res = await fetch(`${process.env.R2_WORKER_URL}/upload?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.R2_AUTH_SECRET}`,
      'Content-Type': req.headers.get('Content-Type') || 'application/octet-stream',
    },
    body: req.body,
    // @ts-ignore - needed for streaming body in Node runtime
    duplex: 'half',
  })
  return res
}