'use client'

// components/blog/markdown-editor.tsx
// Isolated file that owns the CodeMirror dynamic import.
// Keeping it in its own module is what prevents the Turbopack
// "negative timestamp" error — dynamic() must not share a module
// with server-graph imports.

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// The dynamic import lives here and ONLY here.
const CodeMirror = dynamic(
    () => import('@uiw/react-codemirror').then(m => m.default ?? m),
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

export function MarkdownEditor({ value, onChange, minHeight = '100%' }: MarkdownEditorProps) {
    // Load the markdown extension client-side only, after mount
    const [extensions, setExtensions] = useState<any[]>([])

    useEffect(() => {
        let cancelled = false
        import('@codemirror/lang-markdown').then(m => {
            if (!cancelled) setExtensions([m.markdown()])
        })
        return () => { cancelled = true }
    }, [])

    return (
        <CodeMirror
            value={value}
            height={minHeight}
            extensions={extensions}
            onChange={onChange}
            basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                syntaxHighlighting: true,
            }}
            style={{ fontSize: '13px', height: '100%' }}
            className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto [&_.cm-content]:font-mono [&_.cm-content]:py-4 [&_.cm-content]:px-5 [&_.cm-content]:text-[#000]"
        />
    )
}