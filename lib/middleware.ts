// middleware.ts ✅
import { middleware as proxy } from '@/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return proxy(request)
}

export { config } from '@/middleware'
