'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const MDEditor = dynamic(
    () => import('@uiw/react-md-editor').then(m => m.default ?? m),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Loading editor…</span>
            </div>
        ),
    }
)

interface MarkdownEditorProps {
    value: string
    onChange: (v: string) => void
    minHeight?: string
}

export function MarkdownEditor({
    value,
    onChange,
    minHeight = '100%',
}: MarkdownEditorProps) {
    const height = useMemo(
        () => ({ minHeight }),
        [minHeight],
    )

    return (
        <div data-color-mode="dark" className="h-full">
            <MDEditor
                value={value}
                onChange={v => onChange(v ?? '')}
                preview="edit"
                height={undefined}
                style={{ ...height }}
                className="h-full [&_.w-md-editor-content]:h-full"
            />
        </div>
    )
}
