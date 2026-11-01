-- Seed feed sources. Probed 2026-11-01 from the dev sandbox with
--   curl -sSL -m 15 -A 'NuruBot/1.0 (+https://nuru.spiritb.uk)'
-- A source is kept only if its feed returned recent, education-relevant items.
--
-- KEPT
--   capitalfm.africa education category feed: RSS, items from the last 2 days, higher-ed relevant.
--   tuko.co.ke education feed: RSS, items from the last 3 weeks (not on the candidate list; added
--     because it has a dedicated education feed and covers lecturers' strike, fee structures, etc.).
--   education.go.ke /news: no feed (every feed path returns the HTML homepage); scraped with the
--     `moe` parser. Basic-education heavy, but it is the ministry's own channel.
--
-- DROPPED
--   kuccps.ac.ke        redirects to a www host that does not resolve; no feed found.
--   helb.co.ke, cue.or.ke, uonbi.ac.ke, jkuat.ac.ke, strathmore.edu, mu.ac.ke
--                       did not resolve or connect from the sandbox (curl exit 000), so no feed could be
--                       verified. Re-probe from production and add if they publish one.
--   ku.ac.ke, egerton.ac.ke  reachable, but /feed, /rss and ?feed=rss2 all 404 or return HTML; no feed.
--   nation.africa       403 to every request (bot block).
--   standardmedia.co.ke only general news feeds (headlines.php, kenya.php); there is no education feed
--                       and the headlines are not education-relevant.
--   the-star.co.ke      /feed, /rss 404; no feed advertised.
--   universityworldnews.com  every feed path 404s.
--   kenyans.co.ke       general news feed; the education category parameter is ignored.
--   educationnewshub.co.ke   feed works but is holiday assignments, past papers and school vacancies.
insert into sources (name, kind, url, homepage, category, parser) values
  ('Capital FM Education', 'rss', 'https://capitalfm.africa/news/category/education/feed/', 'https://capitalfm.africa', 'media', null),
  ('Tuko Education', 'rss', 'https://www.tuko.co.ke/rss/education.rss', 'https://www.tuko.co.ke', 'media', null),
  ('Ministry of Education', 'scrape', 'https://www.education.go.ke/news', 'https://www.education.go.ke', 'government', 'moe')
on conflict (url) do nothing;
