# Kế hoạch Thực hiện: AI Nutrition & Weight-Loss Coach (Calories Image)

## Mục tiêu
Xây dựng ứng dụng web Trợ lý Dinh dưỡng & Giảm cân thông minh hỗ trợ người dùng giảm mỡ nhưng bảo toàn khối lượng cơ bắp, ghi nhận bữa ăn qua ảnh bằng AI Vision kết hợp chỉnh sửa thủ công, tính toán dinh dưỡng tất định (deterministic), theo dõi cân nặng và đưa ra lời khuyên huấn luyện cá nhân hóa bằng tiếng Việt.

---

## 1. Phân tích hiện trạng & Kết quả triển khai

### Phase 0 — Khảo sát & Kế hoạch (Inspect & Plan)
- [x] Khảo sát cấu trúc dự án Next.js App Router, Tailwind v4 và TypeScript.
- [x] Xác định các phần cần kế thừa và thiết kế lộ trình thực hiện chi tiết.

### Phase 1 — Nền tảng cấu hình, Môi trường & Thiết kế hệ thống (Foundation)
- [x] Cài đặt các gói phụ thuộc: `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `zod`.
- [x] Xây dựng `lib/env.ts` kiểm tra an toàn biến môi trường.
- [x] Xây dựng các module Supabase client: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`.
- [x] Thiết lập cấu hình PWA (`public/manifest.json`) và viewport mobile-first.
- [x] Cập nhật `.env.example` với đầy đủ tài liệu hướng dẫn.

### Phase 2 — Cơ sở dữ liệu, Seed Data & Xác thực (Database & Auth)
- [x] Hoàn thiện SQL migration `001_initial_schema.sql` với các bảng đầy đủ: `profiles`, `nutrition_goals`, `foods`, `recipes`, `recipe_ingredients`, `meals`, `meal_items`, `weight_entries`, `ai_analysis_logs` cùng Row Level Security (RLS).
- [x] Tạo migration `002_seed_vietnamese_foods.sql` với danh mục hơn 40 món ăn, nguyên liệu Việt Nam phổ biến chuẩn Viện Dinh Dưỡng Quốc Gia.
- [x] Xây dựng tầng Repository (`lib/db/repository.ts`) tích hợp Supabase và fallback LocalStorage thông minh cho chế độ Demo/Offline.
- [x] Tạo modal Đăng nhập / Đăng ký Supabase (`app/components/AuthModal.tsx`).

### Phase 3 — Động cơ Tính toán Dinh dưỡng & Kiểm thử (Nutrition Engine)
- [x] Cài đặt công thức tính toán tất định trong `lib/nutrition.ts`:
  - BMI theo chuẩn châu Á (WPRO).
  - Mifflin-St Jeor BMR cho nam và nữ.
  - TDEE theo 5 hệ số hoạt động.
  - Mức thâm hụt calo an toàn (15% - 25%) kèm mức sàn bảo vệ trao đổi chất.
  - Phân bổ đạm cao (1.8g - 2.2g/kg) để giữ cơ bắp khi thâm hụt calo.
  - Cảnh báo an toàn y khoa đối với phụ nữ mang thai / cho con bú hoặc người dưới 18 tuổi.
- [x] Bộ kiểm thử tự động Vitest toàn diện (`lib/nutrition.test.ts`).

### Phase 4 — Ghi nhận Bữa ăn Thủ công & Nhật ký (Manual Meal Logging & Diary)
- [x] Tích hợp bộ tìm kiếm món ăn Việt Nam (`lib/data/seedFoods.ts`).
- [x] Cho phép người dùng tùy chỉnh khẩu phần gram và tự động tính toán lại năng lượng.
- [x] Giao diện Nhật ký thực phẩm theo ngày (`app/components/DiaryTab.tsx`) phân loại theo nhóm bữa (Sáng, Trưa, Tối, Phụ).
- [x] Giao diện Lịch sử dinh dưỡng (`app/components/HistoryTab.tsx`) hiển thị mức trung bình 7 ngày.

### Phase 5 — Phân tích Ảnh bữa ăn bằng AI (AI Vision Layer)
- [x] Xây dựng kiến trúc trừu tượng `IAiVisionProvider` (`lib/ai/types.ts` & `lib/ai/service.ts`).
- [x] Adapter hỗ trợ **Google Gemini Vision** (`gemini-1.5-flash`), **OpenAI Vision** (`gpt-4o-mini`), và **Mock Provider** chạy ngoại tuyến.
- [x] Endpoint bảo mật phía máy chủ `POST /api/ai/analyze-meal` kiểm tra định dạng và kích thước ảnh.
- [x] Không lưu trữ vĩnh viễn ảnh của người dùng trên ổ đĩa để bảo vệ quyền riêng tư.
- [x] Giao diện Modal ghi nhận bữa ăn (`app/components/MealLoggerModal.tsx`) cho phép chụp ảnh, duyệt và chỉnh sửa định lượng trước khi lưu.
- [x] Bộ kiểm thử tự động cho lớp AI Vision (`lib/ai/ai.test.ts`).

### Phase 6 — Theo dõi Cân nặng & Trợ lý Huấn luyện (Weight Tracking & Coaching)
- [x] Xây dựng màn hình Theo dõi cân nặng (`app/components/WeightTab.tsx`) với biểu đồ xu hướng SVG trực quan và tốc độ thay đổi kg/tuần.
- [x] Xây dựng thuật toán phân tích huấn luyện (`lib/coaching.ts`) đưa ra lời khuyên thực tế bằng món ăn Việt Nam dựa trên dữ liệu nhật ký thực tế.
- [x] Màn hình Hồ sơ & Mục tiêu (`app/components/ProfileTab.tsx`) hiển thị trực quan các chỉ số BMR/TDEE được tính toán thời gian thực.

### Phase 7 — Bảo mật, Xuất dữ liệu & Hoàn thiện (Security, Export & Polish)
- [x] Kiểm tra chính sách RLS trên toàn bộ cơ sở dữ liệu.
- [x] Chức năng Xuất dữ liệu ra định dạng JSON (toàn bộ) và CSV (nhật ký bữa ăn).
- [x] Chức năng Khôi phục dữ liệu từ tệp sao lưu JSON có xác thực cấu trúc.
- [x] Hoàn thiện giao diện thích ứng đa thiết bị (Mobile bottom navigation, Desktop top header).

### Phase 8 — Kiểm thử, Tối ưu & Tài liệu hóa (Verification & Documentation)
- [x] Tất cả các bài kiểm tra tự động chạy thành công: `13 passed (13)` trong `npm run test`.
- [x] Kiểm tra cú pháp mã nguồn đạt yêu cầu: `npm run lint` hoàn thành `0 errors`.
- [x] Bản phân phối sản xuất được tạo thành công: `npm run build` tạo trang tĩnh và dynamic route tối ưu.
- [x] Tài liệu hướng dẫn chi tiết tại `README.md` và `docs/architecture.md`.
