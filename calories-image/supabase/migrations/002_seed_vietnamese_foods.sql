-- Migration 002: Seed common Vietnamese foods with authentic nutritional values per 100g.
-- Data sources: Viện Dinh Dưỡng Quốc Gia Việt Nam (NIN) & USDA Food Data Central.

insert into public.foods (
  user_id,
  name,
  standardized_name,
  serving_basis,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  fiber_per_100g,
  nutrition_source,
  source_reference,
  is_verified
) values
  -- Tinh bột & Ngũ cốc
  (null, 'Cơm trắng (nấu chín)', 'cooked_white_rice', '100g', 130.0, 2.7, 28.2, 0.3, 0.4, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Cơm gạo lứt (nấu chín)', 'cooked_brown_rice', '100g', 111.0, 2.6, 23.0, 0.9, 1.8, 'USDA FoodData Central', 'FDC-169704', true),
  (null, 'Bún tươi', 'fresh_rice_vermicelli', '100g', 110.0, 1.7, 25.7, 0.0, 0.5, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Phở tươi (bánh phở)', 'fresh_pho_noodles', '100g', 123.0, 2.1, 28.5, 0.1, 0.4, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Khoai lang luộc', 'boiled_sweet_potato', '100g', 86.0, 1.6, 20.1, 0.1, 3.0, 'USDA FoodData Central', 'FDC-168483', true),
  (null, 'Khoai tây luộc', 'boiled_potato', '100g', 87.0, 1.9, 20.1, 0.1, 1.8, 'USDA FoodData Central', 'FDC-170029', true),
  (null, 'Bánh mì không (bánh mì Việt Nam)', 'vietnamese_baguette', '100g', 265.0, 8.5, 52.0, 1.8, 2.7, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Yến mạch cán dẹt (nấu chín)', 'cooked_rolled_oats', '100g', 71.0, 2.5, 12.0, 1.5, 1.7, 'USDA FoodData Central', 'FDC-173904', true),

  -- Đạm động vật & Thủy hải sản
  (null, 'Ức gà không da (áp chảo/luộc)', 'skinless_chicken_breast', '100g', 165.0, 31.0, 0.0, 3.6, 0.0, 'USDA FoodData Central', 'FDC-171077', true),
  (null, 'Đùi gà bỏ da luộc', 'chicken_thigh_skinless', '100g', 179.0, 24.0, 0.0, 8.5, 0.0, 'USDA FoodData Central', 'FDC-171477', true),
  (null, 'Thịt heo thăn nạc luộc', 'boiled_lean_pork_loin', '100g', 143.0, 26.0, 0.0, 3.5, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Thịt bò bắp/nạc áp chảo', 'lean_beef_shank', '100g', 182.0, 28.0, 0.0, 7.2, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Trứng gà (luộc/chín)', 'boiled_chicken_egg', '100g', 143.0, 12.6, 0.8, 9.5, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Lòng trắng trứng gà', 'egg_white', '100g', 52.0, 10.9, 0.7, 0.2, 0.0, 'USDA FoodData Central', 'FDC-172183', true),
  (null, 'Tôm nõn hấp/luộc', 'boiled_shrimp', '100g', 99.0, 24.0, 0.2, 0.3, 0.0, 'USDA FoodData Central', 'FDC-175179', true),
  (null, 'Cá hồi áp chảo', 'pan_seared_salmon', '100g', 206.0, 22.0, 0.0, 12.4, 0.0, 'USDA FoodData Central', 'FDC-173686', true),
  (null, 'Cá thu hấp', 'steamed_mackerel', '100g', 189.0, 19.5, 0.0, 11.9, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Cá lóc (cá quả) luộc/hấp', 'steamed_snakehead_fish', '100g', 97.0, 18.2, 0.0, 2.7, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),

  -- Đạm thực vật & Đậu
  (null, 'Đậu phụ trắng luộc', 'boiled_white_tofu', '100g', 76.0, 8.0, 1.9, 4.8, 0.3, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Đậu phụ rán (chiên)', 'fried_tofu', '100g', 198.0, 15.0, 4.0, 13.5, 0.8, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Đậu đen nấu chín', 'cooked_black_beans', '100g', 132.0, 8.9, 23.7, 0.5, 8.7, 'USDA FoodData Central', 'FDC-173735', true),
  (null, 'Đậu xanh nấu chín', 'cooked_mung_beans', '100g', 105.0, 7.0, 19.2, 0.4, 7.6, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),

  -- Rau củ quả
  (null, 'Rau muống luộc', 'boiled_water_spinach', '100g', 23.0, 2.6, 3.1, 0.3, 1.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Rau ngót luộc', 'boiled_sweet_leaf', '100g', 35.0, 5.3, 3.4, 0.0, 2.5, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Bông cải xanh (súp lơ xanh) luộc', 'boiled_broccoli', '100g', 35.0, 2.4, 7.2, 0.4, 3.3, 'USDA FoodData Central', 'FDC-170379', true),
  (null, 'Bắp cải luộc', 'boiled_cabbage', '100g', 23.0, 1.3, 5.5, 0.1, 1.9, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Dưa chuột (dưa leo) tươi', 'fresh_cucumber', '100g', 15.0, 0.7, 3.6, 0.1, 0.5, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Cà chua tươi', 'fresh_tomato', '100g', 18.0, 0.9, 3.9, 0.2, 1.2, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Giá đỗ tươi', 'fresh_bean_sprouts', '100g', 30.0, 3.0, 5.3, 0.2, 1.8, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),

  -- Trái cây
  (null, 'Chuối tiêu chín', 'fresh_banana', '100g', 89.0, 1.1, 22.8, 0.3, 2.6, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Táo tây (nguyên vỏ)', 'fresh_apple', '100g', 52.0, 0.3, 13.8, 0.2, 2.4, 'USDA FoodData Central', 'FDC-171688', true),
  (null, 'Ổi tươi', 'fresh_guava', '100g', 68.0, 2.6, 14.3, 1.0, 5.4, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Bưởi da xanh', 'fresh_pomelo', '100g', 38.0, 0.8, 9.6, 0.0, 1.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Đu đủ chín', 'fresh_papaya', '100g', 43.0, 0.5, 10.8, 0.3, 1.7, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),

  -- Món ăn Việt Nam hoàn chỉnh (tổng hợp tiêu chuẩn theo 100g phần ăn)
  (null, 'Phở bò tái chín (nước + bánh + thịt)', 'pho_bo_beef_noodles', '100g', 85.0, 5.0, 11.0, 2.2, 0.4, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),
  (null, 'Phở gà (nước + bánh + thịt gà)', 'pho_ga_chicken_noodles', '100g', 88.0, 5.5, 11.5, 2.0, 0.4, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),
  (null, 'Bún bò Huế (nước + bún + thịt)', 'bun_bo_hue', '100g', 92.0, 5.2, 10.8, 3.2, 0.5, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),
  (null, 'Bánh mì thịt pate chả lụa (hoàn chỉnh)', 'banh_mi_thit_vietnamese', '100g', 245.0, 10.5, 32.0, 8.5, 1.8, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),
  (null, 'Cơm tấm sườn nướng (sườn + cơm)', 'com_tam_suon_nuong', '100g', 185.0, 7.5, 22.0, 7.2, 0.5, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),
  (null, 'Canh chua cá lóc (nước + cá + rau)', 'canh_chua_ca_loc', '100g', 42.0, 3.8, 3.5, 1.2, 0.6, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),
  (null, 'Canh rau ngót nấu thịt nạc', 'canh_rau_ngot_thit_nac', '100g', 45.0, 4.5, 2.0, 1.8, 1.2, 'Viện Dinh dưỡng Quốc gia (Ước lượng)', 'NIN-RECIPE-2015', true),

  -- Gia vị & Chất béo
  (null, 'Dầu ăn thực vật (dầu đậu nành/hướng dương)', 'vegetable_oil', '100g', 884.0, 0.0, 0.0, 100.0, 0.0, 'USDA FoodData Central', 'FDC-175034', true),
  (null, 'Dầu ô liu nguyên chất (Olive oil)', 'extra_virgin_olive_oil', '100g', 884.0, 0.0, 0.0, 100.0, 0.0, 'USDA FoodData Central', 'FDC-171413', true),
  (null, 'Nước mắm truyền thống (nước mắm cốt)', 'traditional_fish_sauce', '100g', 45.0, 8.0, 2.5, 0.0, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true),
  (null, 'Nước tương (xì dầu)', 'soy_sauce', '100g', 53.0, 8.1, 4.9, 0.6, 0.8, 'USDA FoodData Central', 'FDC-174277', true),
  (null, 'Sữa chua không đường', 'plain_unsweetened_yogurt', '100g', 63.0, 4.5, 6.0, 2.5, 0.0, 'Viện Dinh dưỡng Quốc gia', 'NIN-VN-2007', true)
on conflict do nothing;

