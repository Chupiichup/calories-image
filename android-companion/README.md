# Calories Image - Android Companion App

Ứng dụng Android Companion độc lập giúp kết nối và đồng bộ chỉ số vận động thể chất từ **Samsung Health** thông qua **Android Health Connect SDK** lên hệ thống web **Calories Image**.

---

## 1. Kiến trúc luồng dữ liệu (Data Pipeline)

```
[Điện thoại Samsung]
       │
       ▼
 Samsung Health (Đo đếm bước chân & calo vận động)
       │ (Tự động đồng bộ nội bộ hệ điều hành)
       ▼
 Android Health Connect (Google Health Platform)
       │ (Cấp quyền: READ_STEPS, READ_ACTIVE_CALORIES_BURNED)
       ▼
 Calories Image Companion (Ứng dụng Android Kotlin / Jetpack Compose)
       │ (Tổng hợp midnight-to-midnight theo múi giờ thiết bị)
       ▼
 POST /api/activity/sync (Vercel Serverless API)
       │ (Xác thực JWT + Upsert)
       ▼
 Supabase PostgreSQL (Bảng public.daily_activities)
       │ (RLS bảo vệ theo user_id)
       ▼
 Calories Image Web App (Thẻ Daily Activity trên Dashboard & Nhật ký)
```

---

## 2. Công nghệ sử dụng

- **Ngôn ngữ**: Kotlin (JVM 17)
- **Giao diện**: Jetpack Compose & Material 3
- **Health Platform**: `androidx.health.connect:connect-client:1.1.0-alpha11`
- **Mạng**: OkHttp 4 & Gson
- **Kiến trúc**: Coroutines & Lifecycle-aware State

---

## 3. Cách cài đặt và chạy ứng dụng

### Yêu cầu tiên quyết:
- Điện thoại Android chạy **Android 14+** (Health Connect tích hợp sẵn trong hệ điều hành) hoặc **Android 9-13** (đã cài đặt Health Connect từ Google Play Store).
- Ứng dụng **Samsung Health** đã cài đặt trên máy.
- Mở Samsung Health &rarr; *Cài đặt* &rarr; *Health Connect* &rarr; Bật cho phép Samsung Health ghi dữ liệu vào Health Connect.

### Build ứng dụng bằng Android Studio:
1. Mở Android Studio, chọn **Open Project** và trỏ đến thư mục `android-companion/`.
2. Chờ Gradle sync hoàn tất.
3. Kết nối điện thoại Samsung qua cáp USB (bật Chế độ nhà phát triển & USB Debugging) hoặc qua Wi-Fi Pairing.
4. Bấm **Run 'app'** (`Shift + F10`) để cài đặt lên thiết bị.

---

## 4. Cấu hình kết nối máy chủ

1. Mở ứng dụng **Calories Image Companion** trên điện thoại.
2. Bấm vào biểu tượng **Bánh răng (Cài đặt)** ở góc trên bên phải.
3. Điền:
   - **Địa chỉ Vercel Web App**: URL ứng dụng của bạn (mặc định `https://calories-image.vercel.app` hoặc URL Vercel của bạn).
   - **Supabase Auth Token**: Access token người dùng (nếu có yêu cầu xác thực tài khoản).
4. Bấm **Lưu**.
5. Bấm **"Cấp quyền Health Connect"** để cấp quyền đọc số bước chân và calo hoạt động.
6. Bấm **"Đồng bộ lên Web ngay"** để dữ liệu được chuyển tức thì lên giao diện web.

