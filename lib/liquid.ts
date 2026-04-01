// lib/liquid.ts
import { Liquid } from 'liquidjs'
import { themeFiles } from '@/src/lib/theme-manifest'

export const engine = new Liquid({
    extname: '.liquid',
    cache: process.env.NODE_ENV === 'production',
    globals: {
        ga_tracking_id: process.env.GA_TRACKING_ID || 'G-P7RJ7JW0BM',
    },
})

// In-memory filesystem — no disk access at runtime
engine.options.fs = {
    sep: '/',
    readFileSync: (file: string) => {
        const key = file.replace(/\.liquid$/, '')
        if (themeFiles[key] !== undefined) return themeFiles[key]
        throw new Error(`ENOENT: ${file}`)
    },
    existsSync: (file: string) => {
        const key = file.replace(/\.liquid$/, '')
        return key in themeFiles
    },
    resolve: (_root: string, file: string, _ext: string) => {
        // strip leading slash if any, normalize to forward slashes
        return file.replace(/\\/g, '/').replace(/^\//, '')
    },
    // async counterparts required by LiquidJS FS interface
    readFile: async (file: string) => {
        const key = file.replace(/\.liquid$/, '')
        if (themeFiles[key] !== undefined) return themeFiles[key]
        throw new Error(`ENOENT: ${file}`)
    },
    exists: async (file: string) => {
        const key = file.replace(/\.liquid$/, '')
        return key in themeFiles
    },
}

// {{ product.price | money: store.currency }}
engine.registerFilter('money', (amount: number, currency = 'KES') => {
    if (amount == null) return ''
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount)
})

// {{ post.published_at | date_format }}
// {{ post.published_at | date_format: 'long' }}
engine.registerFilter('date_format', (
    date: string | Date,
    style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-KE', { dateStyle: style })
})

// {{ post.reading_time_minutes | reading_time }}
// → "5 min read"
engine.registerFilter('reading_time', (minutes: number | null) => {
    if (!minutes) return ''
    return `${minutes} min read`
})

// {{ store.logo_url | img_tag: store.name }}
// → <img src="..." alt="..." class="sf-logo" />
engine.registerFilter('img_tag', (url: string, alt = '', cls = '') => {
    if (!url) return ''
    return `<img src="${url}" alt="${alt}" class="${cls}" />`
})