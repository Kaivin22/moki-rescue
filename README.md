# 🗺️ DaNang Itinerary — Ứng dụng lập lịch trình du lịch thông minh

Ứng dụng **React Native (Expo)** giúp khách du lịch khám phá, lên kế hoạch và chia sẻ hành trình tại **Đà Nẵng** và vùng lân cận.

---

## ✨ Tính năng

| Module | Mô tả |
|--------|-------|
| 🔐 Auth | Email/Password đăng ký & đăng nhập qua Supabase |
| 🏖 Khám phá | Danh sách địa điểm, bộ lọc, tìm kiếm, xem chi tiết |
| 📅 Lập lịch | Chọn địa điểm → sắp xếp thứ tự → lưu & xem lịch trình |
| ⚡ VIP Optimizer | Tối ưu lộ trình thông minh theo **thời tiết thực tế** & khoảng cách |
| 🗺 Bản đồ | Google Maps, marker địa điểm, tuyến đường |
| 🤖 AI Chat | Trợ lý du lịch AI (Google Gemini API) |
| 🌤 Thời tiết | Dự báo thời tiết từ Open-Meteo (miễn phí, không cần key) |
| ⭐ Review | Đánh giá địa điểm, gắn ảnh |
| 🔖 Lưu địa điểm | Bookmark các địa điểm yêu thích |
| 🎫 VIP | Gói VIP nâng cao (tối ưu lộ trình thông minh) |
| 🎧 Hỗ trợ | Gửi ticket hỗ trợ |
| 👤 Hồ sơ | Chỉnh sửa thông tin, đổi ngôn ngữ (6 ngôn ngữ) |
| 🌐 Đa ngôn ngữ | Tiếng Việt · English · 中文 · 한국어 · 日本語 · Français |
| 🔧 Admin | Dashboard 4 section: Người dùng, Nội dung, Hỗ trợ, Vận hành |
| ✏️ Editor | Thêm & cập nhật dữ liệu địa điểm |

---

## 🔑 Phân quyền người dùng

| Role | Quyền |
|------|-------|
| `anonymous` | Xem địa điểm, lịch trình công khai |
| `user` | Tạo lịch trình, AI Chat, viết review |
| `editor` | Nhập / cập nhật dữ liệu địa điểm |
| `admin` | Toàn quyền — quản lý người dùng, nội dung, hỗ trợ, vận hành |

---

## 🏗️ Architecture

```
danang_itinerary/
├── app/                  # Expo Router (file-based routing)
│   ├── (auth)/           # Login, Register
│   ├── (tabs)/           # Tab bar: Home, Map, Create, Profile
│   ├── admin/            # Admin Dashboard
│   ├── itinerary/        # Chi tiết & Share lịch trình
│   ├── place/            # Chi tiết địa điểm
│   ├── profile/          # Edit, Saved, History
│   ├── vip/              # Upgrade VIP
│   └── support/          # Support tickets
├── src/
│   ├── components/       # atoms / molecules / organisms
│   ├── constants/        # Colors, spacing, scenes, i18n
│   ├── features/         # Business logic (routeOptimizer, AI)
│   ├── hooks/            # React Query hooks
│   ├── i18n/             # Đa ngôn ngữ (6 ngôn ngữ)
│   ├── services/         # Supabase, weatherService
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript interfaces
├── assets/               # Ảnh nền panorama, icons, fonts
└── scripts/              # SQL schema & seed data
```

- **Framework**: Expo SDK 54 · React Native 0.81
- **Navigation**: Expo Router (file-based, tab + stack)
- **State**: Zustand + React Query (@tanstack/react-query)
- **Backend**: Supabase (Auth · PostgreSQL · RLS · Realtime)
- **AI**: Google Gemini API
- **Weather**: Open-Meteo (free, no key needed)
- **Language**: TypeScript strict

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- Node.js 20+
- npm 10+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project (free tier đủ dùng)

### Setup

```bash
# Clone repo
git clone https://github.com/Kaivin22/danang-itinerary.git
cd danang-itinerary

# Cài dependencies
npm install

# Tạo .env từ template
cp .env.example .env
# → Điền SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY vào .env

# Tạo bảng & dữ liệu mẫu trong Supabase SQL Editor
# Chạy lần lượt:
#   scripts/01_schema_setup.sql
#   scripts/02_seed_data.sql

# Chạy app
npm start
```

### Chạy theo nền tảng
```bash
npm run ios       # iOS Simulator
npm run android   # Android Emulator
npm run web       # Trình duyệt
```

---

## 🧪 Tests

```bash
# Kiểm tra TypeScript
npx tsc --noEmit

# Chạy unit tests
npm test
```

**Test coverage**: RouteOptimizer · PlaceRecommender · Auth logic

---

## 🔄 CI/CD

GitHub Actions tự động khi push lên `main` hoặc `develop`:

1. **🔍 TypeScript Check** — `tsc --noEmit`
2. **🧪 Test** — Jest unit tests
3. **🏗️ EAS Build** — Android APK (chỉ trên `main`, cần `EXPO_TOKEN`)

### GitHub Secrets cần thiết

| Secret | Mô tả |
|--------|-------|
| `SUPABASE_URL` | Project URL từ Supabase dashboard |
| `SUPABASE_ANON_KEY` | Anonymous API key |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `EXPO_TOKEN` | Token từ expo.dev (cho EAS Build) |
| `KEYSTORE_BASE64` | File keystore Android (base64) |
| `KEYSTORE_PASSWORD` | Mật khẩu keystore |
| `KEY_ALIAS` | Key alias |
| `KEY_PASSWORD` | Key password |

---

## 🔐 Cấp quyền Admin

1. Đăng ký tài khoản bình thường qua App
2. Vào **Supabase → SQL Editor**, chạy:

```sql
UPDATE public.profiles
SET role = 'admin', vip_status = 'vip'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

---

## 🎨 Bảng màu

| Token | Hex | Dùng cho |
|-------|-----|----------|
| Background | `#F7FBFD` | Nền toàn app |
| Primary / Text | `#282E30` | Tiêu đề, thanh điều hướng |
| Accent / CTA | `#92C5FD` | Nút chính, highlight |
| Highlight / VIP | `#DDF186` | Badge VIP, accent phụ |

---

Made with ❤️ · Expo + React Native + Supabase · Đà Nẵng 🌊
