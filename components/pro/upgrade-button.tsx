// components/UpgradeButton.tsx
'use client'
import { useEffect } from 'react'

export function UpgradeButton({ storeId, storeName }: { storeId: string, storeName: string }) {
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/intasend-inlinejs-sdk@4.0.2/build/intasend-inline.js'
        script.async = true
        document.body.appendChild(script)
        return () => { document.body.removeChild(script) }
    }, [])

    return (
        <button
            className="intaSendPayButton"
            data-amount="2500"
            data-currency="KES"
            data-email=""
            data-api_ref={`pro-${storeId}`}
            data-comment={`Menengai Cloud Pro | ${storeName}`}
            onClick={() => {
                if (typeof window !== 'undefined') {
                    new (window as any).IntaSend({
                        publicAPIKey: process.env.NEXT_PUBLIC_INTASEND_PUBLIC_KEY,
                        live: process.env.NEXT_PUBLIC_INTASEND_SANDBOX !== 'true',
                    })
                        .on('COMPLETE', () => window.location.href = `?upgraded=1`)
                        .on('FAILED', (e: any) => console.error(e))
                }
            }}
        >
            Upgrade to Pro — KES 2,500
        </button>
    )
}