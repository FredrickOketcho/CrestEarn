INSERT INTO projects (
  id, name, price_ugx, previous_price_ugx, duration_days, daily_yield_bps,
  image_key, is_featured, sort_order
) VALUES
  ('cotton', 'Cotton', 85500, 95000, NULL, 1000, 'cotton', true, 1),
  ('sesame-seeds', 'Sesame Seeds', 180000, NULL, NULL, 1000, 'sesame', true, 2),
  ('matooke', 'Matooke', 5000, NULL, 2, 1000, 'matooke', false, 3),
  ('french-green-beans', 'French Green Beans', 30000, NULL, 10, 1000, 'green-beans', false, 4),
  ('tobacco-leaves', 'Tobacco Leaves', 300000, NULL, 60, 1000, 'tobacco', false, 5),
  ('birds-eye-chili', 'Bird''s Eye Chili', 600000, NULL, 60, 1000, 'chili', false, 6)
ON CONFLICT (id) DO NOTHING;
