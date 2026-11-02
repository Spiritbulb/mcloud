-- More feed sources, all RSS. Probed 2026-11-02 from the dev sandbox with
--   curl -sSL -m 15 -A 'NuruBot/1.0 (+https://nuru.spiritb.uk)'
-- and re-checked with Node fetch (an incomplete TLS chain fails there, so such sources are dropped).
-- A source is kept only if its feed returned items from the last ~30 days.
--
-- KEPT (all rss)
--   usiu.ac.ke        /feed/           university; items from 2026-10-29 (USIU-Africa news).
--   chuka.ac.ke       /feed/           university; items from 2026-10-30 (class resumption, research).
--   mmust.ac.ke       /feed/           university; items from 2026-10-29 (admissions calls, deans).
--   mku.ac.ke         /feed/           university; items from 2026-10-28 (MoUs, clinical training).
--   kemu.ac.ke        /feed            university; newest items 2026-10-05 and 2026-10-09 (older ones are
--                                      vacancies from 2025); thin but inside 30 days.
--   kuccps.net        /rss.xml         government agency (placement); newest item 2026-10-14.
--   tveta.go.ke       /feed/           government agency (TVET regulator); items from 2026-10-27.
--
-- DROPPED
--   maseno.ac.ke      /rss.xml works in Node, but every item carries pubDate 2016-12-21 (bogus), so
--                     recency cannot be established and items would be dated years ago.
--   helb.co.ke, cue.or.ke, uonbi.ac.ke, jkuat.ac.ke, strathmore.edu, mu.ac.ke, dkut.ac.ke, kna.go.ke
--                     did not connect from the sandbox (curl exit 000); nothing verifiable.
--   ku.ac.ke, egerton.ac.ke, daystar.ac.ke, tukenya.ac.ke, kabarak.ac.ke
--                     reachable but every feed path 404s and no alternate link is advertised.
--   usiu.ac.ke /category/education/feed/  valid but empty; the main feed is used instead.
--   standardmedia.co.ke, the-star.co.ke, universityworldnews.com
--                     feed paths 404; no education feed.
--   kenyans.co.ke     /feeds/news and /rss.xml are general news (rss.xml is stale, Dec 2025);
--                     education section feeds 404.
--   citizen.digital   /feed.xml is a whole-site feed (sports, politics); education feeds 404.
--   nation.africa, peopledaily.digital / pd.co.ke  403 to every request (bot block).
--   mwakilishi.com    whole-site diaspora news feed, not education.
-- No scrape parsers were added: every kept source has a working RSS feed.
insert into sources (name, kind, url, homepage, category, parser) values
  ('USIU-Africa', 'rss', 'https://www.usiu.ac.ke/feed/', 'https://www.usiu.ac.ke', 'university', null),
  ('Chuka University', 'rss', 'https://www.chuka.ac.ke/feed/', 'https://www.chuka.ac.ke', 'university', null),
  ('Masinde Muliro University (MMUST)', 'rss', 'https://mmust.ac.ke/feed/', 'https://mmust.ac.ke', 'university', null),
  ('Mount Kenya University', 'rss', 'https://mku.ac.ke/feed/', 'https://mku.ac.ke', 'university', null),
  ('Kenya Methodist University', 'rss', 'https://kemu.ac.ke/feed', 'https://kemu.ac.ke', 'university', null),
  ('KUCCPS', 'rss', 'https://www.kuccps.net/rss.xml', 'https://www.kuccps.net', 'government', null),
  ('TVET Authority', 'rss', 'https://www.tveta.go.ke/feed/', 'https://www.tveta.go.ke', 'government', null)
on conflict (url) do nothing;
