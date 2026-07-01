// engine.ts — the shared Liquid engine. Templates are bundled as strings in
// themes-manifest.ts (no runtime disk access). Server-only.
import { Liquid } from 'liquidjs'
import { themeFiles } from './themes-manifest'

export const engine = new Liquid({
    extname: '.liquid',
    cache: process.env.NODE_ENV === 'production',
    outputEscape: 'escape',
    globals: {
        ga_tracking_id: process.env.GA_TRACKING_ID || 'G-P7RJ7JW0BM',
    },
})

engine.options.fs = {
    sep: '/',
    readFileSync: (file: string) => {
        const key = file.replace(/\.liquid$/, '')
        if (themeFiles[key] !== undefined) return themeFiles[key]
        throw new Error(`ENOENT: ${file}`)
    },
    existsSync: (file: string) => file.replace(/\.liquid$/, '') in themeFiles,
    resolve: (_root: string, file: string) => file.replace(/\\/g, '/').replace(/^\//, ''),
    readFile: async (file: string) => {
        const key = file.replace(/\.liquid$/, '')
        if (themeFiles[key] !== undefined) return themeFiles[key]
        throw new Error(`ENOENT: ${file}`)
    },
    exists: async (file: string) => file.replace(/\.liquid$/, '') in themeFiles,
}

engine.registerFilter('money', (amount: number, currency = 'KES') => {
    if (amount == null) return ''
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
})

engine.registerFilter('date_format', (date: string | Date, style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium') => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-KE', { dateStyle: style })
})

engine.registerFilter('reading_time', (minutes: number | null) => (minutes ? `${minutes} min read` : ''))

engine.registerFilter('img_tag', (url: string, alt = '', cls = '') =>
    url ? `<img src="${url}" alt="${alt}" class="${cls}" />` : '',
)
