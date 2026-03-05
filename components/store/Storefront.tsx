'use client'

import type { StoreFrontProps } from '../../src/themes/types'
import ClassicStoreFront from '../../src/themes/classic/StoreFront'
import NoirStoreFront from '../../src/themes/noir/StoreFront'
import MinimalStoreFront from '../../src/themes/minimal/StoreFront'

const THEMES: Record<string, React.ComponentType<StoreFrontProps>> = {
    classic: ClassicStoreFront,
    noir: NoirStoreFront,
    minimal: MinimalStoreFront,
}

export default function StoreFront(props: StoreFrontProps) {
    const themeId = (props.store.settings as any)?.themeId ?? 'classic'
    const Component = THEMES[themeId] ?? ClassicStoreFront
    return <Component {...props} />
}