// app/components/owner-banner.ts
// This is compiled to a self-contained inline script and injected by middleware.
// It reads data-* attributes from its own script tag.

(function () {
    const STORAGE_KEY = 'mng_banner_dismissed'
    const DELAY_PAGES = ['homepage', 'storefront'] // pages that wait before showing

    const script = document.currentScript as HTMLScriptElement
    const dashboardUrl = script?.dataset.dashboard ?? '/settings'
    const pageType = script?.dataset.page ?? 'other'

    // Don't show if dismissed in this session
    if (sessionStorage.getItem(STORAGE_KEY)) return

    // Don't show on settings pages (middleware won't inject there, but belt+suspenders)
    if (window.location.pathname.includes('/settings')) return

    const delay = DELAY_PAGES.includes(pageType)
        ? 2000 + Math.random() * 3000 // 2–5s random
        : 800

    function inject() {
        const banner = document.createElement('div')
        banner.id = 'mng-owner-banner'
        banner.innerHTML = `
      <style>
        #mng-owner-banner {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 16px;
          height: 36px;
          background: #1c2228;
          color: #f5f0eb;
          font-family: ui-monospace, monospace;
          font-size: 12px;
          letter-spacing: 0.01em;
          transform: translateY(-100%);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06);
        }
        #mng-owner-banner.mng-visible {
          transform: translateY(0);
        }
        #mng-owner-banner a {
          color: #c9a96e;
          text-decoration: none;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }
        #mng-owner-banner a:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        #mng-owner-banner .mng-label {
          opacity: 0.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #mng-owner-banner button {
          background: none;
          border: none;
          color: #f5f0eb;
          opacity: 0.4;
          cursor: pointer;
          padding: 4px;
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }
        #mng-owner-banner button:hover {
          opacity: 0.8;
        }
      </style>
      <span class="mng-label">You are logged in as a store owner</span>
      <a href="${dashboardUrl}">Edit your store →</a>
      <button aria-label="Dismiss" title="Dismiss">✕</button>
    `

        document.body.prepend(banner)

        // Slide in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => banner.classList.add('mng-visible'))
        })

        // Dismiss
        banner.querySelector('button')!.addEventListener('click', () => {
            banner.style.transform = 'translateY(-100%)'
            sessionStorage.setItem(STORAGE_KEY, '1')
            setTimeout(() => banner.remove(), 300)
        })
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(inject, delay))
    } else {
        setTimeout(inject, delay)
    }
})()