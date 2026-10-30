/**
 * Curated Metabolic Nutrition & Glycemic Database
 * 
 * Provides evidence-informed Glycemic Index (GI), Sugar Classification,
 * and Added Sugar reference data for Vietnamese and common international foods.
 * 
 * Sources:
 * 1. Atkinson FS, et al. International tables of glycemic index and glycemic load values: 2021.
 * 2. National Institute of Nutrition (Viện Dinh dưỡng Quốc gia Việt Nam) - Bảng thành phần thực phẩm VN.
 * 3. USDA FoodData Central.
 */

export type SugarClassification =
  | "NO_KNOWN_SUGAR"
  | "NATURAL_SUGAR"
  | "ADDED_SUGAR"
  | "BOTH_NATURAL_AND_ADDED"
  | "UNKNOWN";

export type GiCategory = "low" | "medium" | "high" | "unknown" | "not_applicable";
export type GlCategory = "low" | "medium" | "high" | "unknown";
export type StrictnessLevel = "gentle" | "balanced" | "strict";

export type MetabolicFoodReference = {
  keywords: string[];
  standardizedName: string;
  giValue?: number;
  giCategory: GiCategory;
  sugarClassification: SugarClassification;
  typicalAddedSugarPer100g: number;
  typicalTotalSugarPer100g: number;
  isCommonHiddenSugar: boolean;
  clarificationQuestion?: string;
  suggestedAlternative?: string;
  notes?: string;
};

