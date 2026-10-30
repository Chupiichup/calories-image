# Calories Image — AI Nutrition & Weight-Loss Coach

Calories Image là ứng dụng web trợ lý dinh dưỡng và giảm mỡ thông minh được thiết kế chuyên biệt cho mục tiêu **giảm mỡ thừa nhưng bảo toàn khối lượng cơ bắp**, ghi nhận bữa ăn qua ảnh chụp bằng thị giác máy tính AI (AI Vision), tra cứu cơ sở dữ liệu thực phẩm Việt Nam chuẩn dinh dưỡng, theo dõi cân nặng dài hạn và đưa ra lời khuyên cá nhân hóa bằng tiếng Việt.

---

## 1. Điểm nổi bật & Tính năng cốt lõi

- **Ghi nhận bữa ăn qua ảnh bằng AI Vision:**
  - Hỗ trợ mô hình AI độc lập nhà cung cấp: **Google Gemini Vision** (`gemini-1.5-flash`), **OpenAI Vision** (`gpt-4o-mini`), hoặc **Mock Provider** chạy ngoại tuyến không tốn phí.
  - Phân tích món ăn, định lượng gram, năng lượng (kcal) và các chất đa lượng (protein, carbs, fat, fiber).
  - Phân biệt rõ ràng giữa thành phần nhìn thấy được và phần suy đoán/dầu mỡ tiềm ẩn.
  - **Duyệt & Chỉnh sửa trước khi lưu:** Người dùng luôn có quyền chỉnh sửa tên món, thay đổi trọng lượng, thêm/bớt món trước khi xác nhận. Không bao giờ tự động lưu kết quả AI mà chưa có sự đồng ý của người dùng.
- **Tính toán dinh dưỡng tất định (Deterministic Engine):**
  - Công thức chuyển hóa cơ bản **Mifflin-St Jeor (BMR)** cho nam và nữ.
  - Ước tính tổng tiêu hao năng lượng hàng ngày **(TDEE)** theo 5 mức độ vận động.
  - Mức thâm hụt calo an toàn (15% - 25%), ngăn ngừa suy giảm trao đổi chất và mất cơ.
  - Tỷ lệ đạm tối ưu (1.8g - 2.2g/kg cân nặng) để giữ cơ bắp trong quá trình giảm mỡ.
  - Cảnh báo an toàn y khoa đối với phụ nữ có thai, cho con bú hoặc người dưới 18 tuổi.
- **Cơ sở dữ liệu thực phẩm Việt Nam (Seed Catalogue):**
  - Danh mục tích hợp hơn 40 món ăn, ngũ cốc, nguồn đạm và rau củ phổ biến của Việt Nam (phở, bún tươi, bánh mì, ức gà, cá lóc, đậu phụ, rau muống, canh chua...) đối chiếu theo bảng số liệu của **Viện Dinh Dưỡng Quốc Gia Việt Nam** và **USDA FoodData Central**.
- **Theo dõi tiến trình cân nặng:**
  - Biểu đồ xu hướng SVG trực quan, phân tích trung bình trượt và tốc độ thay đổi kg/tuần thay vì biến động nước trong ngày.
- **Bảo mật & Quyền riêng tư:**
  - Không lưu trữ vĩnh viễn hình ảnh bữa ăn trên máy chủ.
  - Cơ sở dữ liệu **Supabase PostgreSQL** với chính sách **Row Level Security (RLS)** cách ly dữ liệu từng người dùng.
  - Chế độ **Demo/Offline** hoạt động đầy đủ trên trình duyệt ngay cả khi chưa kết nối Supabase.
- **Sao lưu & Phục hồi dữ liệu:**
  - Xuất dữ liệu cá nhân ra định dạng JSON và CSV.
  - Nhập và khôi phục từ tệp sao lưu JSON có kiểm tra tính hợp lệ.

---

## 2. Cài đặt và Chạy thử nghiệm

### Yêu cầu môi trường
- Node.js 20+ (Khuyên dùng Node 22+)
- Trình quản lý gói `npm`

### Các bước cài đặt

1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

2. Tạo tệp cấu hình môi trường từ mẫu:
```bash
cp .env.example .env.local
```

3. Chạy môi trường phát triển (Local Development):
```bash
npm run dev
```
Mở trình duyệt tại <http://localhost:3000>.

