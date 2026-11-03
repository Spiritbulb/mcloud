// 1200x630 share card for docs and guides, in the style of app/opengraph-image.tsx.

import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }

export function docsOgImage(eyebrow: string, title: string) {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #063 0%, #3fa9f5 100%)',
                    padding: '72px',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 700 }}>
                    <span>Menengai Cloud</span>
                    <span style={{ opacity: 0.6 }}>/</span>
                    <span style={{ opacity: 0.85 }}>{eyebrow}</span>
                </div>
                <div style={{ display: 'flex', fontSize: title.length > 60 ? 60 : 72, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1040 }}>
                    {title}
                </div>
                <div style={{ display: 'flex', fontSize: 28, opacity: 0.9 }}>mcloud.co.ke/docs</div>
            </div>
        ),
        { ...OG_SIZE },
    )
}
