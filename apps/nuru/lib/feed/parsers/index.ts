import type { RawItem } from '../types'
import { parseMoe } from './moe'

export const PARSERS: Record<string, (html: string, base: string) => RawItem[]> = {
  moe: parseMoe,
}
