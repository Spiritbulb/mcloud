# Mobile UX Redesign — Spec
**Date:** 2026-06-12
**Branch:** migrate/turborepo-and-auth (or new feature branch)

---

## Goal

Transform the Menengai Cloud mobile app from a functional companion into an action-first, personality-driven daily driver. The app should tell merchants what needs to get done, celebrate progress, and feel alive — while web handles configuration and advanced features.

**North star:** A merchant should be able to run their store day-to-day — checking in, fulfilling orders, glancing at sales — without ever opening a browser.

---

## Scope

1. Native onboarding (org + store creation)
2. Picker redesign (attention feed, single-store shortcut)
3. Store Today tab (action-first, replaces Overview)
4. Logo image upload
5. Push notifications (automated + admin-broadcast)
6. App icon fix + seasonal icon system
7. New EAS build bundling all native module additions

---

## 1. Native Onboarding

### Current state
New users hit a dead-end empty state: "No stores yet. Create your first store on the web." No guidance, no deep link, no path forward in-app.

### Desired flow
Sign in → detect zero orgs → onboarding sequence → land in store Today tab.

### Screens

**Welcome screen** (replaces empty picker for zero-org users)
- Full-screen, expressive layout
- Headline: "You're 2 steps away from your first store."
- Subheading: brief value prop
- CTA: "Set up your workspace"

**Step 1 — Create org**
- Single focused card: "Name your workspace"
- Text input (org name), slug preview below ("workspace.menengai.cloud/your-slug")
- Helper copy: "Your workspace groups your stores — great for a brand or business name."
- "Continue" button (disabled until valid input)
- Calls: `POST /api/mobile/orgs` (new endpoint, mirrors web org creation)

**Step 2 — Create first store**
- Immediately follows org creation
- "Now create your first store"
- Name input, slug preview
- "Create store" button
- Calls: existing `POST /api/mobile/orgs/{orgSlug}/stores`
- On success: navigate to `/(app)/store/{storeSlug}` (Today tab)

**Getting started state (empty new store)**
When a brand new store lands on the Today tab with no products/orders, show a "Getting started" checklist instead of the normal action feed:
- [ ] Add your first product → opens Add Product
- [ ] Share your store link → copies/shares store URL
- [ ] Make your first sale → links to web storefront preview

Each item is a tappable action card. Checklist disappears once all three are done (or dismissed).

### New API endpoint needed
`POST /api/mobile/orgs` — create an org. Body: `{ name: string }`. Returns: `{ slug: string, name: string }`.

---

## 2. Picker Redesign

### Single-store shortcut
If the authenticated user has exactly one store, skip the picker on launch and navigate directly to that store's Today tab. A chevron `›` next to the store name in the store header acts as the store-switcher, navigating back to the picker.

### Multi-store attention feed
The picker becomes a prioritized feed, not a directory.

**Top section — "Attention needed"** (only shown when items exist)
Cross-store action cards, one per actionable item, highest priority first:
- "3 unfulfilled orders · Café Lewa" → taps to store Orders tab
- "Low stock: 2 products · Naya Studio" → taps to store Products tab
- "No activity in 7 days · The Grid" → upsell nudge with share action

**Store list section**
Cleaner cards: store avatar, name, "last activity" line (e.g. "Last order 2h ago"), pending order count badge. No org metadata, no stat strip.

**Header**
Time-aware greeting: "Good morning, Buse" / "Good afternoon" / "Good evening".
- If nothing needs attention: "All caught up" with a subtle checkmark
- If a revenue milestone was hit recently: surface it here ("Café Lewa hit 100 orders 🎉")

**Upsell nudges for inactive stores**
Stores with zero orders or no activity in 7+ days show a nudge card instead of empty stats:
- "No sales yet · Add a product" → opens Add Product in that store
- "Share your store to get your first order" → share sheet

### Removed from picker
- Stat strip (total stores / workspaces / plan)
- Org section headers and role metadata
- "Other workspaces" section (merge into flat store list)

---

## 3. Store — Today Tab (replaces Overview)

The Today tab is the action center. Content is prioritized top-to-bottom by urgency. Static quick actions are always at the bottom.

### Content blocks (priority order)

