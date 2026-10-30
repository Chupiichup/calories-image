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

    if (note.includes("bánh mì") || note.includes("banh mi") || note.includes("sandwich")) {
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

    if (note.includes("cơm tấm") || note.includes("com tam")) {
      return {
        mealTypeInferred: "lunch",
        confidenceOverall: 0.93,
        candidates: [
          {
            name: "Cơm tấm hạt vỡ",
            standardizedName: "broken_rice",
            portionG: 200,
            calories: 260,
            protein: 5.2,
            carbs: 57.0,
            fat: 0.6,
            fiber: 0.8,
            confidence: 0.95,
            preparationMethod: "Hấp chín",
            ingredients: ["Gạo tấm"],
          },
          {
            name: "Sườn cốt lết nướng mật ong",
            standardizedName: "grilled_pork_chop",
            portionG: 120,
            calories: 288,
            protein: 24.5,
            carbs: 6.2,
            fat: 18.4,
            fiber: 0.0,
            confidence: 0.92,
            preparationMethod: "Nướng than hoa",
            ingredients: ["Sườn heo", "Gia vị ướp sườn"],
          },
          {
            name: "Trứng ốp la",
            standardizedName: "fried_egg",
            portionG: 45,
            calories: 90,
            protein: 6.3,
            carbs: 0.4,
            fat: 7.0,
            fiber: 0.0,
            confidence: 0.95,
            preparationMethod: "Chiên lòng đào",
          },
          {
            name: "Mỡ hành và đồ chua",
            standardizedName: "scallion_oil_pickles",
            portionG: 30,
            calories: 65,
            protein: 0.5,
            carbs: 3.5,
            fat: 5.5,
            fiber: 1.0,
            confidence: 0.85,
            preparationMethod: "Chế dầu sôi vào hành lá",
          },
        ],
        observations: "Đĩa cơm tấm sườn trứng kinh điển, giàu protein và đậm đà hương vị.",
        nutritionalInsight: "Bữa ăn đáp ứng ~36g protein giúp giữ cơ bắp. Có thể bớt mỡ hành để tiết kiệm ~50 kcal chất béo.",
      };
    }

    if (note.includes("bún chả") || note.includes("bun cha")) {
      return {
        mealTypeInferred: "lunch",
        confidenceOverall: 0.91,
        candidates: [
          {
            name: "Chả viên và chả miếng nướng than",
            standardizedName: "grilled_pork_patties",
            portionG: 140,
            calories: 340,
            protein: 22.8,
            carbs: 4.5,
            fat: 25.6,
            fiber: 0.0,
            confidence: 0.92,
            preparationMethod: "Nướng than",
          },
          {
            name: "Bún tươi trắng",
            standardizedName: "fresh_rice_vermicelli",
            portionG: 200,
            calories: 220,
            protein: 3.4,
            carbs: 51.4,
            fat: 0.2,
            fiber: 0.6,
            confidence: 0.94,
            preparationMethod: "Trần nước sôi",
          },
          {
            name: "Nước chấm bún chả và đu đủ chua",
            standardizedName: "dipping_sauce_pickled_papaya",
            portionG: 100,
            calories: 85,
            protein: 1.2,
            carbs: 18.0,
            fat: 0.2,
            fiber: 1.2,
            confidence: 0.88,
            preparationMethod: "Pha nước mắm, đường, giấm",
          },
        ],
        observations: "Bún chả Hà Nội có tỷ lệ đạm và carb hài hòa, nước chấm có lượng đường nhất định.",
        nutritionalInsight: "Nên ăn kèm nhiều rau sống (xà lách, tía tô, kinh giới) để bổ sung chất xơ hòa tan.",
      };
    }

    if (note.includes("bún đậu") || note.includes("bun dau")) {
      return {
        mealTypeInferred: "lunch",
        confidenceOverall: 0.92,
        candidates: [
          {
            name: "Đậu phụ chiên giòn",
            standardizedName: "fried_tofu",
            portionG: 150,
            calories: 285,
            protein: 16.5,
            carbs: 3.2,
            fat: 23.0,
            fiber: 1.5,
            confidence: 0.94,
            preparationMethod: "Chiên ngập dầu",
          },
          {
            name: "Bún lá tươi",
            standardizedName: "pressed_rice_vermicelli",
            portionG: 180,
            calories: 198,
            protein: 3.0,
            carbs: 46.0,
            fat: 0.2,
            fiber: 0.5,
            confidence: 0.95,
          },
          {
            name: "Chả cốm và thịt chân giò luộc",
            standardizedName: "green_rice_pork_sausage",
            portionG: 100,
            calories: 260,
            protein: 16.0,
            carbs: 12.0,
            fat: 16.5,
            fiber: 0.3,
            confidence: 0.90,
          },
          {
            name: "Mắm tôm pha tắc ớt đường",
            standardizedName: "fermented_shrimp_paste_dip",
            portionG: 30,
            calories: 45,
            protein: 2.5,
            carbs: 4.5,
            fat: 1.8,
            fiber: 0.0,
            confidence: 0.85,
          },
        ],
        observations: "Mẹt bún đậu đầy đủ cung cấp năng lượng lớn từ protein đậu nành và chất béo chiên.",
        nutritionalInsight: "Đậu phụ chiên ngập dầu hút khá nhiều calo; bạn có thể dùng giấy thấm dầu hoặc luộc đậu nếu đang siết cân.",
      };
    }

    if (note.includes("bánh bao") || note.includes("banh bao")) {
      return {
        mealTypeInferred: "breakfast",
        confidenceOverall: 0.94,
        candidates: [
          {
            name: "Bánh bao nhân thịt trứng cút",
            standardizedName: "steamed_pork_bun",
            portionG: 160,
            calories: 360,
            protein: 13.5,
            carbs: 52.0,
            fat: 11.2,
            fiber: 1.8,
            confidence: 0.95,
            preparationMethod: "Hấp cách thủy",
            ingredients: ["Bột mì", "Thịt heo xay", "Trứng cút", "Mộc nhĩ", "Hành"],
            notes: "Bánh bao hấp nóng nhân thịt truyền thống.",
          },
        ],
        observations: "Bữa sáng tiện lợi, chế biến bằng phương pháp hấp giúp giữ trọn dưỡng chất không thêm dầu mỡ.",
        nutritionalInsight: "Hàm lượng carb chiếm ưu thế, nên uống kèm 1 cốc sữa đậu nành không đường để tăng lượng đạm.",
      };
    }

    if (note.includes("bánh xèo") || note.includes("banh xeo")) {
      return {
        mealTypeInferred: "dinner",
        confidenceOverall: 0.91,
        candidates: [
          {
            name: "Bánh xèo vàng giòn nhân tôm thịt",
            standardizedName: "crispy_vietnamese_crepe",
            portionG: 260,
            calories: 520,
            protein: 18.5,
            carbs: 46.0,
            fat: 29.0,
            fiber: 3.5,
            confidence: 0.92,
            preparationMethod: "Chiên chảo dầu nóng",
            ingredients: ["Bột gạo cốt dừa nghệ", "Tôm", "Thịt ba chỉ", "Giá đỗ"],
          },
          {
            name: "Rau cải xà lách và rau thơm cuốn kèm",
            standardizedName: "fresh_wrapping_greens",
            portionG: 80,
            calories: 18,
            protein: 1.2,
            carbs: 2.8,
            fat: 0.2,
            fiber: 2.1,
            confidence: 0.90,
          },
        ],
        observations: "Bánh xèo có lượng chất béo khá cao do vỏ bánh hút dầu chiên giòn.",
        nutritionalInsight: "Hãy cuốn thật nhiều rau xanh và giá sống để bù đắp chất xơ, giảm tốc độ hấp thu đường và mỡ.",
      };
    }

    if (note.includes("xôi") || note.includes("xoi")) {
      return {
        mealTypeInferred: "breakfast",
        confidenceOverall: 0.93,
        candidates: [
          {
            name: "Xôi xéo đậu xanh hành phi mỡ",
            standardizedName: "sticky_rice_mung_bean",
            portionG: 220,
            calories: 490,
            protein: 11.2,
            carbs: 82.5,
            fat: 13.8,
            fiber: 4.2,
            confidence: 0.94,
            preparationMethod: "Đồ nếp và đậu xanh",
            ingredients: ["Gạo nếp", "Đậu xanh", "Hành phi", "Mỡ gà/lợn"],
          },
        ],
        observations: "Xôi nếp có mật độ năng lượng và chỉ số no lâu rất cao.",
        nutritionalInsight: "Xôi cung cấp nguồn carbohydrate dồi dào, phù hợp ăn trước các buổi tập luyện nặng.",
      };
    }

    if (note.includes("trứng vịt lộn") || note.includes("trung vit lon")) {
      return {
        mealTypeInferred: "snack",
        confidenceOverall: 0.95,
        candidates: [
          {
            name: "Trứng vịt lộn luộc",
            standardizedName: "fertilized_duck_egg",
            portionG: 120,
            calories: 240,
            protein: 18.2,
            carbs: 4.1,
            fat: 16.5,
            fiber: 0.0,
            confidence: 0.96,
            preparationMethod: "Luộc chín",
            ingredients: ["Trứng vịt lộn", "Rau răm", "Gừng"],
          },
        ],
        observations: "Món ăn giàu đạm, sắt và các vi chất dinh dưỡng thiết yếu.",
        nutritionalInsight: "Rất tốt cho phục hồi thể lực sau tập luyện, chỉ cần lưu ý hàm lượng cholesterol cao nếu ăn nhiều quả liên tiếp.",
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
      observations: "⚠️ [CHẾ ĐỘ MOCK]: Ứng dụng đang chạy ở chế độ giả lập vì chưa nhận được khóa AI_PROVIDER_API_KEY trên Vercel. Để phân tích ảnh thật từ Google Gemini, hãy thêm biến AI_PROVIDER_API_KEY trong Project Settings của Vercel và bấm Redeploy.",
      nutritionalInsight: "Bữa ăn mẫu giàu protein sạch hỗ trợ duy trì cơ bắp trong khi thâm hụt mỡ.",
    };
  }
}

