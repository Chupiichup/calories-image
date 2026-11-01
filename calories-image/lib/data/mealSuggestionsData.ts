/**
 * Meal Suggestions by Time of Day
 * 
 * Clinical and evidence-informed meal recommendations tailored for:
 * - Breakfast (Bữa sáng)
 * - Lunch (Bữa trưa)
 * - Afternoon (Bữa chiều)
 * - Dinner (Bữa tối)
 * - Snacks (Ăn phụ)
 * 
 * Tailored to weight loss, lean muscle preservation, insulin control,
 * fatty liver (MASLD) care, and low added sugar.
 */

import { type StoredProfile, type StoredGoal } from "@/lib/db/repository";
import { type MetabolicPreferences } from "@/lib/metabolic";

export type MealTimeCategory = "breakfast" | "lunch" | "afternoon" | "dinner" | "snack";

export type DifficultyLevel = "Dễ" | "Trung bình" | "Nâng cao";

export type DietaryTag =
  | "Giàu đạm"
  | "Ít đường"
  | "Không đường thêm"
  | "Giàu chất xơ"
  | "Low GI"
  | "Nhanh gọn"
  | "Món Việt"
  | "Món chay"
  | "Tiết kiệm"
  | "Tốt cho gan"
  | "Ổn định insulin";

export type IngredientItem = {
  name: string;
  amount: string;
  notes?: string;
};

export type SuggestedDish = {
  id: string;
  name: string;
  nameEn?: string;
  category: MealTimeCategory;
  emoji: string;
  themeColor: string; // Tailored accent color (e.g. amber, emerald, blue, rose)
  description: string;
  ingredients: IngredientItem[];
  calories: number; // kcal per serving
  protein: number; // g
  carbohydrates: number; // g
  fat: number; // g
  fiber: number; // g
  addedSugar: number; // g (typically 0 or minimal)
  prepTime: string; // e.g. "10 phút"
  prepTimeMinutes: number; // for sorting
  difficulty: DifficultyLevel;
  dietaryTags: DietaryTag[];
  suitabilityNotes: string;
  instructions: string[];
  tips?: string;
};

export type DishFilterOption =
  | "all"
  | "high_protein"
  | "low_sugar"
  | "high_fiber"
  | "lower_carb"
  | "quick_prep"
  | "vietnamese"
  | "vegetarian"
  | "budget";

export type DishSortOption =
  | "suitability"
  | "highest_protein"
  | "lowest_calories"
  | "fastest_prep";

export const MEAL_CATEGORY_INFO: Record<
  MealTimeCategory,
  {
    label: string;
    subLabel: string;
    timeRange: string;
    description: string;
    guideline: string;
  }
> = {
  breakfast: {
    label: "Bữa sáng",
    subLabel: "Breakfast",
    timeRange: "05:00 - 10:30",
    description: "Khởi đầu ngày mới với nguồn đạm dồi dào, tinh bột chậm và chất xơ.",
    guideline: "Ưu tiên đạm cao để tránh đỉnh tăng vọt đường huyết sáng, không thêm đường, chuẩn bị nhanh gọn.",
  },
  lunch: {
    label: "Bữa trưa",
    subLabel: "Lunch",
    timeRange: "10:30 - 14:00",
    description: "Bữa ăn chính cân bằng, tiếp thêm năng lượng bền vững cho cả buổi chiều.",
    guideline: "Cân đối đạm, tinh bột nguyên cám và nhiều rau xanh luộc hoặc canh truyền thống Việt Nam.",
  },
  afternoon: {
    label: "Bữa chiều",
    subLabel: "Afternoon",
    timeRange: "14:00 - 17:30",
    description: "Cứu cánh cơn đói xế chiều nhẹ nhàng, giúp tỉnh táo mà không tích mỡ.",
    guideline: "Chọn thức uống không đường, sữa chua, hạt dinh dưỡng hoặc trái cây ít ngọt.",
  },
  dinner: {
    label: "Bữa tối",
    subLabel: "Dinner",
    timeRange: "17:30 - 21:00",
    description: "Bữa tối thanh nhẹ, bảo toàn cơ bắp ban đêm và hỗ trợ giấc ngủ ngon.",
    guideline: "Giàu đạm dễ tiêu (cá, ức gà, tôm), nhiều rau củ, tinh bột vừa phải theo mục tiêu thâm hụt calo.",
  },
  snack: {
    label: "Ăn phụ",
    subLabel: "Snacks",
    timeRange: "Bổ sung khi cần",
    description: "Khẩu phần nhỏ linh hoạt khi cần nạp thêm đạm hoặc trước/sau buổi tập.",
    guideline: "Bữa phụ là tùy chọn, không bắt buộc, ưu tiên đạm tinh khiết hoặc chất xơ thô.",
  },
};

/**
 * Determines current meal category according to Vietnam local time (UTC+7)
 */
export function getCurrentMealTimeCategory(dateInput: Date = new Date()): MealTimeCategory {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(dateInput);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const totalMinutes = hour * 60 + minute;

    // 05:00 to 10:30 (300 to 630 mins) -> Breakfast
    if (totalMinutes >= 300 && totalMinutes < 630) {
      return "breakfast";
    }
    // 10:30 to 14:00 (630 to 840 mins) -> Lunch
    if (totalMinutes >= 630 && totalMinutes < 840) {
      return "lunch";
    }
    // 14:00 to 17:30 (840 to 1050 mins) -> Afternoon
    if (totalMinutes >= 840 && totalMinutes < 1050) {
      return "afternoon";
    }
    // 17:30 to 21:00 (1050 to 1260 mins) -> Dinner
    if (totalMinutes >= 1050 && totalMinutes < 1260) {
      return "dinner";
    }
    // 21:00 to 04:59 -> Snack
    return "snack";
  } catch {
    return "lunch";
  }
}