**1. Pending orders block** (shown only when unfulfilled orders exist)
- Compact list of up to 3 unfulfilled order cards
- Each card: order number, customer phone, total, inline "Mark fulfilled" button
- "See all X orders →" link if more than 3
- One-tap fulfillment without navigating to Orders tab

**2. Store pulse** (always visible)
- Single row: today's revenue · today's order count · trend arrow vs yesterday
- Tapping opens Analytics screen
- Feels like a heartbeat, not a dashboard

**3. Attention card** (contextual, one at a time, highest priority wins)
Slot-based — only one card shown, selected by priority:
| Priority | Trigger | Copy |
|---|---|---|
| 1 | Products with stock ≤ 2 | "2 products almost out of stock" |
| 2 | No products on store | "Add your first product to start selling" |
| 3 | No orders in 14 days | "No orders in 14 days · Share your link" |
| 5 | First manual M-Pesa order completed | "Unlock auto-payments on web" (upsell) |

**4. Quick actions row** (always present)
Four icon+label tiles: Add Product · Share Store · M-Pesa · Branding

### Getting started state
See Section 1 — shown only for brand new stores with no products and no orders.

### Tab bar personality
- Store avatar color used as subtle tint on active tab indicator
- Store name in header with `›` chevron for store-switching

---

## 4. More Tab Cleanup

Replace the current list of individual web links with:
- Native items stay native (Branding, M-Pesa — already working)
- All web-only advanced settings collapse into a single "Advanced settings →" row that opens the web merchant dashboard at `/org/{orgSlug}/{storeSlug}/settings`
- Removes: Auto payments, Custom domain, Members & team, Design editor as separate rows
- Keeps: Branding, M-Pesa, Analytics, Delete store, Advanced settings →

---

## 5. Logo Image Upload

### Current state
Stubbed — "Logo upload is coming soon. For now, manage your logo on the web." No image picker library installed.

### Implementation

**New native dependency:** `expo-image-picker`

**New API endpoint:** `POST /api/mobile/stores/[slug]/branding/logo`
- Accepts: `multipart/form-data` with a `file` field (image/png, image/jpeg, image/webp, max 5MB)
- Uploads to Supabase storage: `store-assets/{storeId}/logo/{filename}` (mirrors web convention)
- Returns: `{ logo_url: string }` (public URL)
- Auth: bearer token (same as all mobile endpoints)

**Mobile branding screen changes:**
- Add logo section above name/description fields
- Show current logo (Avatar component) with "Change photo" tap target
- On tap: `ImagePicker.launchImageLibraryAsync()` with `mediaTypes: Images`, `allowsEditing: true`, `aspect: [1,1]`
- Upload via new endpoint, save URL via existing `PATCH /branding`
- Show upload progress indicator

**Existing `PATCH /api/mobile/stores/[slug]/branding`** — no changes needed, already accepts `logo_url`.

---

## 6. Push Notifications

### Architecture
- **Delivery:** Expo Push Notification Service (handles APNs + FCM)
- **Token storage:** new `platform_users` table (see below)
- **Trigger source:** backend webhook/cron for automated; superadmin dashboard for broadcast

### Database: `platform_users` table

```sql
create table platform_users (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  platform text not null check (platform in ('mobile', 'web')),
  expo_push_token text,                    -- null for web
  notification_preferences jsonb default '{"orders": true, "milestones": true, "nudges": true}'::jsonb,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);
-- NOTE: verify FK target `users(id)` against actual users table name in this Supabase project before running migration
```

### Token registration (mobile)
On app launch (after sign-in), mobile app:
1. Calls `expo-notifications` to request permission + get push token
2. `POST /api/mobile/push/register` with `{ token: string }`
3. Backend upserts into `platform_users` where `user_id = current_user AND platform = 'mobile'`

New endpoint: `POST /api/mobile/push/register` — body: `{ token: string }`. Upserts token.

### Notification types

| Type | Trigger | Copy example |
|---|---|---|
| `new_order` | Order created | "New order on Café Lewa — KES 850" |
| `fulfillment_reminder` | Unfulfilled orders > 4h old | "You have 3 unfulfilled orders on Café Lewa" |
| `view_milestone` | Store views hits N (100, 500, 1k, 5k…) | "Café Lewa hit 1,000 views — go on sale!" |
| `inactivity_nudge` | No orders in 7 days | "No orders in 7 days — share your store link" |
| `order_milestone` | Orders count hits N (10, 50, 100…) | "You just hit 100 orders on Café Lewa 🎉" |
| `admin_broadcast` | Sent from superadmin dashboard | Custom copy |

