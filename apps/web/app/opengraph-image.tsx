// Branded 1200x630 share card, rendered at the edge. Replaces the missing
// static /og-image.jpg the metadata used to reference (link shares were blank).
// Next serves this automatically for the root; the metadata's openGraph/twitter
// images resolve to it, so shares get a real, always-present preview.
import { ImageResponse } from 'next/og'

export const alt = 'Menengai Cloud. Business websites and apps for Kenya, fully managed.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
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
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
                    Menengai Cloud
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 940 }}>
                        Business websites and apps, fully managed.
                    </div>
                    <div style={{ fontSize: 30, opacity: 0.9, maxWidth: 880 }}>
                        The commerce engine of Spiritbulb. Hosting, payments, and updates, handled. mcloud.co.ke
                    </div>
                </div>
            </div>
        ),
        { ...size },
    )
}
