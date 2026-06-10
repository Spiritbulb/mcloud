// packages/auth/src/provider.tsx
// Client auth-context provider seam — currently a PASSTHROUGH.
//
// Nothing in the app consumes AuthKit's client hooks (useAuth / useAccessToken /
// useTokenClaims), and the session is resolved + refreshed server-side in the
// middleware (see prepareMiddleware → authkit). Mounting WorkOS's <AuthKitProvider>
// here added periodic checkSessionAction/getAuthAction polling whose re-renders
// raced portal-based UI (the sidebar's tooltips/sheet) and threw
// "Cannot read properties of null (reading 'removeChild')".
//
// Re-introduce a real provider here ONLY if a client component starts needing the
// auth context — keep it in lockstep with lib/auth/index.ts (the active provider).
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
