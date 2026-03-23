-- Fix Standard stand coordinates for Student Connect 2026
-- Row-by-row interleaved numbering: Standard 1 (left col), Standard 2 (right col), Standard 3 (left col)…
-- Adds missing bottom-row stands and outer corridor stands.
-- ON CONFLICT DO UPDATE overrides any previously inserted positions.

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
select c.id, s.stand_code, s.display_label, 'standard'::public.package_tier, s.x, s.y, s.width, s.height, s.sort_order, 'available'
from campaign c
cross join (
  values
    -- ── RIGHT INNER CORRIDOR (row-by-row, 2 columns) ────────────────────
    -- Left column x≈74.5, right column x≈80.0
    -- Rows start at y≈7, spacing ≈6.5 per row, w=4.5, h=3.5
    ('Standard 1',  'Standard 1',   74.5,  7.0, 4.5, 3.5,  10),
    ('Standard 2',  'Standard 2',   80.0,  7.0, 4.5, 3.5,  20),
    ('Standard 3',  'Standard 3',   74.5, 13.5, 4.5, 3.5,  30),
    ('Standard 4',  'Standard 4',   80.0, 13.5, 4.5, 3.5,  40),
    ('Standard 5',  'Standard 5',   74.5, 20.0, 4.5, 3.5,  50),
    ('Standard 6',  'Standard 6',   80.0, 20.0, 4.5, 3.5,  60),
    ('Standard 7',  'Standard 7',   74.5, 26.5, 4.5, 3.5,  70),
    ('Standard 8',  'Standard 8',   80.0, 26.5, 4.5, 3.5,  80),
    ('Standard 9',  'Standard 9',   74.5, 33.0, 4.5, 3.5,  90),
    ('Standard 10', 'Standard 10',  80.0, 33.0, 4.5, 3.5, 100),
    ('Standard 11', 'Standard 11',  74.5, 39.5, 4.5, 3.5, 110),
    ('Standard 12', 'Standard 12',  80.0, 39.5, 4.5, 3.5, 120),
    ('Standard 13', 'Standard 13',  74.5, 46.0, 4.5, 3.5, 130),

    -- ── BOTTOM CENTRE ROW (below Sølv 18-20) ────────────────────────────
    -- Standard 14-17 are printed at bottom-centre of the floorplan
    ('Standard 14', 'Standard 14',  43.0, 83.0, 5.5, 3.5, 140),
    ('Standard 15', 'Standard 15',  50.0, 83.0, 5.5, 3.5, 150),
    ('Standard 16', 'Standard 16',  57.0, 83.0, 5.5, 3.5, 160),
    ('Standard 17', 'Standard 17',  64.0, 83.0, 5.5, 3.5, 170),

    -- ── OUTER RIGHT CORRIDOR (far-right column) ─────────────────────────
    -- Standard 20 is printed at mid-height on the far right (~x≈87%)
    ('Standard 18', 'Standard 18',  86.5, 35.0, 4.5, 3.5, 180),
    ('Standard 19', 'Standard 19',  86.5, 41.5, 4.5, 3.5, 190),
    ('Standard 20', 'Standard 20',  86.5, 48.0, 4.5, 3.5, 200),

    -- ── BOTTOM-LEFT / ENTRANCE AREA ─────────────────────────────────────
    -- Standard 25-26 visible near the entrance at the bottom
    ('Standard 21', 'Standard 21',  32.0, 87.0, 5.0, 3.5, 210),
    ('Standard 22', 'Standard 22',  22.0, 87.5, 5.0, 3.5, 220),
    ('Standard 23', 'Standard 23',  13.0, 88.5, 5.0, 3.5, 230),
    ('Standard 24', 'Standard 24',  46.0, 87.0, 5.0, 3.5, 240),
    ('Standard 25', 'Standard 25',  53.0, 87.0, 5.0, 3.5, 250),
    ('Standard 26', 'Standard 26',  60.0, 87.0, 5.0, 3.5, 260)
) as s(stand_code, display_label, x, y, width, height, sort_order)
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