export const METABOLIC_FOOD_CATALOGUE: MetabolicFoodReference[] = [
  // --- Tinh bột cơ bản ---
  {
    keywords: ["cơm trắng", "com trang", "cơm", "com", "cơm tấm", "com tam", "gạo trắng"],
    standardizedName: "cooked_white_rice",
    giValue: 73,
    giCategory: "high",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 0.1,
    isCommonHiddenSugar: false,
    suggestedAlternative: "Có thể thay một phần cơm trắng bằng cơm gạo lứt, khoai lang luộc hoặc bổ sung thêm nhiều rau xanh để làm chậm tốc độ tăng đường huyết.",
    notes: "Cơm trắng nấu chín có GI cao nhưng không chứa đường bổ sung. Ăn kèm nhiều rau xanh (chất xơ) và đạm sẽ giúp giảm tải lượng đường huyết tổng thể.",
  },
  {
    keywords: ["cơm gạo lứt", "gao lut", "gạo lứt", "cơm lứt", "com lut"],
    standardizedName: "cooked_brown_rice",
    giValue: 55,
    giCategory: "low",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 0.2,
    isCommonHiddenSugar: false,
    notes: "Gạo lứt còn giữ nguyên lớp cám giàu chất xơ và vi chất, GI ở ngưỡng thấp/trung bình (khoảng 50-55).",
  },
  {
    keywords: ["xôi", "xoi", "xôi xéo", "xôi gà", "gạo nếp", "nếp"],
    standardizedName: "sticky_rice",
    giValue: 86,
    giCategory: "high",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 0.2,
    isCommonHiddenSugar: false,
    suggestedAlternative: "Giảm bớt khẩu phần xôi và kết hợp với trứng luộc, thịt nạc và dưa leo.",
    notes: "Gạo nếp chứa hàm lượng amylopectin rất cao, dễ tiêu hóa nhanh, làm tăng đường huyết nhanh sau ăn.",
  },
  {
    keywords: ["phở", "pho", "bánh phở", "banh pho"],
    standardizedName: "pho_noodles",
    giValue: 65,
    giCategory: "medium",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 0.2,
    isCommonHiddenSugar: true, // nước dùng phở ngoài hàng hay thêm đường phèn/mì chính ngọt
    clarificationQuestion: "Nước dùng phở có được hầm thêm nhiều đường phèn không?",
    notes: "Bánh phở có GI trung bình (~65). Cần lưu ý nước dùng phở ngoài hàng quán thường được ninh thêm đường phèn.",
  },
  {
    keywords: ["bún", "bun", "bún tươi", "bun tuoi"],
    standardizedName: "rice_vermicelli",
    giValue: 58,
    giCategory: "medium",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 0.1,
    isCommonHiddenSugar: false,
    notes: "Bún tươi qua quá trình lên men tự nhiên có GI ở mức trung bình thấp (~55 - 58).",
  },
  {
    keywords: ["bánh mì", "banh mi", "bánh mì trắng", "banh mi trang"],
    standardizedName: "white_bread",
    giValue: 75,
    giCategory: "high",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 1.5,
    typicalTotalSugarPer100g: 3.5,
    isCommonHiddenSugar: true,
    suggestedAlternative: "Ưu tiên bánh mì nguyên cám (whole-wheat), bổ sung thêm trứng, ức gà và dưa chuột xà lách.",
    notes: "Bánh mì trắng làm từ bột mì tinh chế có GI cao (~75).",
  },
  {
    keywords: ["bánh mì đen", "bánh mì nguyên cám", "whole wheat", "rye bread"],
    standardizedName: "whole_grain_bread",
    giValue: 54,
    giCategory: "low",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 1.0,
    typicalTotalSugarPer100g: 2.5,
    isCommonHiddenSugar: false,
    notes: "Bánh mì nguyên cám có nhiều chất xơ, giúp chỉ số GI ở mức thấp (~54).",
  },
  {
    keywords: ["khoai lang", "khoai lang luộc", "khoai lang hấp", "sweet potato"],
    standardizedName: "boiled_sweet_potato",
    giValue: 54,
    giCategory: "low",
    sugarClassification: "NATURAL_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 4.2,
    isCommonHiddenSugar: false,
    notes: "Khoai lang luộc/hấp có GI thấp (~54) và dồi dào chất xơ; nếu nướng lâu thì GI có thể tăng cao hơn do tinh bột chuyển hóa thành đường maltose.",
  },
  {
    keywords: ["yến mạch", "oats", "oatmeal"],
    standardizedName: "rolled_oats",
    giValue: 55,
    giCategory: "low",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 1.0,
    isCommonHiddenSugar: false,
    notes: "Yến mạch cán dẹt giàu chất xơ hòa tan beta-glucan, hỗ trợ kiểm soát đường huyết và insulin rất tốt.",
  },

  // --- Đồ uống & Món ngọt phổ biến ---
  {
    keywords: ["cà phê sữa", "ca phe sua", "cà phê sữa đá", "nâu đá", "nau da", "bạc xỉu", "bac xiu"],
    standardizedName: "vietnamese_iced_milk_coffee",
    giValue: 60,
    giCategory: "medium",
    sugarClassification: "BOTH_NATURAL_AND_ADDED",
    typicalAddedSugarPer100g: 9.5, // ~25g đường trong ly 250ml
    typicalTotalSugarPer100g: 11.0,
    isCommonHiddenSugar: true,
    clarificationQuestion: "Bạn có dùng sữa đặc nhiều không? (Có thể chọn cà phê ít sữa đặc hoặc cà phê đen để giảm đường)",
    suggestedAlternative: "Có thể chuyển sang cà phê đen không đường, cà phê americano hoặc yêu cầu quán chỉ cho 1 thìa nhỏ sữa đặc.",
    notes: "Cà phê sữa đá truyền thống chứa lượng lớn sữa đặc có đường (~20-25g đường bổ sung mỗi ly).",
  },
  {
    keywords: ["cà phê đen", "ca phe den", "đen đá", "americano", "espresso"],
    standardizedName: "black_coffee",
    giValue: 0,
    giCategory: "not_applicable",
    sugarClassification: "NO_KNOWN_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 0,
    isCommonHiddenSugar: false,
    notes: "Cà phê đen nguyên chất không chứa đường, năng lượng rất thấp.",
  },
  {
    keywords: ["trà sữa", "tra sua", "milk tea", "trà sữa trân châu", "boba"],
    standardizedName: "bubble_milk_tea",
    giValue: 70,
    giCategory: "high",
    sugarClassification: "ADDED_SUGAR",
    typicalAddedSugarPer100g: 10.0, // ~40-55g đường trong 1 ly 500ml
    typicalTotalSugarPer100g: 11.5,
    isCommonHiddenSugar: true,
    clarificationQuestion: "Ly trà sữa này chọn mức đường bao nhiêu? (100%, 70%, 50%, 30% hay 0% đường?)",
    suggestedAlternative: "Có thể giảm lượng đường xuống 30% hoặc 0% đường, dùng trà nguyên bản (trà lài, ô long) không topping siro.",
    notes: "Một ly trà sữa trân châu 500ml thường chứa 40-55g đường bổ sung (vượt ngưỡng khuyến nghị hàng ngày của WHO).",
  },
  {
    keywords: ["nước ngọt", "nuoc ngot", "coca", "pepsi", "sting", "7up", "soda ngọt"],
    standardizedName: "soda_sweetened",
    giValue: 70,
    giCategory: "high",
    sugarClassification: "ADDED_SUGAR",
    typicalAddedSugarPer100g: 10.6, // ~35g đường/lon 330ml
    typicalTotalSugarPer100g: 10.6,
    isCommonHiddenSugar: false,
    suggestedAlternative: "Thay bằng nước lọc, nước khoáng có ga (sparkling water) hoặc nước ngọt không calo (Zero Sugar) nếu cần.",
    notes: "Đồ uống có đường giải phóng nhanh lượng lớn siro bắp giàu fructose (HFCS), dễ tích mỡ nội tạng và gan nhiễm mỡ.",
  },
  {
    keywords: ["sữa chua không đường", "sua chua khong duong", "plain yogurt", "greek yogurt"],
    standardizedName: "plain_unsweetened_yogurt",
    giValue: 35,
    giCategory: "low",
    sugarClassification: "NATURAL_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 4.5, // Đường lactose tự nhiên trong sữa
    isCommonHiddenSugar: false,
    notes: "Chỉ chứa đường lactose tự nhiên từ sữa, không có đường bổ sung, GI thấp và giàu men vi sinh.",
  },
  {
    keywords: ["sữa chua có đường", "sua chua co duong", "sữa chua", "sua chua", "yogurt"],
    standardizedName: "sweetened_yogurt",
    giValue: 45,
    giCategory: "low",
    sugarClassification: "BOTH_NATURAL_AND_ADDED",
    typicalAddedSugarPer100g: 7.0, // ~7-10g đường thêm
    typicalTotalSugarPer100g: 11.5,
    isCommonHiddenSugar: true,
    clarificationQuestion: "Đây là sữa chua có đường hay không đường?",
    suggestedAlternative: "Có thể chuyển sang sữa chua không đường và thêm một ít quả mọng (dâu tây, việt quất) tạo vị ngọt tự nhiên.",
    notes: "Chứa cả đường lactose tự nhiên của sữa và đường mía bổ sung.",
  },
  {
    keywords: ["nước ép", "nuoc ep", "nước cam ép", "nước ép hoa quả", "fruit juice"],
    standardizedName: "fruit_juice",
    giValue: 66,
    giCategory: "medium",
    sugarClassification: "NATURAL_SUGAR", // Free sugars according to WHO
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 9.5,
    isCommonHiddenSugar: true, // Nhiều quán cho thêm đường cát
    clarificationQuestion: "Nước ép này là nguyên chất 100% hay có thêm đường/siro?",
    suggestedAlternative: "Ưu tiên ăn trái cây nguyên múi/nguyên quả để giữ lại chất xơ, giúp đường hấp thu từ từ.",
    notes: "Theo WHO, đường trong nước ép hoa quả được phân loại là Free Sugar (đường tự do) vì đã bị tách bỏ phần lớn chất xơ cấu trúc.",
  },
  {
    keywords: ["chuối", "chuoi", "banana"],
    standardizedName: "banana",
    giValue: 51, // Chuối vừa chín ~51, chuối chín kỹ ~60
    giCategory: "low",
    sugarClassification: "NATURAL_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 12.2,
    isCommonHiddenSugar: false,
    notes: "Đường hoàn toàn tự nhiên từ quả chuối kèm kali và chất xơ. Chuối càng chín nhiều đốm đen thì GI càng cao.",
  },
  {
    keywords: ["táo", "tao", "apple"],
    standardizedName: "apple",
    giValue: 36,
    giCategory: "low",
    sugarClassification: "NATURAL_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 10.4,
    isCommonHiddenSugar: false,
    notes: "GI thấp (~36), giàu chất xơ pectin hòa tan, rất tốt cho quá trình ổn định đường huyết.",
  },
  {
    keywords: ["cam", "cam tươi", "orange"],
    standardizedName: "orange",
    giValue: 43,
    giCategory: "low",
    sugarClassification: "NATURAL_SUGAR",
    typicalAddedSugarPer100g: 0,
    typicalTotalSugarPer100g: 9.0,
    isCommonHiddenSugar: false,
    notes: "Cam nguyên quả giữ nguyên múi và chất xơ, giúp làm chậm giải phóng đường tự nhiên so với nước ép cam.",
  },
  {
    keywords: ["bánh ngọt", "banh ngot", "bánh kem", "chè", "che", "kem", "ice cream"],
    standardizedName: "dessert_sweet",
    giValue: 70,
    giCategory: "high",
    sugarClassification: "ADDED_SUGAR",
    typicalAddedSugarPer100g: 22.0,
    typicalTotalSugarPer100g: 25.0,
    isCommonHiddenSugar: false,
    suggestedAlternative: "Nên thưởng thức khẩu phần nhỏ sau bữa ăn chính giàu chất xơ và đạm để giảm đỉnh đường huyết.",
    notes: "Món tráng miệng có hàm lượng đường bổ sung và chất béo bão hòa cao.",
  },
];

/**
 * Helper to match an input food name against the metabolic catalogue
 */
export function matchMetabolicFoodReference(foodName: string): MetabolicFoodReference | undefined {
  if (!foodName) return undefined;
  const normalized = foodName.toLowerCase().trim();

  // 1. Direct exact keyword match
  for (const ref of METABOLIC_FOOD_CATALOGUE) {
    if (ref.keywords.some((k) => normalized === k.toLowerCase())) {
      return ref;
    }
  }

  // 2. Longest matching keyword first
  let bestMatch: { ref: MetabolicFoodReference; keywordLength: number } | undefined;

  for (const ref of METABOLIC_FOOD_CATALOGUE) {
    for (const k of ref.keywords) {
      const lowerK = k.toLowerCase();
      if (normalized.includes(lowerK)) {
        if (!bestMatch || lowerK.length > bestMatch.keywordLength) {
          bestMatch = { ref, keywordLength: lowerK.length };
        }
      }
    }
  }

  return bestMatch?.ref;
}

