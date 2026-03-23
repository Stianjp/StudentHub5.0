-- Correct Silver, Gold, and Platinum stand coordinates for Student Connect 2026
-- Uses ON CONFLICT DO UPDATE so this is safe to run regardless of whether 0026 was run first.
-- Coordinate system: percentage of image dimensions (403 wide × 749 tall, aspect ratio 403/749).

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
insert into public.event_registration_stands (
  campaign_id,
  stand_code,
  display_label,
  package_tier,
  x,
  y,
  width,
  height,
  sort_order,
  status
)
select c.id, s.stand_code, s.display_label, s.package_tier::public.package_tier, s.x, s.y, s.width, s.height, s.sort_order, 'available'
from campaign c
cross join (
  values
    -- ── PLATINUM (rosa/pink) ──────────────────────────────────────────────
    -- 4 large stands in a row, upper-centre of the hall
    ('Platinum 1', 'Platinum 1', 'platinum', 22.0, 44.5, 9.5, 4.4,  10),
    ('Platinum 2', 'Platinum 2', 'platinum', 33.0, 44.5, 9.5, 4.4,  20),
    ('Platinum 3', 'Platinum 3', 'platinum', 44.0, 44.5, 9.5, 4.4,  30),
    ('Platinum 4', 'Platinum 4', 'platinum', 55.0, 44.5, 9.5, 4.4,  40),

    -- ── GOLD (gul/yellow) ────────────────────────────────────────────────
    -- Upper group: 4 stands flanking the centre aisle (below Platinum)
    ('Gold 5',  'Gold 5',  'gold', 16.0, 53.5, 8.0, 4.8,  50),
    ('Gold 6',  'Gold 6',  'gold', 25.0, 53.5, 8.0, 4.8,  60),
    ('Gold 7',  'Gold 7',  'gold', 41.0, 53.5, 8.0, 4.8,  70),
    ('Gold 8',  'Gold 8',  'gold', 50.0, 53.5, 8.0, 4.8,  80),
    -- Lower group: 4 wide stands at the bottom of the hall
    ('Gold 1',  'Gold 1',  'gold',  8.0, 72.5, 11.0, 4.8, 260),
    ('Gold 2',  'Gold 2',  'gold', 24.0, 72.5, 11.0, 4.8, 270),
    ('Gold 3',  'Gold 3',  'gold', 40.0, 72.5, 11.0, 4.8, 280),
    ('Gold 4',  'Gold 4',  'gold', 56.0, 72.5, 11.0, 4.8, 290),

    -- ── SILVER (lyseblå/light blue) ──────────────────────────────────────
    -- Left column: 5 stands on the far-left wall
    ('Silver 1',  'Silver 1',  'silver',  5.0, 49.0, 6.5, 4.0,  90),
    ('Silver 2',  'Silver 2',  'silver',  5.0, 54.0, 6.5, 4.0, 100),
    ('Silver 3',  'Silver 3',  'silver',  5.0, 59.0, 6.5, 4.0, 110),
    ('Silver 4',  'Silver 4',  'silver',  5.0, 64.0, 6.5, 4.0, 120),
    ('Silver 5',  'Silver 5',  'silver',  5.0, 69.0, 6.5, 4.0, 130),
    -- Centre-left 2×2 block (below Gold 5/6)
    ('Silver 6',  'Silver 6',  'silver', 16.5, 59.5, 6.0, 4.0, 140),
    ('Silver 7',  'Silver 7',  'silver', 25.0, 59.5, 6.0, 4.0, 150),
    ('Silver 8',  'Silver 8',  'silver', 16.5, 64.5, 6.0, 4.0, 160),
    ('Silver 9',  'Silver 9',  'silver', 25.0, 64.5, 6.0, 4.0, 170),
    -- Centre-right 2×2 block (below Gold 7/8)
    ('Silver 10', 'Silver 10', 'silver', 41.0, 60.5, 6.0, 4.0, 180),
    ('Silver 11', 'Silver 11', 'silver', 41.0, 65.5, 6.0, 4.0, 190),
    ('Silver 12', 'Silver 12', 'silver', 49.0, 60.5, 6.0, 4.0, 200),
    ('Silver 13', 'Silver 13', 'silver', 49.0, 65.5, 6.0, 4.0, 210),
    -- Right-wall column (facing right corridor)
    ('Silver 14', 'Silver 14', 'silver', 66.0, 49.0, 6.0, 4.2, 220),
    ('Silver 15', 'Silver 15', 'silver', 66.0, 54.0, 6.0, 4.2, 230),
    ('Silver 16', 'Silver 16', 'silver', 66.0, 59.0, 6.0, 4.2, 240),
    ('Silver 17', 'Silver 17', 'silver', 66.0, 64.0, 6.0, 4.2, 250),
    -- Bottom row (near Gold lower group)
    ('Silver 18', 'Silver 18', 'silver', 46.0, 81.0, 6.0, 3.5, 300),
    ('Silver 19', 'Silver 19', 'silver', 54.0, 81.0, 6.0, 3.5, 310),
    ('Silver 20', 'Silver 20', 'silver', 66.0, 81.0, 6.0, 3.5, 320)
) as s(stand_code, display_label, package_tier, x, y, width, height, sort_order)
on conflict (campaign_id, stand_code) do update
set
  display_label = excluded.display_label,
  package_tier  = excluded.package_tier,
  x             = excluded.x,
  y             = excluded.y,
  width         = excluded.width,
  height        = excluded.height,
  sort_order    = excluded.sort_order,
  updated_at    = now();
