import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"

function hashPass(p: string) {
    return createHash("sha256").update(p + "mcloud-docs-salt").digest("hex")
}

export async function POST(req: NextRequest) {
    const { passphrase } = await req.json()
    const correct = process.env.DOCS_ADMIN_PASSPHRASE ?? "menengai-docs-admin"

    if (passphrase !== correct) {
        return NextResponse.json({ error: "Incorrect passphrase" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set("docs_admin_token", hashPass(correct), {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
    })
    return res
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete("docs_admin_token")
    return res
}
