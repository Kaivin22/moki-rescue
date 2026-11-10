# Đóng gói backend và OSRM

Image là gói chương trình cùng môi trường chạy; container là phiên chạy được tạo từ
image. Compose khởi động hai container, nối chúng qua mạng nội bộ. Supabase vẫn là
dịch vụ bên ngoài. Không build app Android/iOS và không chạy Metro trong Docker.

Backend image được build từ source Java, dùng Java 21; không sao chép `.env`, cache,
database, tài liệu hoặc dữ liệu OSRM vào image. OSRM dùng image 5.27.1 để khớp bộ dữ
liệu đang có. Khi đổi phiên bản OSRM cần kiểm tra/tái xử lý dữ liệu tương ứng, không
đổi tag latest tùy tiện. Dữ liệu `map.osrm*` là sản phẩm xử lý định tuyến, không phải
ảnh nền OSM; giao diện vẫn tải ảnh nền qua mạng như trước.

## Chạy trên máy đã cài Docker Desktop

1. Mở Docker Desktop ở chế độ Linux containers. Kiểm tra nơi lưu disk image trước
   khi build; nơi cài Docker Desktop không nhất thiết là nơi chứa images/cache.
2. Sao chép `.env.docker.example` thành `.env.docker.local`, điền cấu hình thật.
   `OSRM_DATA_DIR` là đường dẫn tuyệt đối tới thư mục đã xử lý MLD, chứa đầy đủ
   `map.osrm.*` (partition, cells, cell_metrics, properties...), dùng dấu `/` trên Windows.
   Không cần tải lại OSM hay chạy extract mỗi lần bật container.
3. Database cần schema hiện tại (V15). Docker không reset, seed hoặc tự migrate
   Supabase. Xem `PARTNER-ENROLLMENT.md` nếu database còn V14.
4. Từ gốc dự án:

```powershell
docker compose --env-file .env.docker.local config --quiet
docker compose --env-file .env.docker.local build backend
docker compose --env-file .env.docker.local up -d
docker compose --env-file .env.docker.local ps
```

Backend mặc định `http://127.0.0.1:8082`, OSRM `http://127.0.0.1:5001` để tránh
trùng backend/OSRM chạy trực tiếp. Backend gọi `http://osrm:5000` bên trong mạng
Compose; địa chỉ này không dùng trong app điện thoại. Health backend dùng
`/api/health/ready`: 200 mới đủ điều kiện schema/database, không chỉ tiến trình sống.

Nếu log có `Network is unreachable` khi kết nối `db.<project>.supabase.co`, kiểm tra
IPv6. Docker Desktop có thể không truy cập được endpoint IPv6 dù Windows chạy được.
Lấy **Session pooler** trong Supabase → Connect, dùng đúng hostname/port/username
do Dashboard cung cấp (username pooler có thể khác direct connection). Chỉ đổi
`.env.docker.local`, không đoán region và không tắt TLS để chữa lỗi mạng. Sau đó
chạy `up -d --force-recreate backend` với cùng `--env-file` và kiểm tra readiness.
Không dùng transaction pooler thay cho session pooler nếu chưa kiểm chứng cấu hình.

Kiểm tra tuyến thực:

```powershell
Invoke-RestMethod 'http://127.0.0.1:5001/route/v1/driving/108.2022,16.0544;108.2201,16.0611?overview=false'
Invoke-RestMethod 'http://127.0.0.1:8082/api/health/ready'
```

Điện thoại: cấu hình `BACKEND_BIND_ADDRESS=0.0.0.0`, chạy lại `up -d`, cho phép cổng
8082 trên mạng riêng nếu cần; cấu hình API app thành `http://<IP-LAN-máy>:8082`,
khởi động lại Expo. Không dùng localhost của điện thoại và không cần mở cổng OSRM
cho điện thoại. Kiểm tra readiness trước khi chuyển app sang backend Docker.

```powershell
docker compose --env-file .env.docker.local logs --tail 80 backend osrm
docker compose --env-file .env.docker.local stop
docker compose --env-file .env.docker.local start
docker compose --env-file .env.docker.local down
docker system df
```

`stop` dừng tiến trình; `down` bỏ container/network của dự án, vẫn giữ images và
thư mục bản đồ nguồn. Không dùng prune toàn máy để dọn riêng dự án. Không cấu hình
tự khởi động container khi mở máy. Logs giới hạn khoảng 30 MB mỗi dịch vụ; build
cache/image vẫn có thể tăng sau các lần build, theo dõi bằng `docker system df`.
OSRM mount chỉ đọc nên gọi route/table không thêm bản đồ mới vào thư mục nguồn.

## Bàn giao

Gửi source/Dockerfile/Compose và cấu hình mẫu; gửi bộ dữ liệu OSRM qua kênh riêng
(giữ thông tin nguồn, thời điểm dữ liệu và ghi công OpenStreetMap). Mật khẩu và khóa
API cấu hình riêng, không đóng vào image hoặc commit. Máy nhận vẫn cần Docker,
dữ liệu OSRM phù hợp, tài nguyên đủ và kết nối Supabase/internet. Image không phải
bản sao dữ liệu Supabase và không giúp ứng dụng tự hoạt động ngoại tuyến.
