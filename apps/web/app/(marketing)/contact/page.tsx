import type { Metadata } from 'next'
import ContactClient from './contact-client'

export const metadata: Metadata = {
    title: 'Contact Sales | Menengai Cloud',
    description: 'Get in touch with the Menengai Cloud team to discuss your project.',
}

export default function Page() {
    return <ContactClient />
}
