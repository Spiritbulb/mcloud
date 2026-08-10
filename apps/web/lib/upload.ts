// upload.ts — call your own API instead of the worker directly
export async function uploadImage(file: File, bucket: any, path: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const key = `${bucket}/${path}.${ext}`

    const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    })
    if (!res.ok) throw new Error(await res.text())
    return (await res.json()).url
}