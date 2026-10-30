# Kiến trúc Kỹ thuật: Calories Image

## 1. Mục tiêu kiến trúc

Calories Image được thiết kế theo nguyên tắc:
- **Tách biệt ranh giới tính toán:** Logic tính toán năng lượng (BMR, TDEE, calo, macro, trọng lượng) là **tất định (deterministic)** được viết bằng TypeScript và kiểm thử bằng Unit test, hoàn toàn không phụ thuộc vào suy luận số học của LLM.
- **Trừu tượng hóa AI Provider:** Lớp phân tích ảnh được đóng gói qua giao diện `IAiVisionProvider`. Có thể chuyển đổi qua lại giữa Google Gemini, OpenAI hoặc Mock Provider chỉ bằng biến môi trường mà không cần sửa code giao diện.
- **Tập trung vào an toàn & quyền riêng tư:** Hình ảnh người dùng không lưu trữ vĩnh viễn mặc định. Mọi truy vấn cơ sở dữ liệu trên Supabase được bảo vệ bởi Row Level Security (RLS).
- **Trải nghiệm liên tục (Offline / Demo First):** Khi chưa kết nối khóa API hoặc Supabase, ứng dụng vẫn hoạt động 100% với kho dữ liệu cục bộ và dữ liệu thực phẩm mẫu của Việt Nam.

---

## 2. Sơ đồ phân tầng hệ thống

```
+-------------------------------------------------------------------------+
|                  Client Layer (Next.js 16 App Router)                   |
|                                                                         |
|  - DashboardTab: Thanh tiến độ Calo & Macro, Khuyến nghị Huấn luyện      |
|  - MealLoggerModal: Chụp ảnh AI Vision, Xem xét & Chỉnh sửa định lượng |
|  - DiaryTab: Nhật ký món ăn theo ngày & nhóm bữa                       |
|  - HistoryTab: Trung bình 7 ngày & Bảng tổng kết năng lượng            |
|  - WeightTab: Biểu đồ xu hướng SVG & Tốc độ thay đổi kg/tuần          |
|  - ProfileTab: Form hồ sơ, BMR Mifflin-St Jeor & Cảnh báo an toàn       |
|  - SettingsTab: Sao lưu & Khôi phục (JSON / CSV), Bảo mật              |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                      Server & API Route Layer                           |
|                                                                         |
|  - POST /api/ai/analyze-meal:                                           |
|    + Kiểm tra định dạng (JPEG, PNG, WebP) và dung lượng (< 5MB)         |
|    + Gọi AI Provider độc lập (Gemini 1.5 Flash / GPT-4o-mini / Mock)     |
|    + Kiểm định dữ liệu đầu ra với Zod (MealAnalysisResponseSchema)      |
|    + Ghi audit log vào ai_analysis_logs (không lưu nội dung ảnh nhạy cảm)|
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                    Core Engine & Repository Layer                       |
|                                                                         |
|  - lib/nutrition.ts: BMR, TDEE, Deficit Floor, Macros, Portion Scaling  |
|  - lib/coaching.ts: Lớp khuyến nghị dinh dưỡng dựa trên nhật ký thực tế |
|  - lib/db/repository.ts: Repository Pattern, Supabase Postgres + Local  |
|  - lib/data/seedFoods.ts: 40+ thực phẩm Việt Nam (NIN & USDA chuẩn)     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                    Database & Persistence (Supabase)                    |
|                                                                         |
|  - PostgreSQL với Row Level Security (RLS)                              |
|  - Bảng: profiles, nutrition_goals, foods, meals, meal_items,           |
|          weight_entries, ai_analysis_logs                               |
+-------------------------------------------------------------------------+
```

---

## 3. Quản lý Ảnh và Bảo mật

1. Ảnh tải lên qua `FormData` hoặc chuỗi base64.
2. Endpoint kiểm tra kích thước tối đa (5MB) và kiểu MIME hợp lệ.
3. Ảnh được truyền trong bộ nhớ đệm (RAM) tới Vision API và giải phóng ngay sau khi có kết quả JSON.
4. Cơ sở dữ liệu chỉ lưu lại **Snapshot dinh dưỡng** (`food_name_snapshot`, `portion_g`, `calories`, `protein`, `carbs`, `fat`, `fiber`), không phụ thuộc vào trạng thái sửa đổi của danh mục thực phẩm gốc về sau.

---

## 4. Danh mục Kiểm thử (Testing Matrix)

1. **Kiểm thử Động cơ Dinh dưỡng (`lib/nutrition.test.ts`):**
   - Tính toán BMI và phân loại theo tiêu chuẩn châu Á WPRO.
   - BMR Mifflin-St Jeor cho nam và nữ.
   - TDEE theo các mức độ vận động thể chất.
   - Thâm hụt calo an toàn và chặn mức sàn bảo vệ sức khỏe (Safety floor).
   - Phân bổ đa lượng tối ưu cho mục tiêu bảo toàn cơ bắp (Protein 1.8g - 2.0g/kg).
   - Tỷ lệ co giãn khẩu phần dinh dưỡng (Portion scaling).
   - Tổng hợp năng lượng bữa ăn nhiều món.
   - Xu hướng biến động cân nặng và tốc độ thay đổi hàng tuần.
   - Xác thực schema phản hồi AI và xử lý dữ liệu bất thường.
2. **Kiểm thử Lớp Thị giác AI (`lib/ai/ai.test.ts`):**
   - Khả năng phân tích của Mock Provider đối với bữa ăn tổng hợp.
   - Khả năng nhận diện món nước Việt Nam (Phở bò) khi có gợi ý.
   - Khả năng nhận diện món ăn nhanh (Bánh mì thịt).
   - Kiểm tra định dạng dữ liệu đầu ra tuân thủ Zod schema.
