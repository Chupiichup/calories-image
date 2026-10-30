import type { IAiVisionProvider, MealAnalysisResult } from "./types";
import { MealAnalysisResponseSchema } from "./types";

/**
 * Mock Provider for development, automated testing, and fallback when no API key is provided.
 * Provides realistic Vietnamese dishes with full macro breakdown and uncertainties.
 */
export class MockVisionProvider implements IAiVisionProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-vision-v1";

  async analyzeFoodImage(params: {
    imageBase64: string;
    mimeType: string;
    userNote?: string;
  }): Promise<MealAnalysisResult> {
    // Simulate brief network latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const note = (params.userNote || "").toLowerCase();

    if (note.includes("phở") || note.includes("pho")) {
      return {
        mealTypeInferred: "breakfast",
        confidenceOverall: 0.94,
        candidates: [
          {
            name: "Phở bò tái chín (bánh phở + nước dùng + thịt bò)",
            standardizedName: "pho_bo_beef_noodles",
            portionG: 550,
            calories: 468,
            protein: 27.5,
            carbs: 60.5,
            fat: 12.1,
            fiber: 2.2,
            confidence: 0.95,
            preparationMethod: "Nấu nước dùng xương và trần tái chín",
            ingredients: ["Bánh phở tươi", "Thịt bò nạc", "Hành lá", "Nước hầm xương"],
            notes: "Bát phở bò nhiều thịt nạc, lượng béo vừa phải.",
            uncertainties: ["Lượng đường tinh luyện và mỡ màng trong nước dùng"],
          },
          {
            name: "Rau thơm và giá đỗ ăn kèm",
            standardizedName: "fresh_herbs_and_bean_sprouts",
            portionG: 50,
            calories: 15,
            protein: 1.5,
            carbs: 2.6,
            fat: 0.1,
            fiber: 1.0,
            confidence: 0.88,
            preparationMethod: "Ăn sống",
            ingredients: ["Giá sống", "Húng quế", "Ngò gai"],
          },
        ],
        observations: "Món ăn giàu protein và carbohydrate phức hợp, cung cấp năng lượng tốt cho buổi sáng.",
        nutritionalInsight: "Húp ít nước dùng béo có thể giúp tiết kiệm ~80-120 kcal từ mỡ động vật.",
      };
    }

    if (note.includes("bánh mì") || note.includes("banh mi")) {
      return {
        mealTypeInferred: "breakfast",
        confidenceOverall: 0.92,
        candidates: [
          {
            name: "Bánh mì thịt pate chả lụa",
            standardizedName: "banh_mi_thit_vietnamese",
            portionG: 180,
            calories: 441,
            protein: 18.9,
            carbs: 57.6,
            fat: 15.3,
            fiber: 3.2,
            confidence: 0.92,
            preparationMethod: "Bánh mì nướng kẹp nhân",
            ingredients: ["Bánh mì", "Pate gan", "Chả lụa", "Dưa leo", "Đồ chua"],
            notes: "Bánh mì Việt Nam truyền thống kẹp thịt nạc và chả.",
            uncertainties: ["Lượng bơ/mayonnaise và pate thực tế quết trong ổ bánh"],
          },
        ],
        observations: "Bữa sáng tiện lợi, tỷ lệ tinh bột và chất béo tương đối cao.",
        nutritionalInsight: "Để tăng cơ giảm mỡ, bạn có thể gọi thêm 1 quả trứng ốp-la hoặc giảm bớt sốt bơ.",
      };
    }

    // Default: healthy Vietnamese meal plate (Cơm trắng + Ức gà/thịt nạc + Rau luộc)
    return {
      mealTypeInferred: "lunch",
      confidenceOverall: 0.93,
      candidates: [
        {
          name: "Cơm trắng (nấu chín)",
          standardizedName: "cooked_white_rice",
          portionG: 180,
          calories: 234,
          protein: 4.9,
          carbs: 50.8,
          fat: 0.5,
          fiber: 0.7,
          confidence: 0.96,
          preparationMethod: "Nấu nồi cơm điện",
          ingredients: ["Gạo tẻ"],
          notes: "Khoảng 1 chén rưỡi cơm trắng vừa vặn.",
        },
        {
          name: "Ức gà áp chảo không da",
          standardizedName: "skinless_chicken_breast",
          portionG: 160,
          calories: 264,
          protein: 49.6,
          carbs: 0.0,
          fat: 5.8,
          fiber: 0.0,
          confidence: 0.92,
          preparationMethod: "Áp chảo ít dầu",
          ingredients: ["Ức gà", "Tiêu", "Muối tinh"],
          notes: "Thịt nạc cao đạm, rất tối ưu cho bảo toàn khối cơ bắp.",
        },
        {
          name: "Rau muống luộc chấm nước mắm",
          standardizedName: "boiled_water_spinach",
          portionG: 150,
          calories: 34.5,
          protein: 3.9,
          carbs: 4.7,
          fat: 0.5,
          fiber: 1.5,
          confidence: 0.9,
          preparationMethod: "Luộc chín",
          ingredients: ["Rau muống tươi"],
          notes: "Bổ sung chất xơ tự nhiên và vi khoáng.",
        },
        {
          name: "Dầu ăn thực vật chế biến",
          standardizedName: "vegetable_oil",
          portionG: 8,
          calories: 70.7,
          protein: 0.0,
          carbs: 0.0,
          fat: 8.0,
          fiber: 0.0,
          confidence: 0.75,
          preparationMethod: "Dầu phết khi áp chảo",
          notes: "Ước lượng dầu mỡ ngấm trong quá trình chế biến.",
          uncertainties: ["Lượng dầu mỡ dư đọng trên bề mặt thực phẩm"],
        },
      ],
      observations: "Bữa ăn cân đối, giàu protein sạch (hơn 58g đạm) hỗ trợ tối ưu duy trì cơ bắp trong khi thâm hụt mỡ.",
      nutritionalInsight: "Bữa trưa này đáp ứng xuất sắc tiêu chí dinh dưỡng bảo toàn cơ bắp.",
    };
  }
}