// ==========================================
// CURATED DISHES DATASET (30+ RICH MEALS)
// ==========================================
export const SUGGESTED_DISHES: SuggestedDish[] = [
  // ----------------------------------------
  // 1. BREAKFAST (BỮA SÁNG)
  // ----------------------------------------
  {
    id: "bf-egg-toast",
    name: "Trứng ốp la 2 quả & Bánh mì nguyên cám dưa leo",
    nameEn: "Sunny-Side Eggs with Whole-Wheat Toast & Cucumber",
    category: "breakfast",
    emoji: "🍳",
    themeColor: "amber",
    description: "Bộ đôi bữa sáng kinh điển chuẩn khoa học: giàu đạm hoàn chỉnh từ trứng, carbohydrate phức hợp giàu chất xơ giúp no lâu và không gây tăng vọt insulin.",
    ingredients: [
      { name: "Trứng gà ta", amount: "2 quả (khoảng 110g)" },
      { name: "Bánh mì đen / nguyên cám", amount: "1-2 lát (khoảng 60g)" },
      { name: "Dưa leo tươi & cà chua", amount: "100g", notes: "Thái lát ăn kèm" },
      { name: "Dầu ô liu / dầu ăn", amount: "1 thìa cà phê (5g)", notes: "Chiên áp chảo nhẹ" },
      { name: "Tiêu đen & muối hồng", amount: "1 nhúm nhỏ" },
    ],
    calories: 335,
    protein: 21.5,
    carbohydrates: 28.0,
    fat: 14.5,
    fiber: 4.8,
    addedSugar: 0,
    prepTime: "8 phút",
    prepTimeMinutes: 8,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Low GI", "Nhanh gọn", "Ổn định insulin"],
    suitabilityNotes: "Đạt hơn 21g đạm giúp bảo tồn khối cơ bắp khi thâm hụt calo. Chỉ số GI thấp từ bánh mì nguyên cám giúp ngăn ngừa đỉnh đường huyết đầu ngày, rất tốt cho người có đề kháng insulin hoặc gan nhiễm mỡ.",
    instructions: [
      "Đặt chảo chống dính lên bếp với 1 thìa cà phê dầu ô liu ở lửa vừa.",
      "Đập 2 quả trứng gà vào chảo, rắc nhẹ tiêu đen và chút muối, đậy nắp 2 phút để lòng đào vừa chín tới.",
      "Áp chảo hoặc nướng giòn 1-2 lát bánh mì nguyên cám.",
      "Xếp trứng ra đĩa cùng bánh mì giòn, kèm dưa leo và cà chua tươi thái lát.",
    ],
    tips: "Không nên chiên trứng quá nhiều dầu mỡ. Ăn kèm nhiều dưa leo giúp bổ sung nước và chất xơ tự nhiên.",
  },
  {
    id: "bf-chicken-vermicelli",
    name: "Bát ức gà xé phay bún gạo lứt rau cải xanh",
    nameEn: "Shredded Chicken Breast with Brown Rice Noodles & Greens",
    category: "breakfast",
    emoji: "🍲",
    themeColor: "emerald",
    description: "Món nước buổi sáng ấm bụng đậm đà hương vị Việt Nam: nước dùng thanh ngọt từ xương gà và gừng, ức gà mềm ngọt xé sợi cùng sợi bún gạo lứt dồi dào chất xơ.",
    ingredients: [
      { name: "Ức gà không da", amount: "130g", notes: "Luộc chín xé sợi" },
      { name: "Bún gạo lứt khô", amount: "50g (nấu chín thành 150g)" },
      { name: "Cải xanh / cải ngọt", amount: "100g", notes: "Cắt khúc luộc chín" },
      { name: "Nước dùng gà trong", amount: "350ml", notes: "Nấu cùng gừng và hành khô, không đường phèn" },
      { name: "Hành hoa, mùi tàu & ớt tươi", amount: "1 ít" },
    ],
    calories: 345,
    protein: 34.0,
    carbohydrates: 40.0,
    fat: 3.8,
    fiber: 4.5,
    addedSugar: 0,
    prepTime: "12 phút",
    prepTimeMinutes: 12,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Giàu chất xơ", "Món Việt", "Tốt cho gan"],
    suitabilityNotes: "Cung cấp tới 34g đạm nạc chất lượng cao nhưng lượng chất béo cực thấp (chỉ ~3.8g). Bún gạo lứt có chỉ số đường huyết trung bình thấp, bảo vệ tế bào gan và hỗ trợ đốt mỡ tối ưu.",
    instructions: [
      "Luộc ức gà với nhánh gừng đập dập khoảng 8-10 phút cho chín tới, vớt ra xé sợi vừa ăn.",
      "Chần bún gạo lứt qua nước sôi khoảng 3-4 phút cho mềm dai, cho ra tô.",
      "Đun sôi nước luộc gà, nêm chút nước mắm ngon và tiêu, thả rau cải vào chần chín ngọt.",
      "Xếp ức gà xé và rau cải lên trên bát bún, chan nước dùng nóng hổi và rắc hành mùi.",
    ],
    tips: "Bạn có thể luộc sẵn ức gà từ tối hôm trước để sáng hôm sau chỉ mất 5 phút nấu nước dùng chan vào.",
  },
  {
    id: "bf-oat-chia-bowl",
    name: "Yến mạch nấu sữa đậu nành không đường & hạt chia, chuối",
    nameEn: "Warm Oatmeal with Soy Milk, Chia Seeds & Banana",
    category: "breakfast",
    emoji: "🥣",
    themeColor: "amber",
    description: "Bữa sáng ấm áp giàu beta-glucan hòa tan giúp dọn sạch cholesterol xấu, nuôi dưỡng hệ vi sinh đường ruột và duy trì mức năng lượng êm dịu suốt buổi sáng.",
    ingredients: [
      { name: "Yến mạch cán dẹt (Rolled Oats)", amount: "45g" },
      { name: "Sữa đậu nành Fami Nature không đường", amount: "180ml" },
      { name: "Hạt chia hữu cơ", amount: "10g (1 thìa canh)" },
      { name: "Chuối tiêu chín vừa", amount: "1/2 quả (50g)", notes: "Cắt lát" },
      { name: "Bột quế (Cinnamon)", amount: "1 nhúm nhỏ", notes: "Giúp nhạy insulin" },
    ],
    calories: 290,
    protein: 13.5,
    carbohydrates: 44.0,
    fat: 6.8,
    fiber: 8.2,
    addedSugar: 0,
    prepTime: "5 phút",
    prepTimeMinutes: 5,
    difficulty: "Dễ",
    dietaryTags: ["Không đường thêm", "Giàu chất xơ", "Món chay", "Nhanh gọn", "Tiết kiệm"],
    suitabilityNotes: "Chứa hơn 8g chất xơ hòa tan giúp làm chậm quá trình tiêu hóa tinh bột, hoàn toàn không có đường bổ sung. Bột quế tự nhiên hỗ trợ tăng độ nhạy insulin đáng kể.",
    instructions: [
      "Cho yến mạch và sữa đậu nành không đường vào nồi nhỏ hoặc bát sứ.",
      "Đun nhỏ lửa trong 3-4 phút (hoặc quay lò vi sóng 90 giây) đến khi yến mạch nở mềm sệt.",
      "Khuấy đều hạt chia và rắc bột quế thơm.",
      "Xếp các lát chuối tươi lên trên và thưởng thức khi còn ấm.",
    ],
    tips: "Chọn chuối vừa chín tới (vỏ còn ánh xanh nhẹ) sẽ có hàm lượng tinh bột kháng (resistant starch) cao hơn chuối chín kỹ.",
  },
  {
    id: "bf-pho-bo-nac",
    name: "Phở bò nạc tái chín (nhiều hành, ít bánh, nước trong)",
    nameEn: "Vietnamese Lean Beef Pho (High Beef, Low Noodles, Clear Broth)",
    category: "breakfast",
    emoji: "🍜",
    themeColor: "rose",
    description: "Món phở truyền thống được biến tấu chuẩn thể hình và chuyển hóa: tập trung vào thịt bò bắp nạc mềm ngọt, nước dùng ninh từ gừng quế hồi trong veo, giảm lượng bánh phở.",
    ingredients: [
      { name: "Thịt bắp bò hoặc thăn bò nạc", amount: "120g", notes: "Thái mỏng tái chín" },
      { name: "Bánh phở tươi", amount: "120g", notes: "Khẩu phần vừa phải" },
      { name: "Nước dùng ninh xương không đường phèn", amount: "350ml" },
      { name: "Hành lá, hành tây, ngò gai & giá đỗ", amount: "80g" },
      { name: "Chanh & ớt tươi", amount: "1 quả" },
    ],
    calories: 380,
    protein: 32.0,
    carbohydrates: 36.0,
    fat: 7.5,
    fiber: 3.0,
    addedSugar: 0,
    prepTime: "10 phút",
    prepTimeMinutes: 10,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Món Việt", "Ổn định insulin"],
    suitabilityNotes: "Đậm đà 32g đạm từ thịt bò nạc giàu sắt và kẽm. Yêu cầu nước dùng trong, không húp váng mỡ béo và không nêm đường phèn giúp giữ tải lượng glycemic ở mức an toàn.",
    instructions: [
      "Chần giá đỗ và bánh phở qua nước sôi, vớt vào bát tô.",
      "Xếp thịt bò bắp thái mỏng và hành tây thái sợi lên trên.",
      "Đun nước dùng sôi sùng sục, chan đều lên thịt bò để thịt chín tái hồng mềm ngọt.",
      "Thêm hành hoa, vắt chanh tươi và ăn kèm rau thơm.",
    ],
    tips: "Khi ăn phở ngoài hàng, bạn chỉ cần dặn chủ quán: 'Cho em bát nạc, ít bánh, nước trong không lấy mỡ gầu' là đã có bữa sáng chuẩn calo!",
  },
  {
    id: "bf-greek-yogurt-nuts",
    name: "Sữa chua Hy Lạp trộn hạnh nhân & táo tây giòn",
    nameEn: "Greek Yogurt Bowl with Almonds & Diced Crisp Apple",
    category: "breakfast",
    emoji: "🍏",
    themeColor: "emerald",
    description: "Bữa sáng siêu tốc chưa đầy 3 phút nhưng đạt đẳng cấp dinh dưỡng cao: đạm casein & whey cô đặc từ sữa chua Hy Lạp kết hợp chất béo đơn không bão hòa từ hạnh nhân.",
    ingredients: [
      { name: "Sữa chua Hy Lạp không đường (Greek Yogurt)", amount: "150g" },
      { name: "Táo tây (nguyên vỏ)", amount: "1/2 quả (80g)", notes: "Thái hạt lựu giòn" },
      { name: "Hạt hạnh nhân rang mộc", amount: "15g (khoảng 10-12 hạt)", notes: "Giã dập nhẹ" },
      { name: "Hạt chia", amount: "1 thìa cà phê (5g)" },
    ],
    calories: 250,
    protein: 18.0,
    carbohydrates: 20.0,
    fat: 9.8,
    fiber: 4.8,
    addedSugar: 0,
    prepTime: "3 phút",
    prepTimeMinutes: 3,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Nhanh gọn", "Low GI", "Tốt cho gan"],
    suitabilityNotes: "Cung cấp men vi sinh probiotic bảo vệ chức năng ruột - gan, hoàn toàn không chứa đường bổ sung. Chỉ số GI cực thấp (~25) giữ đường huyết phẳng tuyệt đối.",
    instructions: [
      "Múc 150g sữa chua Hy Lạp không đường ra bát.",
      "Rửa sạch táo, để nguyên vỏ (giàu chất xơ pectin) và cắt hạt lựu vừa ăn.",
      "Rải táo, hạnh nhân giã dập và hạt chia lên bề mặt sữa chua và thưởng thức ngay.",
    ],
    tips: "Rất phù hợp cho những buổi sáng bận rộn cần mang theo đến văn phòng.",
  },

  // ----------------------------------------
  // 2. LUNCH (BỮA TRƯA)
  // ----------------------------------------
  {
    id: "lu-chicken-brown-rice",
    name: "Cơm gạo lứt ức gà áp chảo sốt tiêu đen & bông cải xanh",
    nameEn: "Brown Rice with Black Pepper Chicken Breast & Steamed Broccoli",
    category: "lunch",
    emoji: "🍗",
    themeColor: "emerald",
    description: "Bữa trưa vàng chuẩn mực của chế độ giảm mỡ tăng cơ: ức gà ướp sốt tiêu đen thơm nức, cơm gạo lứt dẻo bùi và cả đĩa bông cải xanh giàu sulforaphane giải độc gan.",
    ingredients: [
      { name: "Ức gà phi lê", amount: "150g", notes: "Khía nhẹ, ướp tiêu tỏi" },
      { name: "Cơm gạo lứt nấu chín", amount: "1 chén vơi (130g)" },
      { name: "Bông cải xanh (súp lơ)", amount: "150g", notes: "Hấp hoặc luộc giòn" },
      { name: "Dầu ô liu", amount: "1 thìa cà phê (5g)" },
      { name: "Nước tương tỏi ớt ít muối", amount: "1 thìa canh" },
    ],
    calories: 410,
    protein: 38.5,
    carbohydrates: 42.0,
    fat: 7.2,
    fiber: 6.8,
    addedSugar: 0,
    prepTime: "15 phút",
    prepTimeMinutes: 15,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Giàu chất xơ", "Low GI", "Tốt cho gan", "Ổn định insulin"],
    suitabilityNotes: "Đạt tới 38.5g protein nạc hỗ trợ tổng hợp cơ bắp. Hợp chất sulforaphane trong bông cải xanh kích hoạt enzyme chống oxy hóa trong gan, bảo vệ gan khỏi tích tụ mỡ thừa.",
    instructions: [
      "Ức gà ướp chút tiêu đen xay, tỏi băm và 1 thìa nước tương trong 5 phút.",
      "Quét 1 lớp mỏng dầu ô liu lên chảo nóng, áp chảo ức gà mỗi mặt 4-5 phút cho chín vàng đều, thái lát xéo.",
      "Luộc hoặc hấp bông cải xanh trong 3 phút giữ màu xanh giòn ngọt.",
      "Xới cơm gạo lứt ra đĩa, bày ức gà và súp lơ xanh chấm cùng nước tương tỏi ớt.",
    ],
    tips: "Không nên hấp bông cải xanh quá nhũn để bảo toàn tối đa vitamin C và chất chống oxy hóa.",
  },
  {
    id: "lu-mackerel-soup",
    name: "Cá thu hấp gừng, cơm trắng vừa & canh rau ngót thịt nạc",
    nameEn: "Steamed Mackerel with Ginger, Rice & Katuk Minced Pork Soup",
    category: "lunch",
    emoji: "🐟",
    themeColor: "blue",
    description: "Mâm cơm gia đình Việt Nam thuần túy: cá thu giàu axit béo Omega-3 chống viêm, bát canh rau ngót băm ngọt mát thanh lọc cơ thể.",
    ingredients: [
      { name: "Cá thu tươi khúc nạc", amount: "120g", notes: "Ướp gừng hành hấp chín" },
      { name: "Cơm trắng nấu chín", amount: "1 chén nhỏ (120g)" },
      { name: "Rau ngót tươi", amount: "100g", notes: "Vò nhẹ nấu canh" },
      { name: "Thịt nạc heo băm nhỏ", amount: "40g" },
      { name: "Nước mắm truyền thống & tiêu", amount: "1 thìa nhỏ" },
    ],
    calories: 440,
    protein: 36.0,
    carbohydrates: 45.0,
    fat: 10.5,
    fiber: 3.5,
    addedSugar: 0,
    prepTime: "18 phút",
    prepTimeMinutes: 18,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Món Việt", "Tốt cho gan"],
    suitabilityNotes: "Axit béo Omega-3 EPA & DHA từ cá thu được chứng minh lâm sàng giúp giảm mỡ trong gan và cải thiện mỡ máu (triglycerides). Đạm phối hợp từ cá và thịt nạc tạo cảm giác thỏa mãn no lâu.",
    instructions: [
      "Ướp cá thu với gừng thái chỉ, chút tiêu và thìa nước mắm ngon, đem hấp cách thủy 12 phút.",
      "Xào thơm thịt nạc băm không dầu mỡ, cho nước sôi vào rồi thả rau ngót đã vò nát nấu chín tới.",
      "Ăn cùng 1 bát cơm trắng vừa phải.",
    ],
    tips: "Rau ngót vò kỹ trước khi nấu sẽ giúp canh mềm ngọt và tiết ra nhiều vi chất hơn.",
  },
  {
    id: "lu-bun-cha-lean",
    name: "Bún chả nạc nướng vỉ, nhiều rau thơm & dưa góp giòn",
    nameEn: "Hanoi Bun Cha (Lean Pork Patties, Vermicelli & Fresh Herbs)",
    category: "lunch",
    emoji: "🥗",
    themeColor: "amber",
    description: "Thưởng thức đặc sản Hà Nội nhưng được tinh chỉnh lành mạnh: chả làm từ thịt nạc vai xay không mỡ, nước chấm pha thanh nhạt giảm đường, đĩa rau thơm tươi bạt ngàn.",
    ingredients: [
      { name: "Thịt nạc heo xay ướp hành tỏi", amount: "140g", notes: "Nặn viên nướng nồi chiên không dầu" },
      { name: "Bún tươi", amount: "130g", notes: "Khẩu phần bún kiểm soát" },
      { name: "Đu đủ xanh & cà rốt thái mỏng", amount: "80g", notes: "Ngâm giấm tỏi" },
      { name: "Rau thơm, xà lách, tía tô, kinh giới", amount: "1 đĩa lớn (120g)" },
      { name: "Nước mắm pha loãng chanh ớt ít đường", amount: "1 bát nhỏ (đường < 3g)" },
    ],
    calories: 465,
    protein: 33.0,
    carbohydrates: 50.0,
    fat: 11.0,
    fiber: 5.2,
    addedSugar: 2.5,
    prepTime: "15 phút",
    prepTimeMinutes: 15,
    difficulty: "Trung bình",
    dietaryTags: ["Giàu đạm", "Món Việt", "Giàu chất xơ"],
    suitabilityNotes: "Tận dụng đĩa rau sống và dưa góp dồi dào chất xơ để ăn trước khi ăn bún, giúp tạo một lớp lưới chất xơ trong ruột, làm chậm hấp thu tinh bột và triệt tiêu cơn buồn ngủ sau bữa trưa.",
    instructions: [
      "Nặn thịt nạc viên thành từng miếng mỏng, nướng bằng nồi chiên không dầu ở 180°C trong 10-12 phút.",
      "Pha nước mắm loãng với nước ấm, cốt chanh, tỏi ớt băm và chỉ 1/2 thìa cà phê đường.",
      "Thả dưa góp đu đủ cà rốt và chả nướng nóng hổi vào bát nước chấm.",
      "Gắp nhiều rau sống ăn kèm bún và thịt chả.",
    ],
    tips: "Hãy ăn hết nửa đĩa rau thơm trước khi gắp bún để giữ đường huyết ổn định nhất.",
  },
  {
    id: "lu-tofu-tomato-mushrooms",
    name: "Đậu phụ sốt cà chua nấm đùi gà & cơm lứt, rau muống luộc",
    nameEn: "Tofu with Tomato Mushroom Sauce, Brown Rice & Water Spinach",
    category: "lunch",
    emoji: "🍲",
    themeColor: "rose",
    description: "Bữa trưa thực vật thanh nhẹ, tiết kiệm nhưng giàu đạm thực vật và chất chống oxy hóa lycopene từ cà chua chín đỏ kết hợp nấm ngọt đậm đà.",
    ingredients: [
      { name: "Đậu phụ trắng non", amount: "150g", notes: "Cắt miếng áp chảo nhẹ" },
      { name: "Nấm đùi gà tươi", amount: "80g", notes: "Thái lát xào cùng" },
      { name: "Cà chua chín đỏ", amount: "2 quả (150g)", notes: "Bổ múi cau sốt nhuyễn" },
      { name: "Cơm gạo lứt", amount: "1 chén nhỏ (120g)" },
      { name: "Rau muống luộc giòn", amount: "1 đĩa vừa (150g)" },
      { name: "Hành hoa & dầu ô liu", amount: "1 thìa cà phê (5g)" },
    ],
    calories: 395,
    protein: 23.5,
    carbohydrates: 48.0,
    fat: 10.5,
    fiber: 7.5,
    addedSugar: 0,
    prepTime: "15 phút",
    prepTimeMinutes: 15,
    difficulty: "Dễ",
    dietaryTags: ["Món chay", "Không đường thêm", "Giàu chất xơ", "Tiết kiệm", "Low GI"],
    suitabilityNotes: "Cung cấp đạm thực vật isoflavone hỗ trợ giảm cholesterol xấu LDL và kháng viêm. Giàu kali từ rau muống và cà chua giúp cân bằng huyết áp và giảm phù nước.",
    instructions: [
      "Áp chảo đậu phụ với chút dầu ô liu cho se vàng 2 mặt.",
      "Phi thơm hành, cho cà chua thái nhỏ vào xào nhuyễn thành sốt, thêm nấm đùi gà đảo đều.",
      "Cho đậu phụ vào đảo nhẹ tay cho ngấm sốt cà chua trong 3 phút, rắc hành hoa.",
      "Luộc rau muống giòn, vắt chanh vào nước luộc làm nước canh thanh mát.",
    ],
    tips: "Món ăn thanh đạm lý tưởng cho những ngày muốn ăn chay thanh lọc cơ thể.",
  },
  {
    id: "lu-beef-salad-wrap",
    name: "Thịt bò xào cần tây, dưa leo cuốn bánh tráng & cơm lứt",
    nameEn: "Stir-Fried Beef with Celery, Fresh Cucumber & Brown Rice",
    category: "lunch",
    emoji: "🥩",
    themeColor: "rose",
    description: "Thịt bò nạc xào nhanh với cần tây giòn thơm, bổ sung vitamin K và hợp chất apigenin chống viêm, cân bằng năng lượng bền bỉ cho ngày làm việc năng suất.",
    ingredients: [
      { name: "Thịt thăn bò nạc", amount: "130g", notes: "Thái mỏng xào lửa lớn" },
      { name: "Cần tây & hành tây", amount: "150g", notes: "Thái khúc giòn" },
      { name: "Dưa leo tươi", amount: "1 quả (100g)" },
      { name: "Cơm gạo lứt", amount: "1 chén vơi (120g)" },
      { name: "Dầu ăn thực vật", amount: "1 thìa cà phê (5g)" },
      { name: "Tỏi băm & tiêu đen", amount: "1 ít" },
    ],
    calories: 425,
    protein: 36.0,
    carbohydrates: 38.0,
    fat: 11.5,
    fiber: 5.5,
    addedSugar: 0,
    prepTime: "12 phút",
    prepTimeMinutes: 12,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Món Việt", "Ổn định insulin"],
    suitabilityNotes: "Chất phthalide trong cần tây hỗ trợ giãn mạch máu, phối hợp hoàn hảo với nguồn sắt heme dồi dào từ thịt bò giúp ngăn ngừa mệt mỏi, thiếu máu ở người ăn kiêng.",
    instructions: [
      "Ướp thịt bò với tỏi băm, tiêu và 1 thìa nước tương trong 5 phút.",
      "Làm nóng chảo với 1 thìa dầu, cho tỏi vào phi thơm rồi đổ thịt bò vào xào nhanh lửa to trong 2 phút vừa chín tới, múc riêng ra đĩa.",
      "Cho cần tây và hành tây vào chảo xào nhanh 1-2 phút cho chín tái giòn ngọt, đổ thịt bò vào đảo đều rồi tắt bếp.",
      "Ăn cùng cơm gạo lứt và dưa leo thái lát.",
    ],
    tips: "Xào bò lửa thật to và đảo nhanh tay để thịt giữ được độ ngọt mềm mọng nước, không bị dai.",
  },

  // ----------------------------------------
  // 3. AFTERNOON (BỮA CHIỀU - 14h-17h30)
  // ----------------------------------------
  {
    id: "af-black-coffee-egg",
    name: "Cà phê đen đá không đường & 1 quả trứng gà luộc",
    nameEn: "Iced Black Coffee (Unsweetened) & 1 Boiled Egg",
    category: "afternoon",
    emoji: "☕",
    themeColor: "amber",
    description: "Bộ đôi 'đánh thức não bộ' đỉnh cao cho dân văn phòng lúc 15h: caffeine và axit chlorogenic tăng cường tỉnh táo, quả trứng luộc chặn đứng cơn thèm đồ ngọt xế chiều.",
    ingredients: [
      { name: "Cà phê đen nguyên chất không đường", amount: "1 ly đá (150ml)", notes: "Không đường, không sữa đặc" },
      { name: "Trứng gà luộc", amount: "1 quả vừa (55g)", notes: "Luộc lòng đào hoặc chín" },
      { name: "Chút muối tiêu chanh", amount: "1 nhúm nhỏ" },
    ],
    calories: 78,
    protein: 7.0,
    carbohydrates: 0.5,
    fat: 5.2,
    fiber: 0.0,
    addedSugar: 0,
    prepTime: "2 phút",
    prepTimeMinutes: 2,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Nhanh gọn", "Tốt cho gan", "Ổn định insulin", "Tiết kiệm"],
    suitabilityNotes: "Nhiều nghiên cứu y khoa chứng minh cà phê đen (3-4 tách/ngày) làm giảm men gan ALT/AST và giảm tiến triển xơ gan ở người gan nhiễm mỡ (MASLD). Trứng bổ sung choline bảo vệ gan.",
    instructions: [
      "Pha 1 phin cà phê đen hoặc 1 tách espresso, thêm đá viên mát lạnh (tuyệt đối không thêm đường).",
      "Bóc vỏ quả trứng gà luộc, chấm chút muối tiêu chanh và thưởng thức nhẹ nhàng.",
    ],
    tips: "Uống trước 16h để không làm ảnh hưởng đến chất lượng giấc ngủ ban đêm.",
  },
  {
    id: "af-yogurt-chia-apple",
    name: "Sữa chua không đường trộn hạt chia & 1/2 quả táo giòn",
    nameEn: "Plain Yogurt with Chia Seeds & Fresh Crisp Apple Slices",
    category: "afternoon",
    emoji: "🍎",
    themeColor: "emerald",
    description: "Món ăn nhẹ tươi mát giải nhiệt buổi chiều, giàu canxi, đạm whey tự nhiên và chất xơ hòa tan giúp giữ đường huyết phẳng lì cho tới giờ cơm tối.",
    ingredients: [
      { name: "Sữa chua không đường Vinamilk / TH True Milk", amount: "1 hộp (100g)" },
      { name: "Hạt chia", amount: "1 thìa cà phê (5g)" },
      { name: "Táo tây", amount: "1/2 quả (70g)", notes: "Cắt lát mỏng" },
    ],
    calories: 125,
    protein: 6.0,
    carbohydrates: 15.0,
    fat: 3.5,
    fiber: 3.5,
    addedSugar: 0,
    prepTime: "2 phút",
    prepTimeMinutes: 2,
    difficulty: "Dễ",
    dietaryTags: ["Không đường thêm", "Giàu chất xơ", "Nhanh gọn", "Low GI"],
    suitabilityNotes: "Chất xơ pectin trong táo kết hợp cùng gel hạt chia nở trong dạ dày tạo cảm giác no tự nhiên, bảo vệ bạn khỏi các món trà sữa nhiều đường độc hại ngoài công ty.",
    instructions: [
      "Mở hộp sữa chua không đường, rắc 1 thìa hạt chia và khuấy đều.",
      "Thái lát mỏng nửa quả táo và chấm cùng sữa chua mát lạnh.",
    ],
    tips: "Để hạt chia trong sữa chua khoảng 3 phút cho nở mềm sẽ ngon hơn.",
  },
  {
    id: "af-edamame-tea",
    name: "Đậu nành Edamame luộc chấm muối biển & Trà xanh lài",
    nameEn: "Steamed Edamame with Sea Salt & Iced Jasmine Green Tea",
    category: "afternoon",
    emoji: "🫛",
    themeColor: "emerald",
    description: "Món ăn vặt thanh tao kiểu Nhật Bản: từng hạt đậu non bùi ngậy giòn ngọt chấm hạt muối biển, nhấp ngụm trà xanh thơm ngát giải tỏa căng thẳng công việc.",
    ingredients: [
      { name: "Đậu nành lông Edamame nguyên vỏ", amount: "1 đĩa nhỏ (120g, sau bóc ~60g hạt)" },
      { name: "Muối biển thô", amount: "1 nhúm nhỏ" },
      { name: "Trà xanh hoặc trà lài đá không đường", amount: "1 cốc 250ml" },
    ],
    calories: 85,
    protein: 7.5,
    carbohydrates: 6.5,
    fat: 3.2,
    fiber: 3.8,
    addedSugar: 0,
    prepTime: "5 phút",
    prepTimeMinutes: 5,
    difficulty: "Dễ",
    dietaryTags: ["Món chay", "Không đường thêm", "Giàu chất xơ", "Nhanh gọn", "Tốt cho gan"],
    suitabilityNotes: "EGCG trong trà xanh là chất chống oxy hóa mạnh mẽ giúp tăng tốc độ oxy hóa chất béo. Đậu Edamame cung cấp đạm thực vật trọn vẹn và folate dồi dào.",
    instructions: [
      "Đun nước sôi với chút muối, thả đậu Edamame vào luộc 4-5 phút cho chín ngọt.",
      "Vớt ra xả nước lạnh giữ màu xanh, rắc chút muối biển lên vỏ.",
      "Thưởng thức từng hạt đậu bùi ngậy cùng cốc trà xanh không đường thơm mát.",
    ],
    tips: "Đậu Edamame đông lạnh bán sẵn tại siêu thị rã đông và làm nóng chỉ mất 2 phút.",
  },
  {
    id: "af-guava-cashews",
    name: "Ổi tươi chấm muối ớt & 8-10 hạt điều rang mộc",
    nameEn: "Fresh Crunchy Guava with Chilli Salt & Roasted Cashews",
    category: "afternoon",
    emoji: "🍐",
    themeColor: "amber",
    description: "Ổi giòn ngọt mọng nước dồi dào vitamin C gấp 4 lần quả cam, kết hợp với vài hạt điều béo bùi cung cấp chất béo lành mạnh bảo vệ tim mạch.",
    ingredients: [
      { name: "Ổi tươi giòn", amount: "1 quả vừa (150g)", notes: "Rửa sạch bổ múi" },
      { name: "Hạt điều rang mộc hoặc rang muối nhẹ", amount: "15g (khoảng 8-10 hạt)" },
      { name: "Muối tôm / muối ớt nhẹ", amount: "1 nhúm nhỏ" },
    ],
    calories: 145,
    protein: 4.8,
    carbohydrates: 18.0,
    fat: 6.5,
    fiber: 6.2,
    addedSugar: 0,
    prepTime: "2 phút",
    prepTimeMinutes: 2,
    difficulty: "Dễ",
    dietaryTags: ["Giàu chất xơ", "Không đường thêm", "Nhanh gọn", "Tiết kiệm", "Low GI"],
    suitabilityNotes: "Chỉ số đường huyết GI của ổi chỉ ~30 và hàm lượng vitamin C cực cao giúp giảm stress oxy hóa ở gan, cải thiện độ nhạy insulin hiệu quả.",
    instructions: [
      "Rửa sạch ổi dưới vòi nước, để cả vỏ (nơi tập trung nhiều vitamin C nhất) rồi bổ miếng vừa ăn.",
      "Chấm nhẹ muối ớt và nhâm nhi cùng hạt điều rang giòn thơm.",
    ],
    tips: "Bỏ bớt phần hạt cứng bên trong nếu bạn có hệ tiêu hóa nhạy cảm.",
  },

  // ----------------------------------------
  // 4. DINNER (BỮA TỐI)
  // ----------------------------------------
  {
    id: "di-salmon-asparagus",
    name: "Cá hồi áp chảo măng tây sốt chanh bơ & khoai lang nhỏ",
    nameEn: "Pan-Seared Salmon with Asparagus, Lemon Butter & Sweet Potato",
    category: "dinner",
    emoji: "🍣",
    themeColor: "rose",
    description: "Bữa tối đẳng cấp nhà hàng tại gia: cá hồi giòn da thịt ngọt béo ngậy Omega-3, măng tây giòn ngọt giàu folate và nửa củ khoai lang bổ sung glycogen nhẹ nhàng.",
    ingredients: [
      { name: "Phi lê cá hồi tươi", amount: "140g", notes: "Thấm khô da, ướp tiêu muối" },
      { name: "Măng tây xanh", amount: "100g", notes: "Bỏ gốc già, cắt khúc" },
      { name: "Khoai lang luộc / nướng", amount: "1 củ nhỏ (100g)" },
      { name: "Bơ lạt hoặc dầu ô liu", amount: "1 thìa cà phê (5g)" },
      { name: "Chanh vàng & thì là", amount: "1 lát vắt sốt" },
    ],
    calories: 420,
    protein: 32.5,
    carbohydrates: 26.0,
    fat: 18.0,
    fiber: 5.5,
    addedSugar: 0,
    prepTime: "15 phút",
    prepTimeMinutes: 15,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Low GI", "Tốt cho gan", "Ổn định insulin"],
    suitabilityNotes: "Cung cấp lượng axit béo Omega-3 dồi dào giúp kháng viêm và giảm tích tụ mỡ nội tạng trong lúc ngủ. Lượng carbs phức hợp vừa phải từ khoai lang hỗ trợ giải phóng serotonin giúp giấc ngủ sâu hơn.",
    instructions: [
      "Rắc chút muối tiêu lên phi lê cá hồi, áp chảo mặt da trước trong 4 phút cho da giòn rụm, lật mặt thịt áp thêm 2 phút.",
      "Tận dụng chảo đảo nhanh măng tây cùng 1 thìa bơ nhỏ và chút tỏi băm trong 3 phút.",
      "Vắt vài giọt chanh tươi lên cá hồi, ăn kèm măng tây giòn và khoai lang luộc.",
    ],
    tips: "Thấm thật khô bề mặt da cá hồi trước khi áp chảo để da giòn tan không bị dính chảo.",
  },
  {
    id: "di-canh-chua-ca-loc",
    name: "Canh chua cá lóc miền Tây & Tôm luộc chấm tiêu chanh",
    nameEn: "Southern Sweet & Sour Snakehead Fish Soup & Boiled Shrimp",
    category: "dinner",
    emoji: "🥘",
    themeColor: "amber",
    description: "Hương vị quê nhà thanh nhẹ, ấm áp: cá quả ngọt thịt nấu cùng dọc mùng, cà chua, thơm (dứa) và đậu bắp, ăn kèm đĩa tôm nõn luộc giàu đạm nạc.",
    ingredients: [
      { name: "Cá lóc (cá quả) khúc nạc", amount: "120g" },
      { name: "Tôm nõn tươi", amount: "80g", notes: "Hấp hoặc luộc chín" },
      { name: "Dọc mùng (bạc hà), đậu bắp, cà chua, dứa", amount: "150g" },
      { name: "Nước cốt me chua & ngò ôm, ngò gai", amount: "1 lượng vừa" },
      { name: "Cơm trắng hoặc bún tươi", amount: "1 chén nhỏ (100g)" },
    ],
    calories: 360,
    protein: 41.0,
    carbohydrates: 32.0,
    fat: 5.5,
    fiber: 4.8,
    addedSugar: 0,
    prepTime: "20 phút",
    prepTimeMinutes: 20,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Món Việt", "Tốt cho gan"],
    suitabilityNotes: "Đạt tới 41g đạm từ nguồn thủy hải sản siêu nạc, chất béo chỉ 5.5g. Vị chua thanh tự nhiên từ me và dứa kích thích dịch vị tiêu hóa nhẹ bụng, không gây đầy hơi trước giờ ngủ.",
    instructions: [
      "Luộc tôm nõn nhanh trong 2-3 phút, vớt ra đĩa.",
      "Đun sôi nước, cho nước cốt me và cá lóc vào nấu chín tới.",
      "Thêm cà chua, dứa, dọc mùng và đậu bắp vào đun sôi thêm 2 phút, nêm chút nước mắm ngon.",
      "Múc canh ra tô, rắc ngò gai, ngò ôm và ớt tươi thái lát. Dùng kèm chén cơm nhỏ.",
    ],
    tips: "Dùng nước me chua tự nhiên, không nên nêm thêm đường ngọt như canh chua tiệm.",
  },
  {
    id: "di-chicken-mushroom-rolls",
    name: "Ức gà cuộn nấm kim châm hấp & Đĩa salad rau củ dầu giấm",
    nameEn: "Steamed Chicken Breast Mushroom Rolls & Garden Salad",
    category: "dinner",
    emoji: "🥗",
    themeColor: "emerald",
    description: "Món ăn thanh tao ít calo bậc nhất: từng dải ức gà đập mỏng cuộn tròn ôm trọn bó nấm kim châm ngọt nước, ăn kèm đĩa xà lách dưa chuột trộn sốt giấm táo thơm lừng.",
    ingredients: [
      { name: "Ức gà phi lê", amount: "150g", notes: "Thái lát mỏng bản to" },
      { name: "Nấm kim châm tươi", amount: "100g", notes: "Cắt gốc rửa sạch" },
      { name: "Xà lách, dưa chuột & cà chua bi", amount: "150g" },
      { name: "Dầu ô liu extra virgin", amount: "1 thìa cà phê (5g)" },
      { name: "Giấm táo & mù tạt Dijon", amount: "1 thìa nhỏ" },
      { name: "Khoai tây nhỏ hấp", amount: "1 củ (80g)" },
    ],
    calories: 320,
    protein: 36.5,
    carbohydrates: 22.0,
    fat: 8.5,
    fiber: 5.0,
    addedSugar: 0,
    prepTime: "15 phút",
    prepTimeMinutes: 15,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Giàu chất xơ", "Low GI", "Tốt cho gan"],
    suitabilityNotes: "Cực kỳ nhẹ bụng cho bữa tối (chỉ 320 kcal) nhưng chứa hơn 36g đạm nạc tinh khiết. Giấm táo hỗ trợ hạ đường huyết sau bữa ăn và ức chế tích tụ mỡ ban đêm.",
    instructions: [
      "Ức gà đập mỏng, rắc chút tiêu và xì dầu, cuộn chặt quanh bó nấm kim châm.",
      "Đem đĩa gà cuộn hấp cách thủy 8-10 phút cho chín ngọt mọng nước.",
      "Trộn đều xà lách, dưa chuột, cà chua bi cùng dầu ô liu và giấm táo.",
      "Gắp gà cuộn nấm ra đĩa thưởng thức nóng cùng salad thanh mát.",
    ],
    tips: "Bạn có thể dùng tăm tre ghim nhẹ mép cuộn gà trước khi hấp để cuộn không bị bung.",
  },
  {
    id: "di-beef-bell-pepper",
    name: "Bò lúc lắc nạc xào ớt chuông hành tây & 1/2 chén cơm gạo lứt",
    nameEn: "Sauteed Lean Beef Cubes with Bell Peppers & Brown Rice",
    category: "dinner",
    emoji: "🫑",
    themeColor: "rose",
    description: "Từng khối thịt bò nạc vuông vức xào săn lửa to cùng 3 màu ớt chuông rực rỡ giàu chất chống oxy hóa carotenoid, bổ sung kẽm và magie cho quá trình phục hồi cơ ban đêm.",
    ingredients: [
      { name: "Thịt bò thăn nạc", amount: "140g", notes: "Cắt khối quân cờ 2cm" },
      { name: "Ớt chuông đỏ, xanh & vàng", amount: "120g", notes: "Cắt miếng vuông" },
      { name: "Hành tây", amount: "40g" },
      { name: "Cơm gạo lứt", amount: "1/2 chén nhỏ (80g)" },
      { name: "Dầu ăn thực vật", amount: "1 thìa cà phê (5g)" },
      { name: "Tỏi băm & tiêu đen xay", amount: "1 ít" },
    ],
    calories: 415,
    protein: 37.0,
    carbohydrates: 28.0,
    fat: 14.0,
    fiber: 4.8,
    addedSugar: 0,
    prepTime: "15 phút",
    prepTimeMinutes: 15,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Món Việt", "Ổn định insulin"],
    suitabilityNotes: "Ớt chuông đỏ chứa lượng vitamin C cao nhất trong các loại rau củ, kích thích sản sinh collagen và tái tạo mô liên kết của cơ bắp khi ngủ sâu.",
    instructions: [
      "Ướp thịt bò với tỏi băm, tiêu đen và chút nước tương trong 10 phút.",
      "Làm nóng chảo với chút dầu, lắc chảo xào thịt bò lửa lớn trong 2-3 phút cho xém cạnh thơm phức, trút ra đĩa.",
      "Cho ớt chuông và hành tây vào xào nhanh 2 phút vừa chín tới, đổ bò vào đảo đều rồi tắt bếp.",
      "Ăn cùng nửa chén cơm gạo lứt ấm dẻo.",
    ],
    tips: "Không nên xào ớt chuông quá kỹ để giữ được độ ngọt giòn tươi ngon và bảo toàn vitamin C.",
  },

  // ----------------------------------------
  // 5. SNACKS (ĂN PHỤ - KHI CẦN)
  // ----------------------------------------
  {
    id: "sn-egg-whites",
    name: "2 Lòng trắng trứng gà luộc rắc tiêu muối hồng",
    nameEn: "Two Boiled Egg Whites with Black Pepper & Pink Salt",
    category: "snack",
    emoji: "🥚",
    themeColor: "emerald",
    description: "Nguồn đạm nạc tinh khiết nhất thế giới sinh học: gần như 0 chất béo, 0 tinh bột, chỉ có albumin tinh khiết giúp cắt đứt cơn đói đêm mà không ảnh hưởng tới mục tiêu calo.",
    ingredients: [
      { name: "Lòng trắng trứng gà luộc", amount: "2 cái (khoảng 70g)" },
      { name: "Tiêu đen xay & muối hồng", amount: "1 nhúm nhỏ" },
    ],
    calories: 36,
    protein: 7.6,
    carbohydrates: 0.5,
    fat: 0.1,
    fiber: 0.0,
    addedSugar: 0,
    prepTime: "4 phút",
    prepTimeMinutes: 4,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Nhanh gọn", "Tiết kiệm", "Ổn định insulin"],
    suitabilityNotes: "Chỉ 36 kcal nhưng cung cấp trọn vẹn 7.6g đạm nạc, hoàn hảo cho những lúc bạn cảm thấy cồn cào lúc nửa đêm mà không muốn nạp thêm calo dư thừa.",
    instructions: [
      "Luộc 2 quả trứng gà trong 7-8 phút.",
      "Bóc vỏ, tách lấy 2 lòng trắng (có thể để lại lòng đỏ cho bữa ăn khác).",
      "Rắc tiêu đen và muối hồng rồi thưởng thức ngay.",
    ],
    tips: "Bạn có thể luộc sẵn vài quả trứng bảo quản trong tủ lạnh ăn dần trong 2-3 ngày.",
  },
  {
    id: "sn-greek-yogurt-mini",
    name: "Sữa chua Hy Lạp nguyên chất (1 hũ nhỏ)",
    nameEn: "Plain Greek Yogurt Cup (High Protein)",
    category: "snack",
    emoji: "🥛",
    themeColor: "blue",
    description: "Một hũ sữa chua Hy Lạp cô đặc giàu đạm casein giải phóng chậm, nuôi dưỡng cơ bắp và tạo cảm giác dịu êm cho đường tiêu hóa.",
    ingredients: [
      { name: "Sữa chua Hy Lạp không đường", amount: "1 hũ nhỏ (100g)" },
    ],
    calories: 97,
    protein: 9.0,
    carbohydrates: 3.6,
    fat: 5.0,
    fiber: 0.0,
    addedSugar: 0,
    prepTime: "1 phút",
    prepTimeMinutes: 1,
    difficulty: "Dễ",
    dietaryTags: ["Giàu đạm", "Không đường thêm", "Nhanh gọn", "Low GI"],
    suitabilityNotes: "Cung cấp 9g đạm chất lượng cao với hàm lượng đường tự nhiên rất thấp (3.6g), là lựa chọn ăn phụ tuyệt vời trước hoặc sau buổi tập thể thao.",
    instructions: [
      "Mở nắp hũ sữa chua mát lạnh và thưởng thức trực tiếp.",
    ],
    tips: "Nếu thích vị chua dịu hơn, bạn có thể rắc thêm vài giọt cốt chanh hoặc chút bột quế.",
  },
  {
    id: "sn-cucumber-sticks",
    name: "Dưa leo thái thanh giòn chấm sốt sữa chua thì là",
    nameEn: "Crunchy Cucumber Sticks with Herbed Yogurt Dip",
    category: "snack",
    emoji: "🥒",
    themeColor: "emerald",
    description: "Thanh dưa leo giòn tan mọng nước chấm vào sốt sữa chua thơm ngát mùi thì là và tỏi nhẹ, vừa đã miệng nhai vừa nạp gần như 0 calo.",
    ingredients: [
      { name: "Dưa leo tươi", amount: "1-2 quả (150g)", notes: "Thái thanh dài" },
      { name: "Sữa chua không đường", amount: "2 thìa canh (40g)" },
      { name: "Thì là băm nhỏ & tiêu đen", amount: "1 ít" },
      { name: "Nước cốt chanh & muối nhẹ", amount: "vài giọt" },
    ],
    calories: 55,
    protein: 3.2,
    carbohydrates: 6.5,
    fat: 1.2,
    fiber: 1.8,
    addedSugar: 0,
    prepTime: "3 phút",
    prepTimeMinutes: 3,
    difficulty: "Dễ",
    dietaryTags: ["Không đường thêm", "Nhanh gọn", "Giàu chất xơ", "Tiết kiệm", "Low GI"],
    suitabilityNotes: "Dưa leo chứa tới 95% là nước và giàu chất điện giải, giúp thỏa mãn phản xạ nhai vui miệng mà không làm phá vỡ thâm hụt calo của bạn.",
    instructions: [
      "Dưa leo rửa sạch gọt so le vỏ, cắt thành từng thanh dài vừa tay cầm.",
      "Trộn đều 2 thìa sữa chua không đường với thì là thái nhuyễn, vài giọt chanh và chút muối tiêu.",
      "Cầm từng thanh dưa leo giòn rụm chấm vào sốt và thưởng thức.",
    ],
    tips: "Ngon hơn rất nhiều khi để dưa leo trong ngăn mát tủ lạnh trước khi ăn.",
  },
  {
    id: "sn-banana-peanut-butter",
    name: "1/2 Quả chuối tiêu phết 1 thìa nhỏ bơ đậu phộng nguyên chất",
    nameEn: "Half Banana with 1 Tsp 100% Pure Peanut Butter",
    category: "snack",
    emoji: "🍌",
    themeColor: "amber",
    description: "Bữa phụ nạp năng lượng nhanh trước buổi tập gym hoặc chạy bộ: carbohydrate hấp thu vừa từ chuối kết hợp chất béo lành mạnh từ bơ đậu phộng 100% không đường.",
    ingredients: [
      { name: "Chuối tiêu chín", amount: "1/2 quả (55g)" },
      { name: "Bơ đậu phộng nguyên chất 100% không đường", amount: "1 thìa cà phê nhỏ (8g)" },
    ],
    calories: 95,
    protein: 3.2,
    carbohydrates: 14.0,
    fat: 4.2,
    fiber: 2.0,
    addedSugar: 0,
    prepTime: "1 phút",
    prepTimeMinutes: 1,
    difficulty: "Dễ",
    dietaryTags: ["Không đường thêm", "Nhanh gọn", "Món chay"],
    suitabilityNotes: "Chất béo trong bơ đậu phộng giúp làm chậm quá trình hấp thu fructose của chuối, cung cấp kali chống chuột rút và ổn định nhịp tim.",
    instructions: [
      "Bóc vỏ nửa quả chuối, cắt thành 3-4 khoanh tròn.",
      "Phết một lớp mỏng bơ đậu phộng lên từng khoanh chuối và thưởng thức.",
    ],
    tips: "Hãy chọn bơ đậu phộng nguyên chất có bảng thành phần chỉ gồm '100% đậu phộng', không chứa dầu cọ hay đường bổ sung.",
  },
  {
    id: "sn-cheese-tangerine",
    name: "1 Miếng phô mai Con Bò Cười & 1 quả quýt ngọt mọng nước",
    nameEn: "One Laughing Cow Cheese Wedge & One Juicy Tangerine",
    category: "snack",
    emoji: "🍊",
    themeColor: "amber",
    description: "Sự kết hợp ngọt ngào béo thơm tiện lợi bỏ túi mọi lúc mọi nơi: vị béo ngậy giàu canxi của phô mai hòa quyện cùng từng múi quýt mọng nước giàu vitamin C.",
    ingredients: [
      { name: "Phô mai Con Bò Cười tam giác", amount: "1 miếng (15g)" },
      { name: "Quýt ngọt tươi", amount: "1 quả vừa (80g)" },
    ],
    calories: 78,
    protein: 2.5,
    carbohydrates: 9.0,
    fat: 3.5,
    fiber: 1.5,
    addedSugar: 0,
    prepTime: "1 phút",
    prepTimeMinutes: 1,
    difficulty: "Dễ",
    dietaryTags: ["Nhanh gọn", "Không đường thêm", "Tiết kiệm"],
    suitabilityNotes: "Calo cực kỳ vừa vặn (<80 kcal) cho một món ăn xế nhẹ nhàng, cung cấp canxi và vitamin C mà không làm tăng mỡ thừa.",
    instructions: [
      "Bóc vỏ quýt thành từng múi nhỏ mọng nước.",
      "Mở miếng phô mai tam giác và thưởng thức xen kẽ.",
    ],
    tips: "Cực kỳ tiện lợi để trong túi xách hoặc ngăn kéo bàn làm việc.",
  },
];