---

## 3. Các lệnh kiểm thử & Xây dựng

```bash
# Chạy bộ kiểm thử tự động Vitest (13 tests)
npm run test

# Kiểm tra cú pháp và quy chuẩn mã nguồn ESLint
npm run lint

# Xây dựng bản phân phối sản phẩm (Production Build)
npm run build
```

---

## 4. Hướng dẫn thiết lập Supabase & Áp dụng Migration

Nếu muốn lưu trữ đồng bộ trên đám mây với Supabase:

1. Đăng ký tài khoản tại [supabase.com](https://supabase.com) và tạo một dự án mới (Free Tier).
2. Vào **Project Settings -> API** để lấy `Project URL` và `anon public key`.
3. Điền các giá trị vào tệp `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
4. Áp dụng SQL migrations trong Supabase SQL Editor theo thứ tự:
   - `supabase/migrations/001_initial_schema.sql`: Khởi tạo bảng dữ liệu và thiết lập chính sách Row Level Security (RLS).
   - `supabase/migrations/002_seed_vietnamese_foods.sql`: Nạp danh mục thực phẩm mẫu của Việt Nam.

> **Ghi chú Chế độ Demo:** Nếu bạn chưa cấu hình Supabase, ứng dụng sẽ tự động chuyển sang chế độ Demo ngoại tuyến với đầy đủ tính năng tính calo, ghi nhận bữa ăn, mô phỏng AI và lưu trữ cục bộ.

---

## 5. Hướng dẫn cấu hình AI Provider (Thị giác máy tính)

Ứng dụng hỗ trợ cấu hình qua các biến môi trường:

### Tùy chọn A: Google Gemini Vision (Khuyên dùng - Chi phí cực thấp/Có gói miễn phí)
```env
AI_PROVIDER=gemini
AI_PROVIDER_MODEL=gemini-1.5-flash
AI_PROVIDER_API_KEY=AIzaSy...your-gemini-api-key
AI_PROVIDER_TIMEOUT_MS=30000
```
- Lấy API key miễn phí tại [Google AI Studio](https://aistudio.google.com/).

### Tùy chọn B: OpenAI Vision
```env
AI_PROVIDER=openai
AI_PROVIDER_MODEL=gpt-4o-mini
AI_PROVIDER_API_KEY=sk-...your-openai-api-key
AI_PROVIDER_TIMEOUT_MS=30000
```

### Tùy chọn C: Chế độ Giả lập (Mock Provider - Không cần API key)
```env
AI_PROVIDER=mock
```
- Tự động kích hoạt khi `AI_PROVIDER_API_KEY` để trống. Cho phép thử nghiệm nhận diện món ăn Việt Nam hoàn chỉnh mà không tốn chi phí API.

---

## 6. Tổng quan về Chi phí & Quyền riêng tư (Cost & Privacy)

- **Chi phí vận hành:** 
  - Supabase Free Tier cung cấp 500MB cơ sở dữ liệu PostgreSQL và 50.000 người dùng hàng tháng.
  - Gemini 1.5 Flash cung cấp hạn mức miễn phí hàng ngày (15 RPM / 1.500 RPD), hoàn toàn đáp ứng nhu cầu cá nhân.
- **Quyền riêng tư hình ảnh:**
  - Ảnh tải lên được xử lý trực tiếp trong RAM bộ nhớ đệm máy chủ và gửi đến Vision API qua kết nối HTTPS an toàn.
  - Hình ảnh gốc **không được lưu vào ổ đĩa hay bộ lưu trữ đám mây** nhằm bảo vệ quyền riêng tư người dùng.
  - Không truyền thông tin danh tính cá nhân sang các API AI bên thứ ba.

---

## 7. Giới hạn đã biết (Known Limitations)

- Ứng dụng đưa ra các chỉ số calo và đạm mang tính định hướng khoa học thể thao, **không thay thế chẩn đoán hoặc chỉ định dinh dưỡng y khoa**.
- AI Vision ước lượng trọng lượng dựa trên kích thước đĩa tương đối, độ chính xác có thể thay đổi tùy thuộc vào góc chụp, ánh sáng và lượng dầu mỡ ngấm sâu trong thực phẩm chiên rán. Người dùng luôn được khuyến khích kiểm tra và điều chỉnh định lượng gram trước khi xác nhận.
