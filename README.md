# 🗺️ DaNang Itinerary — Ứng dụng lập lịch trình du lịch thông minh

Ứng dụng Flutter cho phép người dùng khám phá, lên lịch trình và chia sẻ hành trình du lịch tại **Đà Nẵng** và **Hội An**.

## ✨ Tính năng

| Module | Mô tả |
|--------|-------|
| 🔐 Auth | Email/Password + Google OAuth, profile setup |
| 🏖 Explore | Danh sách địa điểm, bộ lọc, tìm kiếm |
| 📅 Itinerary | Tạo / sắp xếp / chia sẻ lịch trình |
| 🗺 Map | MapLibre offline, marker clustering |
| 🤖 AI Chat | AI Travel Assistant (rule-based) |
| 🌤 Weather | Dự báo thời tiết theo ngày |
| 💰 Budget | Tính ngân sách chuyến đi |
| 👥 Community | Feed + vote + follow |
| ⭐ Reviews | Đánh giá địa điểm + ảnh |
| 🔔 Notifications | Realtime + lịch sử |
| 🎫 VIP | Gói VIP + thanh toán giả lập |
| 🎧 Support | Ticket hỗ trợ + FAQ |
| 👤 Profile | Chỉnh sửa + travel preferences |
| 🔧 Admin | Dashboard, Users, Places, Tickets, Analytics |
| ✏️ Editor | Browse + edit + add places |

## 🏗️ Architecture

```
lib/
├── core/           # Theme tokens, router, Supabase, utils
├── features/       # Mỗi tính năng: data / domain / presentation
└── shared/         # Widgets dùng chung (atoms/molecules/organisms)
```

- **State management**: Riverpod 2.x (FutureProvider, StateNotifier)
- **Navigation**: GoRouter 15.x + role guards
- **Backend**: Supabase (Auth, Database, RLS, Realtime)
- **Architecture**: MVVM clean layers

## 🚀 Cài đặt

### Requirements
- Flutter 3.32.x
- Dart 3.x
- Supabase project

### Setup

```bash
# Clone repo
git clone https://github.com/Kaivin22/danang-itinerary.git
cd danang-itinerary

# Cài dependencies
flutter pub get

# Tạo file .env từ template
cp .env.example .env
# Điền SUPABASE_URL và SUPABASE_ANON_KEY vào .env

# Chạy app
flutter run
```

## 🧪 Tests

```bash
# Unit tests + widget tests
flutter test test/

# Chỉ unit tests
flutter test test/core/ test/features/

# Chỉ widget tests
flutter test test/widgets/
```

**Test coverage**: 43 tests — RouteOptimizer (9) · PlaceRecommender (8) · RateLimiter (8) · Widgets (16) · Smoke (2)

## 🔄 CI/CD

GitHub Actions tự động chạy khi push lên `main` hoặc `develop`:

1. **🔍 Analyze** — `flutter analyze --fatal-infos` + `dart format`
2. **🧪 Test** — unit + widget tests
3. **🏗️ Build APK** — signed release APK (chỉ trên `main`)

### Secrets cần thiết

| Secret | Mô tả |
|--------|-------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anonymous API key |
| `KEYSTORE_BASE64` | Keystore file (base64) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias |
| `KEY_PASSWORD` | Key password |

## 🔐 Supabase Secrets Setup

Không commit file `.env`. Dùng GitHub Secrets cho CI/CD.

Để set role cho Admin:
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'
WHERE email = 'admin@example.com';
```

## 📱 Build APK thủ công

```bash
flutter build apk --release --split-per-abi
# Output: build/app/outputs/flutter-apk/
```

---

Made with ❤️ by Kaivin22 · Flutter + Supabase