/**
 * Calculates a personalized suitability match score (0 - 100) and rationale
 * for a suggested dish based on the user's active goals and metabolic settings.
 */
export function getPersonalizedDishScore(
  dish: SuggestedDish,
  profile: StoredProfile | null,
  goal: StoredGoal | null,
  metabolicPrefs: MetabolicPreferences | null,
): {
  score: number;
  matchReasons: string[];
  recommendationBadge: string;
} {
  let score = 75; // baseline good score
  const matchReasons: string[] = [];

  // 1. High protein match for muscle preservation
  const targetProtein = goal?.dailyProteinTargetG || 120;
  if (dish.protein >= 30) {
    score += 15;
    matchReasons.push(`Đạt ${dish.protein}g đạm nạc xuất sắc giúp bảo tồn khối cơ khi thâm hụt calo.`);
  } else if (dish.protein >= 20) {
    score += 10;
    matchReasons.push(`Giàu đạm (${dish.protein}g), duy trì cảm giác no lâu.`);
  } else if (dish.category === "snack" && dish.protein >= 7) {
    score += 10;
    matchReasons.push(`Ăn phụ nạp nhanh ${dish.protein}g đạm không calo rỗng.`);
  }

  // 2. Calorie consciousness for weight loss
  if (goal && goal.dailyCalorieTarget) {
    const mealBudget = goal.dailyCalorieTarget * (dish.category === "snack" ? 0.15 : 0.35);
    if (dish.calories <= mealBudget) {
      score += 5;
      matchReasons.push(`Mức calo vừa vặn (${dish.calories} kcal) nằm trong ngân sách thâm hụt.`);
    }
  }

  // 3. Metabolic preferences: Fatty Liver / MASLD
  if (metabolicPrefs?.fattyLiverConsideration) {
    if (dish.dietaryTags.includes("Tốt cho gan")) {
      score += 10;
      matchReasons.push("Tối ưu cho gan nhiễm mỡ: giàu omega-3, rau họ cải, ít chất béo bão hòa.");
    }
    if (dish.addedSugar === 0) {
      score += 5;
    }
  }

  // 4. Metabolic preferences: High Insulin / Insulin resistance
  if (metabolicPrefs?.highInsulinConsideration) {
    if (dish.dietaryTags.includes("Low GI") || dish.dietaryTags.includes("Ổn định insulin")) {
      score += 10;
      matchReasons.push("Chỉ số đường huyết thấp (Low GI), làm chậm hấp thu tinh bột, tránh sốc insulin.");
    }
    if (dish.fiber >= 4) {
      score += 5;
      matchReasons.push(`Giàu chất xơ (${dish.fiber}g) làm phẳng đường cong đường huyết sau ăn.`);
    }
  }

  // 5. Added sugar control
  if (metabolicPrefs?.addedSugarMonitoringEnabled) {
    if (dish.addedSugar === 0) {
      score += 5;
      matchReasons.push("Hoàn toàn 0g đường bổ sung (No Added Sugar).");
    }
  }

  // 6. Morning high GI warning alignment
  if (dish.category === "breakfast" && metabolicPrefs?.morningHighGiWarningEnabled) {
    if (dish.dietaryTags.includes("Low GI")) {
      score += 8;
      matchReasons.push("Bữa sáng Low GI chuẩn chỉ dẫn, tránh đỉnh insulin sớm trong ngày.");
    }
  }

  // Clamp score between 60 and 99
  const finalScore = Math.min(99, Math.max(60, score));

  let badge = "Lựa chọn tốt";
  if (finalScore >= 90) {
    badge = "⭐ Rất phù hợp mục tiêu của bạn";
  } else if (finalScore >= 80) {
    badge = "Khuyên dùng";
  }

  return {
    score: finalScore,
    matchReasons: matchReasons.slice(0, 3),
    recommendationBadge: badge,
  };
}