### Notification delivery service
New module: `apps/web/lib/notifications/push.ts`
- `sendPushNotification(userId, type, data)` — looks up token from `platform_users`, sends via Expo Push API
- `sendBroadcast(userIds[], message)` — for admin use
- Handles Expo push ticket errors (invalid tokens → delete from `platform_users`)

### Automated triggers
Hook into existing backend events:
- Order creation → fire `new_order`
- Cron job (every 4h) → check unfulfilled orders → fire `fulfillment_reminder`
- View count update → check milestones → fire `view_milestone`
- Cron job (daily) → check inactivity → fire `inactivity_nudge`
- Order count update → check milestones → fire `order_milestone`

### Superadmin broadcast UI
New page in superadmin dashboard: `/superadmin/notifications`
- Compose notification: title, body, optional deep link
- Target: All users / by platform / specific user (search by email)
- Preview + Send button
- Send log table (timestamp, target, message, delivery status)
- Calls: `POST /api/superadmin/notifications/broadcast`

New endpoint: `POST /api/superadmin/notifications/broadcast`
- Body: `{ title, body, target: 'all' | 'mobile' | { userId } }`
- Superadmin-auth gated
- Calls `sendBroadcast()` from push service

### Notification preferences
User can toggle notification types in the More tab under a new "Notifications" row. Preferences stored in `platform_users.notification_preferences`. Push service checks prefs before sending.

---

## 7. App Icon Fix + Seasonal Icons

### Current issue
App icon is cropped and misaligned in the launcher (visible in screenshot).

### Fix
Regenerate icon assets with correct padding and alignment per Apple/Google guidelines:
- iOS: 1024×1024px, no alpha, rounded corners applied by OS
- Android: 1024×1024px adaptive icon (foreground + background layers)
- Update `app.json`: `icon`, `android.adaptiveIcon.foregroundImage`, `android.adaptiveIcon.backgroundColor`

### Seasonal icon system
Use `expo-dynamic-app-icon` to enable icon swapping without a new build.

**Icon slots** (to be designed separately):
- `default` — current brand icon (fixed)
- `new_year` — Jan 1–7
- `valentines` — Feb 14
- `eid` — date varies yearly; configured annually in superadmin, not hardcoded
- `christmas` — Dec 24–26
- `independence_ke` — Dec 12 (Jamhuri Day)
- `custom` — manually set from superadmin dashboard

**Auto-swap logic** (`src/lib/seasonal-icon.ts`):
- On app foreground, check current date against schedule
- Call `setAlternateAppIcon(iconName)` if current icon doesn't match season
- Falls back to `default` outside seasonal windows

**Superadmin control:**
- New field in superadmin dashboard: "Active icon override" dropdown
- Stored in a remote config endpoint: `GET /api/mobile/config` → `{ activeIcon: string }`
- Mobile checks this on launch, overrides seasonal auto-logic if set

---

## 8. Native Dependencies (new EAS build required)

| Package | Purpose |
|---|---|
| `expo-image-picker` | Logo upload photo picker |
| `expo-notifications` | Push notification token + display |
| `expo-dynamic-app-icon` | Seasonal icon swapping |

All three require native module linking → new EAS build. Ship together to minimize build cycles.

---

## Data Flow Summary

```
Mobile app launch
  ├── Auth hydrate (existing)
  ├── Register push token → POST /api/mobile/push/register
  ├── Fetch remote config → GET /api/mobile/config (icon override, feature flags)
  └── Check seasonal icon → setAlternateAppIcon if needed

Store event (order created)
  └── Backend → push.sendPushNotification(userId, 'new_order', { store, amount })
        └── Expo Push API → device

Superadmin broadcast
  └── POST /api/superadmin/notifications/broadcast
        └── push.sendBroadcast(userIds, message)
              └── Expo Push API → devices
```

---

## Out of Scope
- Web push notifications (browser)
- In-app notification inbox/history
- Rich push (images in notification)
- A/B testing notification copy
- Paid plan gating on notification types
