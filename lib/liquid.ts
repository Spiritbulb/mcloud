// lib/liquid.ts
import { Liquid } from 'liquidjs'
import path from 'path'

const themesRoot = path.resolve(process.cwd(), 'src/liquid-themes')

export const engine = new Liquid({
    root: [
        themesRoot,
        path.join(themesRoot, 'classic/sections'),
        path.join(themesRoot, 'classic/snippets'),
    ],
    extname: '.liquid',
    cache: process.env.NODE_ENV === 'production',
})

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