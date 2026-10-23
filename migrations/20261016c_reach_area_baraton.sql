-- Add Baraton as a delivery town (Munch Hub is there). The point is approximate (the university
-- town centre) and only used to suggest the nearest area from GPS; adjust it from the admin screen.
insert into public.reach_areas (name, slug, lat, lng, sort)
values ('Baraton', 'baraton', 0.2500, 35.0800, 6)
on conflict (slug) do nothing;
