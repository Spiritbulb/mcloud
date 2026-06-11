'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@mcloud/ui/utils'

interface MdxContentProps {
    content: string
    className?: string
    size?: 'sm' | 'base'
}

const components = {
    h1: ({ children }: any) => <h1 className="sf-heading text-2xl font-light mt-6 mb-3">{children}</h1>,
    h2: ({ children }: any) => <h2 className="sf-heading text-xl font-light mt-5 mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="sf-heading text-lg font-normal mt-4 mb-2">{children}</h3>,
    p: ({ children }: any) => <p className="my-3 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="my-3 ml-5 list-disc space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="my-3 ml-5 list-decimal space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }: any) => (
        <blockquote
            className="my-4 pl-4 italic"
            style={{ borderLeft: '3px solid var(--sf-accent)', color: 'var(--sf-foreground-subtle)' }}
        >
            {children}
        </blockquote>
    ),
    code: ({ inline, children }: any) =>
        inline ? (
            <code
                className="px-1.5 py-0.5 rounded text-[0.85em] font-mono"
                style={{ background: 'color-mix(in srgb, var(--sf-foreground) 8%, transparent)' }}
            >
                {children}
            </code>
        ) : (
            <pre
                className="my-4 p-4 rounded overflow-x-auto text-sm font-mono"
                style={{ background: 'color-mix(in srgb, var(--sf-foreground) 6%, transparent)' }}
            >
                <code>{children}</code>
            </pre>
        ),
    a: ({ href, children }: any) => (
        <a href={href} className="underline underline-offset-2" style={{ color: 'var(--sf-accent)' }} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
    hr: () => <hr className="my-6" style={{ borderColor: 'var(--sf-border)' }} />,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    table: ({ children }: any) => (
        <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ borderColor: 'var(--sf-border)' }}>{children}</table>
        </div>
    ),
    th: ({ children }: any) => (
        <th className="px-3 py-2 text-left font-medium" style={{ borderBottom: '1px solid var(--sf-border-strong)', color: 'var(--sf-foreground)' }}>
            {children}
        </th>
    ),
    td: ({ children }: any) => (
        <td className="px-3 py-2" style={{ borderBottom: '1px solid var(--sf-border)', color: 'var(--sf-foreground-subtle)' }}>
            {children}
        </td>
    ),
}

export function MdxContent({ content, className, size = 'base' }: MdxContentProps) {
    if (!content) return null
    return (
        <div
            className={cn(
                size === 'sm' ? 'text-sm' : 'text-base',
                'leading-relaxed',
                className,
            )}
            style={{ color: 'var(--sf-foreground-subtle)' }}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    )
}