/**
 * Filter and sort dishes collection
 */
export function filterAndSortDishes(params: {
  dishes: SuggestedDish[];
  category: MealTimeCategory;
  filterOption: DishFilterOption;
  sortOption: DishSortOption;
  profile?: StoredProfile | null;
  goal?: StoredGoal | null;
  metabolicPrefs?: MetabolicPreferences | null;
  searchQuery?: string;
}): SuggestedDish[] {
  const {
    dishes,
    category,
    filterOption,
    sortOption,
    profile = null,
    goal = null,
    metabolicPrefs = null,
    searchQuery = "",
  } = params;

  // 1. Filter by category
  let list = dishes.filter((d) => d.category === category);

  // 2. Search query filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.nameEn && d.nameEn.toLowerCase().includes(q)) ||
        d.description.toLowerCase().includes(q) ||
        d.ingredients.some((ing) => ing.name.toLowerCase().includes(q)),
    );
  }

  // 3. Dietary tag filter
  if (filterOption === "high_protein") {
    list = list.filter((d) => (d.category === "snack" ? d.protein >= 7 : d.protein >= 20));
  } else if (filterOption === "low_sugar") {
    list = list.filter((d) => d.addedSugar === 0);
  } else if (filterOption === "high_fiber") {
    list = list.filter((d) => d.fiber >= 4);
  } else if (filterOption === "lower_carb") {
    list = list.filter((d) => d.carbohydrates <= 30);
  } else if (filterOption === "quick_prep") {
    list = list.filter((d) => d.prepTimeMinutes <= 10);
  } else if (filterOption === "vietnamese") {
    list = list.filter((d) => d.dietaryTags.includes("Món Việt"));
  } else if (filterOption === "vegetarian") {
    list = list.filter((d) => d.dietaryTags.includes("Món chay"));
  } else if (filterOption === "budget") {
    list = list.filter((d) => d.dietaryTags.includes("Tiết kiệm"));
  }

  // 4. Sorting
  if (sortOption === "suitability") {
    list.sort((a, b) => {
      const scoreA = getPersonalizedDishScore(a, profile, goal, metabolicPrefs).score;
      const scoreB = getPersonalizedDishScore(b, profile, goal, metabolicPrefs).score;
      return scoreB - scoreA;
    });
  } else if (sortOption === "highest_protein") {
    list.sort((a, b) => b.protein - a.protein);
  } else if (sortOption === "lowest_calories") {
    list.sort((a, b) => a.calories - b.calories);
  } else if (sortOption === "fastest_prep") {
    list.sort((a, b) => a.prepTimeMinutes - b.prepTimeMinutes);
  }

  return list;
}
