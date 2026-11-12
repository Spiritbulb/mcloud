# Storefront funnel usability audit (2026-11-12)

The path a Kenyan merchant takes to a paid plan: the app.mcloud.co.ke landing page, then sign-up, `/start`,
the first steps in a new store, and the upgrade in Billing. The storefront half of mcloud.co.ke is
included; the servers half is not.

**How:** Playwright at 390px (phone) and 1280px, in light and dark, on local dev servers (storefront :3001,
web :3000), with an axe-core accessibility scan on each public page. Signed-in screens (new-store
Overview, Billing) were checked with sample data and by reading the code, because signing in needs an
emailed code. Screenshots are in `shots/`.

**Healthy:** no horizontal scroll at phone width. Storefront pages load in under 1 s in dev. The `/start`
form is good: labelled fields, a live "address available" check announced to screen readers, and two
questions only. Plan gates in settings link to "See plans".

## Blockers: likely to lose people

**B1. "Start free" lands on "Sign in to Spiritbulb".** Every sign-up button goes `/start` → web
`/auth/login` (or `/auth/sign-up`) → `spiritb.uk/go/mcloud` → a page titled "Sign in to Spiritbulb"
(`shots/signup-mobile-light.png`). A new merchant who just clicked "Start free" on *Menengai
Storefronts* sees another brand's name, the words "Sign in" rather than "Create your account", and
nothing about the store they came to make. On phones the form also sits mid-screen under a large
blank area. The page lives in the Spiritbulb repo (`~/spiritbulb`).
*Fix:* pass the context through (`/go/mcloud?to=…&intent=signup`) and have that page say "Create
your Menengai Storefronts account" with our logo, and "Spiritbulb account" only as a sub-line.

**B2. On mcloud.co.ke, storefronts are hidden behind a "Servers" toggle.** `home-client.tsx:903`
defaults to `servers`: the hero's primary button is "Deploy server", and every section heading a visitor
scrolls past is about servers. Storefront content appears only after tapping the toggle. Anyone who
reaches mcloud.co.ke looking for a shop website meets cloud servers first.
*Fix (your call, since it touches the servers page):* honour `?for=storefronts` (or `#storefronts`) so
ads, guides and app.mcloud.co.ke links open the storefront view, and remember the visitor's last choice.

## Friction: slows people down or costs trust

**F1. Upgrading takes six steps across two apps.** In order:
1. Overview "See plans" opens org Billing on mcloud.co.ke.
2. Tap "Upgrade".
3. The red text says "Your wallet balance is too low… Add at least KES X", and there is no button next to it.
4. Scroll up to "Top up" and pay with M-PESA.
5. Tap "Upgrade" again.
6. Confirm.

*Fix:* put a "Top up KES X with M-PESA" button in the shortfall message. It opens the top-up modal
pre-filled with the amount, then goes straight on to the confirm step.

**F2. Billing doesn't say what a plan gives you.** The store table shows a Hobby and an Upgrade button
per store. The price is only in a hover tooltip (`title=`), which phones never show, and the benefits
aren't shown at all. *Fix:* show the price on the button and a two-line "what you get" for each plan.

**F3. The landing page has no images and no proof.** There are no screenshots of a real store, the
editor, or an M-PESA checkout on a phone, and nothing about who uses it (`shots/landing-*.png`). This
is the subject of sub-project 3 (product shots and illustrations).

**F4. Landing features don't say which plan they need.**
- "Your own domain", "Know what works" (analytics) and "Blog" are Hobby and above, and nothing says so.
- "Work as a team" is listed, but Free allows one member.

Free users will find these out later as locked screens. *Fix:* add a small "Hobby+" tag, or move them
into the pricing cards only.

**F5. "Paid from your organisation wallet" is jargon.** New merchants don't know what the wallet is.
*Fix:* "Top up with M-PESA; your plan renews from that balance each month."

**F6. The product has five names.** "MCloud Storefronts" (landing eyebrow), "Storefronts" (header),
"Menengai Storefronts" (/moving), "Menengai Cloud" (footer, pricing) and "Spiritbulb" (sign-in).
*Fix:* pick one public name for the copy pass.

**F7. A notice for existing users pulls in new visitors.** "What's changing" appears three times on the
landing page: in the header nav, under the final CTA and in the footer. It's a migration notice for
existing users. *Fix:* keep it in the footer only.

**F8. The pricing nudges toward the wrong plan.** Pro (KES 2,795) is the highlighted card, and the
Overview panel says "Grow with Pro". The natural first upgrade is Hobby (KES 795: own domain and
analytics). *Fix:* highlight Hobby on the landing page and point the Overview panel at Hobby.

**F9. No answers to the first questions people ask.** For example: does the money come straight to my
M-PESA? Are there fees per sale? Will a till number work? Can I move later? The guides already answer
these (`apps/web/lib/guides.ts` FAQ). *Fix:* add a short FAQ to the landing page.

**F10. The cookie banner covers the hero on phones (mcloud.co.ke).** It takes about a quarter of the
screen, right over the hero buttons. *Fix:* use a slim bottom bar on small screens.

## Polish

- **P1. Contrast:** axe reports 10 *serious* colour-contrast failures on mcloud.co.ke home (uppercase
  eyebrow labels and one CTA), and 3 on the Spiritbulb sign-in footer.
- **P2. Small tap targets:** some targets are under 24px (4–5 on the landing page, 8–12 on mcloud.co.ke home, mostly
  footer and nav links).
- **P3. Landing copy is generic:** "Your store, live in minutes." could be any builder. Lead with
  M-PESA and Kenya (copy pass).
- **P4. "For organizations" wording:** the landing card still says "For organizations", while the
  product now says non-profit.
- **P5. Sign-in send button:** the disabled "Send code" button on the sign-in page looks inactive
  even after an email is typed (check in your browser).

## What feeds the next sub-projects

- **Copy pass:** F4–F9, P3, P4 and the name decision (F6).
- **Images:** F3, with B2's storefront view as a second placement.
- **Out of the copy pass, needing code or another repo:**
  - B1 (Spiritbulb sign-in);
  - B2 (home toggle);
  - F1 and F2 (Billing);
  - F10 and P1 (mcloud.co.ke styles).
