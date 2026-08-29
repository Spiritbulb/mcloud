# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0](https://github.com/Spiritbulb/mcloud/compare/v1.1.0...v1.2.0) (2026-08-29)

### Features

* implement CORS headers and OPTIONS method for checkout routes; refactor upload hooks to use R2
* refactor checkout and product detail pages for improved theme integration
* **sso:** implement openOnWeb function for authenticated web navigation
* **sso:** /auth/handoff redeem route (single-use, saveSession from ticket)
* **sso:** partner + mobile handoff mint routes
* **sso:** rate-limit helper for handoff mint
* **sso:** provider createSessionFromTokens (saveSession from a token pair)
* **sso:** ticket mint/redeem DB helpers + handoff table types
* **sso:** AES-GCM seal/open for handoff token pair
* **sso:** auth_handoff_tickets table (migration file; apply pending)
* **editor:** undo toast for slide and section deletes
* **hero:** per-slide delete in filmstrip + confirms; fix filmstrip active highlight
* **hero:** editor filmstrip with slide numbers and add-slide control
* **hero:** slide toolbar ops follow the acted-on slide across reload
* **hero:** carousel follows #slide=N on load for the editor handoff
* **editor:** send settings draft to preview so record CRUD renders live
* **editor:** instant reorder in preview + omit empty preview override
* **editor:** section type-picker for add
* **storefront:** hover overlay toolbar posts structural ops
* **liquid:** record-anchor snippet marks record containers for the editor overlay
* **editor:** apply item-op messages to repeated records
* **editor:** apply section-op messages to the sections array
* **editor:** seed map for new sections and records
* **editor:** allow structural section changes in updatePageSections
* **auth:** env-gated password sign-in for the app-store review account
* **web:** exhaustive on-page SEO for mcloud.co.ke
* **plans:** billing page shows plan, limits, and order nudge
* **plans:** mobile IAP + ProSheet support Hobby and Pro tiers
* **plans:** admin can grant a named plan (hobby|pro)
* **plans:** map two Play SKUs to hobby/pro in subscribe route
* **plans:** remove all storefront branding on Pro only
* **plans:** gate blog authoring server-side and blog/content UI behind Hobby+
* **plans:** gate advanced analytics behind Hobby+ (payload + UI)
* **plans:** server-gate custom domain behind Hobby+
* **plans:** plan-aware ProGate (requires hobby|pro)
* **plans:** enforce per-tier member limit on invite
* **plans:** enforce per-tier product limit on create
* **plans:** getStorePlan + storeHasFeature DB resolvers
* **plans:** pure Play SKU to plan mapping
* **plans:** tier config + pure plan/limit decision helpers
* **analytics:** add UTM parameter tracking to session and analytics events
* **web:** sites live at app.mcloud.co.ke (shop. still resolves)
* **editor:** images are click-to-edit, and the hero is ONE shape
* **editor:** click-to-edit text in the preview
* **editor:** drawer + two-way sync between the rail and the preview
* **web:** the Editor - one surface for theme and content, with a live preview
* **storefront:** token-gated preview + frame-ancestors lockdown
* **web:** SettingsFields, one renderer turns any schema into a form
* **web:** THEME_SCHEMA, theme writes whitelisted against the schema
* **liquid:** section copy is editable (section.heading, defaults unchanged)
* **storefront:** sections declare their configurable settings
* **verticals:** SettingField, the schema type the admin generates forms from
* **storefront:** multi-page NGO sites (hero, /p/[pageSlug], nav links)
* **storefront:** actually load the fonts a theme names
* **web:** guard commerce-only settings routes on non-commerce verticals
* **web:** donation-shaped Overview for non-commerce verticals
* **web:** Content page - author NGO mission, programs, impact, contact, campaigns
* **web:** pure content draft + validation (blocks titleless and unfundable campaigns)
* **web:** settings nav renders the site's vertical (Site/Content/Donations for NGO)
* **verticals:** sectionsFor(vertical) - vertical-aware admin nav model
* **storefront:** hide commerce chrome on non-commerce verticals
* **auth:** secret-gated /api/partner/auth/* for spiritbulb cross-origin
* **storefront:** donate island (amount + guest + dedication -> /donate -> payment)
* **storefront:** wire campaigns section into NGO home (registry + vertical + context)
* **storefront:** campaign progress reader (sum completed donations per campaign)
* **liquid:** campaigns section with goal progress bar + donate action
* **storefront:** /donate endpoint (validated campaign + amount, tagged order)
* **storefront:** campaign shape + donation-amount validation helpers
* update drawer width and chat input placeholder, add expo-dev-client dependency
* **nuru:** scheme-aware brand logo (teal light / amber dark)
* **nuru:** System/Light/Dark appearance control in settings
* **nuru:** mount ThemeProvider + reactive status bar
* **nuru:** ThemeProvider + useTheme with system/light/dark resolution
* **nuru:** theme factory with light + dark palettes
* **nuru:** provider state, live streaming bubble, options modal, model footer
* **nuru:** ( model · context ) pill + options modal + disabled mic
* **nuru:** client send takes provider + streams tokens; message carries meta
* **nuru:** stream final answer; route picks provider, emits tokens + meta
* **nuru:** Anthropic Haiku adapter + provider registry
* **nuru:** Azure adapter — neutral→OpenAI translate, stream, usage
* **nuru:** chat + attaches a file, creates a note, scopes chat to it
* **nuru:** chat composer + becomes a real attach button
* **nuru:** AttachMenu dropdown (Files active, Camera coming soon)
* **nuru:** convert HEIC/HEIF photos to JPEG on-device before upload
* **nuru:** read text PDFs; drop heic/heif; actionable extraction errors
* **nuru:** pure-JS PDF text extraction (unpdf)
* **nuru:** show live model status (thinking/searching/writing)
* **nuru:** client consumes streamed chat status + final message
* **nuru:** stream chat via tool-calling loop with live status events
* **nuru:** pure tool-calling loop + Azure callModel adapter
* **nuru:** notes-as-reference prompt + search_notes tool schema
* **nuru:** searchNotes retrieval module lifted from route
* **nuru:** SSE streaming framing helpers (transport spike verified)
* **nuru:** drawer becomes 85%-width Recents list with real icons
* **nuru:** chat screen loads and sends within a session
* **nuru:** chat service gains sessions (list/create/scoped history+send)
* **nuru:** scope chat GET/POST to a session, auto-title, bump updated_at
* **nuru:** chat sessions list + create route
* **nuru:** pure session-title + DTO helpers with tests
* **nuru:** migration for chat sessions + backfill
* **nuru:** enhance Screen component with keyboard avoiding support
* **nuru:** polish chat UI to match reference design
* **nuru:** add EAS Update channels (enable OTA JS/asset updates)
* **nuru:** on-brand amber sunburst icons + Android EAS config
* **nuru:** real document/image pickers in AddNoteSheet; voice disabled
* **nuru:** real notes/chat API factories + useApi() (auth-threaded)
* **nuru:** Note status/fileUrl fields + pure API-row mappers (TDD)
* **nuru:** GET /api/mobile/notes/[id] — one note + signed original URL
* **nuru:** GET /api/mobile/notes — list the student's own notes
* **nuru:** POST/GET /api/mobile/chat — RAG retrieval + GPT-5 + history
* **nuru:** chatComplete() — GPT-5 via Azure v1 (answer-from-notes prompt)
* **nuru:** ingest pipeline — extractText, embed, POST /api/mobile/notes
* **nuru:** pure text chunker for RAG ingestion (TDD)
* **nuru:** KB schema — pgvector tables, match RPC, private bucket
* **nuru:** wire AuthProvider + guard; move profile/drawer to useAuth
* **nuru:** magic-code login screen (email -> code); drop signup
* **nuru:** port magic-code AuthContext from apps/mobile (WIP: call sites next)
* **nuru:** add auth deps (secure-store, auth-session) + runtime config
* **nuru:** copy Nuru scaffold into apps/nuru (standalone app)
* **stores:** seed vertical default pages on create; accept optional type
* **storefront:** vertical-aware registry + defaultHomeSections fallback
* **liquid:** add NGO contact section (guarded, reuses socialLinks)
* **liquid:** add NGO programs + impact sections (empty-guarded)
* **liquid:** add NGO mission section (always renders, store-name fallback)
* **verticals:** add @mcloud/verticals package with shop/ngo descriptors
* **storefront:** serve content pages via product-route fallthrough
* **storefront:** home renders from page row or default section list
* **storefront:** getPublishedPage helper (server client)
* **storefront:** renderPage (loop sections); remove index.liquid template
* **storefront:** section registry + default home section list
* **liquid:** extract all-products section; make collections/featured self-contained
* **db:** add pages table (store pages + ordered sections)
* **storefront:** render home via Liquid with React fallback
* **storefront:** add buildHomeContext for Liquid home render
* **liquid:** engine + renderTemplate API with escaping test
* **liquid:** scaffold @mcloud/liquid; move classic .liquid templates + manifest gen
* **demo:** swap all store screens to use demoApi interceptor
* **demo:** add admin-gated demo mode toggle in Account screen
* **demo:** wrap (app) layout in DemoProvider
* **demo:** add demoApi interceptor — routes all api calls through mock state
* **demo:** add DemoContext with simulation loop and local notifications
* **demo:** add mock data fixtures for demo mode
* **demo:** extend /api/mobile/me to return role; add isAdmin to SessionUser
* updted the admin page
* Implement Daraja payment integration with STK push and status polling
* **auth:** in-app magic-code login/sign-up UI; remove AuthKit redirect; lock web auth CORS
* **auth:** web POST /api/auth/verify (sets cookie, returns next)
* **auth:** web POST /api/auth/send-code (magic code)
* **auth:** add verifyMagicCodeWeb (cookie session via saveSession)
* **auth:** shared magic-code rate limiter + verify cap (web+mobile)
* **auth:** add returnTo sanitizer for web magic-code login
* **billing:** streamline billing page and integrate mobile subscription flow
* **storefront:** enhance product and service listings with review aggregates
* **mobile:** native magic-code auth, replacing the browser OAuth flow
* **proxy:** update platform host logic for migration to mcloud.co.ke
* **auth:** implement login URL with return path for redirection after authentication
* **mobile:** implement webAppOrigin for absolute redirects in settings
* **mobile:** Sentry error reporting (gated on DSN in extra)
* **mobile:** haptics helper + success haptic on product save
* **mobile:** NetInfo connectivity hook + offline pill on products
* **mobile:** Account — enable-notifications toggle (re-request + register)
* **mobile:** notification rails — request permission + register Expo push token after sign-in
* **mobile:** api.registerPushToken
* **web:** /api/mobile/push-token endpoint (stores Expo push token)
* **mobile:** persist react-query cache to AsyncStorage (offline launch)
* **database:** add beta signups table and related types feat(supabase): add cli-latest version and linked project configuration
* **mobile:** product-form create/edit via react-query mutations
* **mobile:** products list via react-query with optimistic toggle/delete + refresh signal
* **mobile:** products query + optimistic mutation hooks
* **mobile:** mount QueryProvider inside AuthProvider
* **mobile:** add react-query QueryClient foundation (in-memory)
* add closed beta signup functionality and related components
* enhance product management with additional fields and navigation updates
* add Android build workflow and release signing configuration fix: update onboarding screen to include keyboard avoiding view feat: implement image upload using expo-file-system
* enhance product management and onboarding experience
* **proxy:** implement proxy functionality with custom domain resolution and slug rewriting
* add image upload functionality and update product images
* **mobile:** collapse More tab web links into single Advanced settings row
* **mobile:** Today tab — pending orders, store pulse, attention card, quick actions
* **mobile:** add fulfillOrder convenience method to api client
* **mobile:** useTodayData hook for Today tab data
* **mobile:** rename Overview tab to Today, update icon
* **mobile:** store bottom tabs, robust session persistence, picker polish
* enhance authentication flow and add debug endpoint for token verification - update .gitignore to exclude sensitive files - modify README with new API base URLs - update app.json for runtime version and app updates - improve auth.tsx to handle deep link redirects and session refresh - add debug state to index.tsx for authentication diagnostics - create debug-auth route for detailed token verification feedback - update package.json and package-lock.json with new dependencies - adjust eas.json for local app version source - remove unused android background icon
* add mobile store management features including orders and products
* enhance admin panel with new layout and navigation components
* integrate Paystack subscription management and webhook handling
* implement store subscription flow with Auth0 integration and Pro tier upgrade logic
* implement modular settings UI components and page structure
* implement changelog page with markdown parsing and update middleware and next.config configuration
* support for system subdomains and API
* add theme support to all storefront pages
* fix theme routing and add theme-specific nav/footer
* added new themes for store type support - Fixed dark mode/light mode switch - Added a new route to support home client
* getting started drawer and tracking
* new docs editor with basic authentication
* Introduce support and changelog pages, update settings header UI, and refactor appearance settings styling.
* Add Next.js middleware for request proxying.
* Add API endpoint to fetch a store by slug, including user authentication and membership verification.
* Implement full user authentication, onboarding, and initial store management infrastructure.
* Implement a modular theming system for stores, add new store pages and components, and introduce authentication features.
* Establish core storefront layout, global theme styling, and store settings components.
* Implement multi-tenant e-commerce store with product details, cart management, and various payment integrations.
* Add login form component with Supabase authentication and organization-based redirection.

### Bug Fixes

* update apiBaseUrl to use internal routes for better environment handling
* **hero:** filmstrip dots + add-slide are not swallowed by the section click-blocker
* **editor:** remove stray backticks in CSS comment that broke the template literal
* **editor:** keep inactive carousel slides inert so heading clicks hit the active slide
* **editor:** make hero text card a pointer-events island so heading clicks land
* **editor:** begin hero/text edit on mousedown so real clicks place a caret
* **editor:** revert hero click routing to coordinate-free e.target resolution
* **editor:** hero heading edit-vs-image click priority + instant record reorder
* **editor:** campaigns seed needs an id + correct fields so added campaigns render and index correctly
* **editor:** split seedSection into its own module for a clean static registry import
* **editor:** derive known section types from SECTION_REGISTRY, not a hardcoded list
* **editor:** backfill home pages row for every store (un-blank Editor preview)
* **web:** correct SEO host to mcloud.co.ke; defer pricing to mobile
* **mobile:** point host at mcloud.co.ke, not the phased-out menengai.cloud
* **analytics:** improve funnel accuracy by using actual order counts instead of undercounted events
* **storefront:** trust the www/apex variant too, or the preview frame is blocked
* **storefront:** a missing "s" in ADMIN_ORIGIN must not kill the preview
* **hero:** saving an image silently ate the hero copy
* **editor:** clicking into the page no longer opens the drawer
* **editor:** the hero background image was unclickable
* **hero:** ask the vertical, not the data
* **liquid:** stop blank image fields rendering a broken image
* **storefront:** stop Liquid sections rendering edge-to-edge
* **payments:** write valid order status on payment success
* **storefront:** surface campaign-progress query errors into the best-effort catch
* **nuru:** stop doubling top safe-area inset under nav headers
* **nuru:** use SafeAreaView from safe-area-context + mount SafeAreaProvider
* **nuru:** report whole-turn token usage (tool phase + answer)
* **nuru:** remove expo-image-manipulator from package-lock.json
* **nuru:** replay assistant tool_calls in API wire shape
* **nuru:** drop expo-image-manipulator; toUploadable is a pass-through
* **nuru:** stop "undefined" sessionId crashing chat (500) and dying silently
* **nuru:** guard drawer newChat against createSession failure
* **nuru:** guard chat-screen history load against stale writes
* **nuru:** regenerate DB types for nuru_chat_sessions
* **mobile:** also re-include apps/mobile in root .easignore
* **nuru:** add ROOT .easignore so EAS uploads only apps/nuru, not whole repo
* **nuru:** drop trailing slashes in .easignore so dirs actually prune
* **nuru:** force git-based EAS archive via requireCommit
* **nuru:** make local Android build CRLF-immune
* **nuru:** keyboard avoidance, drawer safe-area, neutral charcoal theme
* **nuru:** sanitize Auth0 user id in storage key (fixes note upload)
* **nuru:** map signed URL, pin mapMessage contract, clean typecheck
* **nuru:** embed() uses Azure v1 API shape (endpoint/embeddings, model=deployment)
* **nuru:** route token storage through cross-platform shim (web falls back to localStorage)
* **storefront:** carry full store.settings through castStore so NGO sections get data
* **liquid:** guard collections/featured sections so empty lists render nothing (home parity)
* **liquid:** update index.test.ts to test sections (index.liquid removed)
* **storefront:** suppress hydration warning on Liquid-injected home HTML
* **demo:** swap StoreContext + remaining screens to demoApi; clear query cache on toggle
* **demo:** align demoApi no-op stub signatures with real api; remove unused import
* **demo:** export DemoContext; fix setState-in-setter pattern; fix timerId init
* **demo:** remove unnecessary type cast in me route
* update URLs from menengai.cloud to shop.mcloud.co.ke across the application
* **auth:** provision users row in web verify; remove dead sign-up form + LoginForm alias
* **auth:** reject URL-encoded host smuggling in returnTo sanitizer
* **mobile:** avoid keyboard on the sign-in screen (Android)
* **mobile:** scope persisted QueryProvider below the auth gate
* **mobile:** registerPush never throws — widen try/catch over permission calls
* **mobile:** pin async-storage to SDK-56 version (2.2.0) via expo install
* **mobile:** bind auth session to app task (showInRecents:false) to stop cold-relaunch
* **api:** no-store on all mobile read routes
* **mobile:** bypass device HTTP cache on authed fetches
* **mobile:** reconcile products cache after post-create image upload
* auth bugs
* **mobile:** provision users row on mobile auth before org/store writes
* **mobile:** source storeSlug from StoreContext in all tab screens; add Cache-Control to remaining read endpoints
* **auth:** revert requireStoreAccess embedded join, use parallel queries instead
* **mobile:** use native share sheet for Share store action
* **web:** build with webpack instead of turbopack (monorepo postcss resolution)
* **vercel:** correct monorepo install for apps/web root directory
* **vercel:** override install command to fix monorepo build
* **web:** pin @tailwindcss/postcss + tailwindcss at root for Vercel build
* update README and actions to use eas-cli and improve Resend API key handling
* **theme:** stop ThemeColorSync removing React-managed <meta> (real removeChild cause)
* **org-nav:** invalid <div>-in-<button> nesting caused dashboard removeChild crash
* **auth:** drop unused AuthKitProvider polling that caused sidebar removeChild errors
* update Dockerfile to include devDependencies during installation
* add Dockerfile to bypass Nixpacks and enable standalone output
* enhanced proxy.ts and removed webp typo
* removed old react templates except classic
* template rendering on workers - Added support for GA page views - Added API health check
* destructured and awaited search params for direct access
* Redirect subdomain protected routes to the main domain for Auth0 login and update the banner dashboard URL.

### Performance

* **nuru:** enable R8 minify + resource shrinking (NEEDS runtime verify)
* **nuru:** drop x86/x86_64 ABIs from Android build
* **nuru:** add .easignore to shrink EAS Build upload
* **mobile:** single-query store auth, /today endpoint, Cache-Control on read routes
* **auth:** cache mobile WorkOS getUser() lookup to eliminate per-request API round trip

### Refactoring

* **hero:** edit background image from the slide toolbar, make the backdrop inert
* **editor:** intercept only navigational clicks, stop swallowing everything
* **web:** merchant-facing copy says site, not store (identifiers unchanged)
* **storefront:** extract createOrderWithPayment core from checkout
* **nuru:** route screens read theme reactively
* **nuru:** components read theme reactively via useTheme
* **nuru:** authStyles -> makeAuthStyles(theme) factory
* **nuru:** loop keeps neutral tool-call turns; adapters translate
* **nuru:** route all screens through useApi() (real backend)
* **stores:** narrow pages-insert cast to sections field only
* **web:** use shared @mcloud/liquid; drop duplicate engine + manifest
* update beta signup flow to include opt-in URL in response and adjust UI accordingly
* remove subscription and upgrade button components
* **web:** store settings via server action, drop anon key (general+social)
* **storefront:** route account + services off the anon key
* **storefront:** server-authoritative checkout, drop anon key from cart
* **storefront:** route wishlist through a server endpoint, drop anon key
* **mobile:** registerPush uses api.registerPushToken (single source of endpoint contract)
* **auth:** remove debug functionality and streamline user linking process
* switched authentication and admin access routes

### Documentation

* **sso:** implementation plan for PR 2 (cross-app handoff)
* **sso:** correct PR 2 ticket model to seal the WorkOS token pair
* **sso:** implementation plan for PR 1 (spiritbulb session rework)
* **sso:** sequence session fix as PR 1, add nav/UI consumers
* **sso:** design for cross-app SSO (subdomain + spiritbulb + mobile handoff)
* **hero:** plan click-model refactor + per-slide delete + delete-undo
* **hero:** implementation plan for multi-slide hero CRUD + filmstrip
* **editor:** implementation plan for Editor CRUD
* **editor:** spec review pass — fix broken sentence, stale test, pin encode-[] guard to CRUD
* **editor:** new stores already seed pages; only encode-[] guard deferred
* **editor:** mark backfill migration done/shipped in spec
* **editor:** correct root cause of blank preview (encode-[] bug, not empty store)
* **editor:** add sub-project 0 (pages backfill) after rail-vs-storefront divergence found
* **editor:** clarify all stores qualify for CRUD (no old-theming cohort)
* **editor:** spec Editor CRUD (sections + records, in the preview)
* implementation plan for tiered pricing with limits
* expand feature-gating in pricing spec
* tiered pricing (Free/Hobby/Pro) with limits — design spec
* implementation plan for tiered pricing with limits
* expand feature-gating in pricing spec
* tiered pricing (Free/Hobby/Pro) with limits — design spec
* **plan:** SP6 the Editor (schema-driven settings + live preview)
* **spec:** SP6 becomes one Editor (preview merges appearance + content)
* **spec:** SP6 becomes schema-driven settings (was: theming layer)
* **spec:** SP6 finishing the theming layer
* **plan:** SP5 implementation plan (vertical-aware merchant admin)
* **spec:** SP5 vertical-aware merchant admin (content authoring)
* **plan:** correct SP4 checkout/donate route paths to app/api/store
* **plan:** SP4 NGO donations implementation plan
* **spec:** SP4 NGO donations design (campaigns in settings, /donate + shared order core)
* **nuru:** light-mode implementation plan + scheme-aware logo
* **nuru:** refine light-mode spec for grades 10-12 audience
* **nuru:** light-mode + teal rebrand design spec
* **nuru:** implementation plan for chat streaming + provider toggle
* **nuru:** design for chat token streaming + per-request provider toggle
* **nuru:** plan for file ingestion (PDF text + HEIC + chat attach)
* **nuru:** fold chat-+ attach into file-ingestion spec
* **nuru:** spec for file ingestion (PDF text + HEIC photos)
* **nuru:** spec + plan for tool-calling retrieval and live status
* **nuru:** implementation plan for chat sessions
* **nuru:** spec for chat sessions
* **nuru:** document EAS Update OTA workflow
* **nuru:** implementation plan — vertical slice (chat + notes-read + app wiring)
* **nuru:** spec — vertical slice (chat + notes-read endpoints + app wiring + pickers)
* **nuru:** correct user-id columns to text (users.id is text, not uuid)
* **nuru:** Slice 1 implementation plan — KB schema + ingestion pipeline
* **nuru:** switch embeddings to text-embedding-3-large (vector 3072)
* **nuru:** spec for shared reviewed KB + RAG chat (Azure/pgvector)
* **nuru:** add auth-scaffold implementation plan; refine spec
* **nuru:** add apps/nuru auth-scaffold design (slice 1)
* **plan:** SP3 per-vertical default template sets implementation plan
* **spec:** per-vertical default template sets — shop & NGO (sub-project 3)
* **plan:** storefront pages & sections data model (sub-project 2)
* **spec:** storefront pages & sections data model (sub-project 2)
* **plan:** storefront Liquid render pipeline (sub-project 1)
* **spec:** pivot to Liquid storefront rendering; spec sub-project 1 (pipeline)
* **plan:** storefront verticals — NGO donations (Deliverable A)
* **spec:** storefront verticals — NGO donations (Deliverable A)
* admin panel expansion implementation plan
* admin panel expansion spec
* **auth:** fix stale _ratelimit reference in send-code comment
* Today tab + More cleanup implementation plan
* mobile UX redesign spec (onboarding, picker, today tab, push notifications, seasonal icons)

### Maintenance

* **editor:** verification run log (static gates + server-render + security)
* **editor:** fault-line regression suite (default-trap, delete integrity, deep-clone)
* **plans:** normalize active subscription plan values
* **liquid:** lock campaigns data-presets value + no-bar-without-goal
* **nuru:** remove dead transitional theme export
* **nuru:** userInterfaceStyle automatic for light default
* **nuru:** add @anthropic-ai/sdk for Haiku chat provider
* **nuru:** remove orphaned app-level .easignore
* **nuru:** Android EAS build config — package id, image-picker plugin, prod API base
* **storefront:** add missing CSS rules for NGO sections
* **liquid:** cover mission render with no description (never-headerless)
* **run-mcloud:** fix skill for monorepo + WorkOS; fix nav path bug
* **web:** exclude *.test.ts from tsc (node:test files use .ts import specifiers)
* **mobile:** disable Sentry source-map upload in EAS prod builds
* **mobile:** bump to 1.1.0 (versionCode 16) for Stage 2 rebuild
* **android:** check what module is FAILING?
* **android:** skip lintVitalRelease + raise Gradle memory to fix Metaspace OOM
* **mobile:** remove auth debug instrumentation (login verified working)
* update Tailwind CSS configuration and dependencies for storefront
* **monorepo:** extract @mcloud/storefront + @mcloud/themes (Phase 3 Stage C)
* **monorepo:** extract @mcloud/auth (lib/auth module) (Phase 3 Stage B4)
* **monorepo:** extract @mcloud/ui (shadcn primitives + cn) (Phase 3 Stage B3)
* **monorepo:** extract @mcloud/db (supabase clients + types) (Phase 3 Stage B2)
* **monorepo:** extract @mcloud/config shared tsconfig base (Phase 3 Stage B1)
* **monorepo:** scaffold Turborepo, lift app into apps/web (Phase 3 Stage A)
* update next.js to version 16.2.7
* rearranged folders to match the new routing system with priority to organisations
* middleware renamed for open-next deployment
* install playwright for e2e tests - extra theme cleanup -install typedoc for auto docs
* **release:** 1.1.0
* **release:** 1.0.0-beta.0
* moved integrations
* written docs and added nav links
* installed claude code and initialized
* **release:** 0.1.1

# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0](https://github.com/Spiritbulb/mcloud/compare/v1.0.0-beta.0...v1.1.0) (2026-03-30)

### Features

* add theme support to all storefront pages
* fix theme routing and add theme-specific nav/footer
* added new themes for store type support - Fixed dark mode/light mode switch - Added a new route to support home client
* getting started drawer and tracking
* new docs editor with basic authentication
* Introduce support and changelog pages, update settings header UI, and refactor appearance settings styling.
* Add Next.js middleware for request proxying.
* Add API endpoint to fetch a store by slug, including user authentication and membership verification.
* Implement full user authentication, onboarding, and initial store management infrastructure.
* Implement a modular theming system for stores, add new store pages and components, and introduce authentication features.
* Establish core storefront layout, global theme styling, and store settings components.
* Implement multi-tenant e-commerce store with product details, cart management, and various payment integrations.
* Add login form component with Supabase authentication and organization-based redirection.

### Bug Fixes

* destructured and awaited search params for direct access
* Redirect subdomain protected routes to the main domain for Auth0 login and update the banner dashboard URL.

### Refactoring

* switched authentication and admin access routes

### Maintenance

* **release:** 1.0.0-beta.0
* moved integrations
* written docs and added nav links
* installed claude code and initialized
* **release:** 0.1.1

# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-beta.0](https://github.com/Spiritbulb/mcloud/compare/v0.1.1...v1.0.0-beta.0) (2026-03-22)

### Features

* add theme support to all storefront pages
* fix theme routing and add theme-specific nav/footer
* added new themes for store type support - Fixed dark mode/light mode switch - Added a new route to support home client
* getting started drawer and tracking
* new docs editor with basic authentication

### Bug Fixes

* destructured and awaited search params for direct access

### Refactoring

* switched authentication and admin access routes

### Maintenance

* moved integrations
* written docs and added nav links
* installed claude code and initialized

All notable changes to this project will be documented in this file.

## [0.1.1](https://github.com/Spiritbulb/mcloud/compare/v0.1.0...v0.1.1) (2026-03-19)

### Features

* Introduce support and changelog pages, update settings header UI, and refactor appearance settings styling.
* Add Next.js middleware for request proxying.
* Add API endpoint to fetch a store by slug, including user authentication and membership verification.
* Implement full user authentication, onboarding, and initial store management infrastructure.
* Implement a modular theming system for stores, add new store pages and components, and introduce authentication features.
* Establish core storefront layout, global theme styling, and store settings components.
* Implement multi-tenant e-commerce store with product details, cart management, and various payment integrations.
* Add login form component with Supabase authentication and organization-based redirection.

### Bug Fixes

* Redirect subdomain protected routes to the main domain for Auth0 login and update the banner dashboard URL.

