// Dark background for all auth pages so Auth0 redirects never flash white.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-svh bg-[#0a0a0a] text-white">{children}</div>
}
