-- ========================================================
-- Seed Data for Restaurant QR Ordering
-- ========================================================

-- 1. Insert Tables (1 to 5)
INSERT INTO restaurant_tables (table_number, status) VALUES
(1, 'active'),
(2, 'active'),
(3, 'active'),
(4, 'active'),
(5, 'active')
ON CONFLICT (table_number) DO NOTHING;

-- 2. Insert Categories
-- We store the generated IDs to reference in Menu Items
DO $$
DECLARE
    appetizer_id UUID := gen_random_uuid();
    main_id UUID := gen_random_uuid();
    drinks_id UUID := gen_random_uuid();
BEGIN
    -- Check if categories already exist to avoid duplicate inserts
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name_en = 'Appetizers') THEN
        INSERT INTO categories (id, name_en, name_am, description_en, description_am, sort_order) VALUES
        (appetizer_id, 'Appetizers', 'ቅድመ መብል', 'Delicious starters to kick off your meal', 'ምግብ ለመጀመር የሚረዱ ጣፋጭ መክሰሶች', 1),
        (main_id, 'Main Dishes', 'ዋና ምግቦች', 'Hearty and traditional main courses', 'ባህላዊ እና ዘመናዊ ዋና ምግቦች', 2),
        (drinks_id, 'Drinks', 'መጠጦች', 'Cold and hot beverages', 'ቀዝቃዛ እና ትኩስ መጠጦች', 3);

        -- 3. Insert Menu Items
        -- Appetizers
        INSERT INTO menu_items (category_id, name_en, name_am, description_en, description_am, price, image_url, is_available) VALUES
        (appetizer_id, 'Sambusa', 'ሳምቡሳ', 'Crispy pastry filled with spiced lentils or minced beef (2 pieces)', 'በቅመማ ቅመም የተሰራ ምስር ወይም ስጋ የተሞላ ጥብስ ሳምቡሳ (2 ፍሬ)', 120.00, null, true),
        (appetizer_id, 'Ethiopian Salad', 'የሃበሻ ሰላጣ', 'Fresh tomatoes, onions, and green peppers tossed with house dressing', 'ትኩስ ቲማቲም፣ ቀይ ሽንኩርት እና ቃሪያ በቤት ውስጥ ሰላጣ ማጣፈጫ የተሰራ', 180.00, null, true);

        -- Main Dishes
        INSERT INTO menu_items (category_id, name_en, name_am, description_en, description_am, price, image_url, is_available) VALUES
        (main_id, 'Doro Wat', 'ዶሮ ወጥ', 'Traditional chicken stew simmered in berbere sauce, served with hard-boiled egg and injera', 'በበርበሬ ሶስ የሚንተከተክ ባህላዊ የዶሮ ወጥ፣ የተቀቀለ እንቁላል እና እንጀራ ጨምሮ', 450.00, null, true),
        (main_id, 'Kitfo', 'ክትፎ', 'Minced beef seasoned with mitmita and niter kibbeh (clarified butter), served raw, medium, or fully cooked with injera/kocho', 'በሚጥሚጣ እና በንጥር ቅቤ የተለወሰ ስስ ስጋ (ጥሬ፣ ለብለብ፣ ወይም በደንብ የበሰለ) ከእንጀራ/ቆጮ ጋር', 500.00, null, true),
        (main_id, 'Yetsom Beyaynetu', 'የፆም በያይነቱ', 'A platter of various vegan stews (lentils, split peas, cabbage, shiro) served on injera', 'የተለያዩ የፆም ወጦች (ምስር፣ አተር፣ ጎመን፣ ሽሮ) በእንጀራ ላይ ተደርድረው የሚቀርቡበት', 350.00, null, true),
        (main_id, 'Special Shiro Wat', 'ልዩ ሽሮ ወጥ', 'Spiced chickpea stew cooked in a clay pot, served bubbling hot with injera', 'በሸክላ ድስት የሚሰራ ቅመም የበዛበት የሽንብራ ዱቄት ወጥ (ሽሮ) ከእንጀራ ጋር', 220.00, null, true),
        (main_id, 'Cheeseburger', 'ቺዝበርገር', 'Grilled beef patty with melted cheese, lettuce, tomato, and house burger sauce, served with fries', 'የተጠበሰ የከብት ስጋ፣ የቀለጠ ቺዝ፣ ሰላጣ፣ ቲማቲም እና ልዩ ሶስ ከድንች ጥብስ ጋር', 320.00, null, true);

        -- Drinks
        INSERT INTO menu_items (category_id, name_en, name_am, description_en, description_am, price, image_url, is_available) VALUES
        (drinks_id, 'Traditional Coffee', 'ባህላዊ ቡና', 'Freshly roasted and brewed Ethiopian coffee served in a cini', 'በትኩስነቱ ተቆልቶና ተፈልቶ በሲኒ የሚቀርብ የሀበሻ ቡና', 60.00, null, true),
        (drinks_id, 'Macchiato', 'ማኪያቶ', 'Rich espresso with steamed and frothed milk', 'የደመቀ ኤስፕሬሶ ከተፈላ ወተት ጋር', 80.00, null, true),
        (drinks_id, 'Soft Drink', 'ለስላሳ መጠጦች', 'Coca-Cola, Fanta, Sprite, or Mirinda (300ml)', 'ኮካ፣ ፋንታ፣ ስፕራይት ወይም ሚሪንዳ (300 ሚሊ)', 70.00, null, true),
        (drinks_id, 'Fresh Avocado Juice', 'የአቮካዶ ጭማቂ', 'Thick fresh blended avocado juice served with fresh lime', 'ወፍራም ትኩስ የአቮካዶ ፍራፍሬ ጭማቂ ከሎሚ ጋር', 150.00, null, true);
    END IF;
END $$;

-- 4. Insert Sample Inventory Items
INSERT INTO inventory (item_name_en, item_name_am, quantity, unit, reorder_level) VALUES
('Injera', 'እንጀራ', 150.00, 'pieces', 30.00),
('Teff Flour', 'ጤፍ ዱቄት', 50.00, 'kg', 10.00),
('Berbere Spice', 'በርበሬ', 15.00, 'kg', 5.00),
('Niter Kibbeh (Butter)', 'ንጥር ቅቤ', 10.00, 'kg', 3.00),
('Avocado', 'አቮካዶ', 25.00, 'kg', 8.00),
('Coffee Beans', 'ቡና ፍሬ', 20.00, 'kg', 5.00),
('Beef Patty', 'የበርገር ስጋ', 40.00, 'pieces', 15.00)
ON CONFLICT DO NOTHING;
