// Element styles for guide articles (content/guides/*.mdx). Required by @next/mdx
// in the App Router. There is no typography plugin, so each element is styled here.

import type { MDXComponents } from "mdx/types"
import Link from "next/link"

const components: MDXComponents = {
    h2: (props) => <h2 className="mt-10 mb-3 text-xl sm:text-2xl font-montserrat font-bold text-foreground scroll-mt-24" {...props} />,
    h3: (props) => <h3 className="mt-6 mb-2 text-base sm:text-lg font-montserrat font-semibold text-foreground" {...props} />,
    p: (props) => <p className="my-4 text-[15px] sm:text-base leading-relaxed text-foreground/85" {...props} />,
    ul: (props) => <ul className="my-4 ml-5 list-disc space-y-2 text-[15px] sm:text-base text-foreground/85" {...props} />,
    ol: (props) => <ol className="my-4 ml-5 list-decimal space-y-2 text-[15px] sm:text-base text-foreground/85" {...props} />,
    li: (props) => <li className="pl-1 leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
    blockquote: (props) => <blockquote className="my-5 border-l-4 border-primary/40 bg-secondary/40 px-4 py-3 rounded-r-lg text-sm text-foreground/85" {...props} />,
    code: (props) => <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.9em]" {...props} />,
    table: (props) => (
        <div className="my-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm" {...props} />
        </div>
    ),
    th: (props) => <th className="border-b border-border bg-secondary/60 px-4 py-2.5 text-left font-medium text-foreground" {...props} />,
    td: (props) => <td className="border-b border-border px-4 py-2.5 align-top text-muted-foreground" {...props} />,
    a: ({ href = "", ...props }) => {
        const className = "font-medium text-primary underline underline-offset-2 hover:no-underline"
        return href.startsWith("/")
            ? <Link href={href} className={className} {...props} />
            : <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...props} />
    },
}

export function useMDXComponents(): MDXComponents {
    return components
}
