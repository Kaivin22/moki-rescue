# Thuật toán ưu tiên và điều phối cứu hộ

Ngày đối chiếu mã nguồn: 08/10/2026. Mốc mã nguồn: `fdd5440`.

Tài liệu này giải thích hệ thống đang chọn cứu hộ viên như thế nào, công thức tính, ý nghĩa của từng tham số và nhận xét về việc cho khách hàng chọn tiêu chí ưu tiên. Đây là bản mô tả dựa trên code, không phải yêu cầu tự động thay đổi PRD/SRS hoặc triển khai thêm chức năng.

**Phân biệt trạng thái:** Phần 1–11 mô tả code và cấu hình mặc định trong repository; phần 12–14 nêu nhận xét, giới hạn và đề xuất. Không dùng các giá trị mặc định để khẳng định database Supabase hiện đang có đúng những giá trị đó. Lần viết tài liệu này không đọc hoặc sửa dữ liệu Supabase, không chạy OSRM thật.

## 1. Kết luận ngắn gọn

Hệ thống không chỉ chọn “người gần nhất” hoặc “người nhiều kinh nghiệm nhất”. Trình tự hiện tại là:

```text
Khách chọn dịch vụ và xác nhận vị trí
  → Lọc cứu hộ viên đủ điều kiện
  → OSRM tính thời gian/độ dài đường đi từ cửa hàng đến khách
  → Giữ những người có ETA trong khoảng cho phép
  → Xét ưu tiên chống bỏ đói
  → Xếp theo điểm chi phí từ thấp đến cao
  → Gửi đề nghị cho một người
  → Chấp nhận: giao ca; từ chối/hết hạn: tính lại lượt kế tiếp
```

Có ba tầng quyết định cần tách biệt:

1. **Điều kiện bắt buộc:** không đạt thì không tham gia xếp hạng.
2. **Chống bỏ đói:** người đã nhiều lượt đủ điều kiện nhưng chưa được gửi đề nghị có thứ tự ưu tiên riêng.
3. **Điểm chi phí có trọng số:** cân bằng ETA, số ca cùng dịch vụ đã hoàn thành, thời gian chờ được đề nghị và số ca đã nhận gần đây.

Vì vậy, câu “ai có điểm thấp nhất thì luôn được giao ca” là chưa đúng: điểm chỉ được so sau các tầng điều kiện và chống bỏ đói; người được gửi đề nghị còn phải bấm chấp nhận.

## 2. Hệ thống đang ưu tiên cá nhân hay cửa hàng?

Đối tượng được xếp hạng và nhận đề nghị là **tài khoản cứu hộ viên**, không phải bản thân cửa hàng.

- Tọa độ xuất phát lấy từ cửa hàng/đội mà cứu hộ viên thuộc về: `rescue_teams.base_latitude`, `base_longitude`.
- Số ca đã hoàn thành, số ca đã nhận gần đây, thời gian chờ và số lượt bị bỏ qua là dữ liệu của từng cứu hộ viên.
- Những người cùng cửa hàng có thể có ETA giống nhau nhưng khác thứ tự ưu tiên vì các chỉ số cá nhân khác nhau.
- Có 12 cửa hàng mẫu không đồng nghĩa có 12 tài khoản cứu hộ viên.
- Hiện không có tầng chia đều ca giữa các cửa hàng trước khi chọn người. Quy tắc công bằng đang áp dụng ở cấp cứu hộ viên, theo từng loại dịch vụ.

Vị trí GPS hiện tại trên điện thoại cứu hộ viên không được dùng làm nguồn điều phối trong phương án cửa hàng cố định. Bật sẵn sàng thể hiện họ sẵn sàng phục vụ theo điểm xuất phát đã đăng ký; nếu thực tế họ đang ở nơi khác, ETA từ cửa hàng có thể không phản ánh thời gian họ thực sự đến.

## 3. Thuật ngữ

| Thuật ngữ         | Viết đầy đủ / ý nghĩa trong tài liệu                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| OSM               | OpenStreetMap: nguồn dữ liệu địa lý/bản đồ, không phải thuật toán chọn cứu hộ viên.                                                |
| OSRM              | Open Source Routing Machine: dịch vụ tính tuyến đường và thời gian di chuyển trên dữ liệu đường đã chuẩn bị.                       |
| ETA               | Estimated Time of Arrival: thời gian đến dự kiến. Trong công thức hiện tại là số giây di chuyển OSRM trả về từ cửa hàng đến khách. |
| GPS               | Global Positioning System: hệ thống định vị; độ chính xác đo GPS không phải thuộc tính bắt buộc của một tọa độ cửa hàng cố định.   |
| API               | Application Programming Interface: giao diện để app gọi backend hoặc backend gọi dịch vụ tuyến đường.                              |
| UUID              | Universally Unique Identifier: mã định danh được dùng làm tiêu chí cuối khi tất cả tiêu chí xếp hạng trước đó bằng nhau.           |
| Đề nghị / offer   | Lời mời nhận một ca, chưa đồng nghĩa đã giao ca.                                                                                   |
| Lượt điều phối    | Một lần hệ thống chọn và ghi thành công đề nghị cho một ứng viên. Không nhất thiết tương ứng một yêu cầu khách hàng khác nhau.     |
| Điểm chi phí      | Điểm tổng hợp dùng để xếp hạng; **càng thấp càng ưu tiên**. Không phải giá tiền hay điểm đánh giá chất lượng.                      |
| Ngưỡng tham chiếu | Mốc để chuẩn hóa một chỉ số về khoảng 0–1; không phải điều kiện tối thiểu để được nhận ca.                                         |

## 4. Điều kiện bắt buộc trước khi chấm điểm

### 4.1. Yêu cầu của khách

Backend kiểm tra vai trò khách hàng, dịch vụ còn hoạt động, vị trí nhận cứu hộ nằm trong vùng phục vụ và thông tin điểm giao xe khi dịch vụ yêu cầu. Luồng tạo yêu cầu còn có kiểm tra an toàn, độ chính xác vị trí GPS khách nếu sử dụng GPS, và chống tạo trùng yêu cầu.

Những điều kiện này thuộc bước tiếp nhận yêu cầu, không phải các trọng số trong công thức ưu tiên.

### 4.2. Cứu hộ viên

Một ứng viên phải thỏa các điều kiện trong `eligibleCandidates(...)`:

- Hồ sơ có vai trò `provider` và tài khoản còn hoạt động.
- Thành viên đội có trạng thái `active` và đang bật `is_available`.
- Đội/cửa hàng có trạng thái `verified`.
- Đội có năng lực dịch vụ đúng với `service_code` mà khách đang yêu cầu, và năng lực đó đang hoạt động.
- Tọa độ cửa hàng và vị trí khách nằm trong vùng phục vụ.
- Vị trí khách nằm trong bán kính phục vụ `service_radius_km` của cửa hàng.
- Người đó không đang được giao ca chưa kết thúc.
- Người đó chưa từ chối hoặc để hết hạn đề nghị của chính yêu cầu này.
- Người đó không đang giữ đề nghị còn hiệu lực của một yêu cầu khác.

**Phân biệt khoảng cách:** bán kính phục vụ được kiểm tra bằng PostGIS `ST_DWithin` trên tọa độ địa lý, không phải bằng quãng đường OSRM. Sau bước lọc bán kính mới tính đường đi thực tế.

Không có điều kiện “phải hoàn thành ít nhất 50 ca”. Người mới có 0 ca vẫn được xếp hạng nếu đáp ứng các điều kiện trên.

## 5. OSRM cung cấp gì cho thuật toán?

Backend gọi `RoadRoutingService.routesToDestination(...)`:

- Nguồn: danh sách tọa độ cửa hàng của các ứng viên.
- Đích: tọa độ khách đã xác nhận.
- Yêu cầu OSRM Table: `/table/v1/{profile}/{coordinates}`, lấy `duration,distance`.
- Tọa độ gửi OSRM có thứ tự **kinh độ,vĩ độ**.
- Các nguồn được chia thành các nhóm theo cấu hình `tableBatchSize`.
- Kết quả được ghép theo đúng thứ tự nguồn đầu vào: thời gian giây và khoảng cách mét.
- Dữ liệu thời gian/khoảng cách được làm tròn về số nguyên trong `RoadRoute`.

OSRM không biết số ca hoàn thành, thời gian chờ hay ai bị bỏ đói. **OSRM chỉ cung cấp dữ liệu tuyến đường; backend tự xếp hạng.**

Ứng viên không có kết quả tuyến đường sẽ không được chấm điểm trong lượt đó. Nếu không còn ứng viên có tuyến đường, yêu cầu chuyển thành `no_provider` với `routing_status = unavailable`. Trạng thái này chưa phân biệt chi tiết mọi nguyên nhân như máy chủ OSRM không truy cập được, chưa cấu hình hay không tìm được đường.

Code không tự thay ETA đường bộ bằng khoảng cách đường thẳng khi OSRM thất bại. ETA đang dùng cũng không bao gồm thời gian chờ bấm nhận ca, chuẩn bị đồ nghề hoặc thời gian sửa xe; không được coi là cam kết giờ đến thực tế hay ETA giao thông trực tiếp như Google Maps.

Google Maps phục vụ mở dẫn đường bên ngoài; thời gian nó tính không phải đầu vào của công thức ưu tiên hiện tại.

## 6. Các biến và công thức chấm điểm

### 6.1. Ký hiệu

Với cứu hộ viên `i`, trong loại dịch vụ khách yêu cầu:

| Ký hiệu   | Ý nghĩa                                                                          | Nguồn trong code           |
| --------- | -------------------------------------------------------------------------------- | -------------------------- |
| `T_i`     | ETA từ cửa hàng đến khách, giây                                                  | `route.durationSeconds()`  |
| `T_min`   | ETA nhỏ nhất trong tập ứng viên đủ điều kiện và có tuyến đường của lượt hiện tại | `rankCandidates(...)`      |
| `Δ`       | Mức chênh ETA tối đa được chấp nhận so với người nhanh nhất                      | `etaWindowSeconds`         |
| `C_i`     | Số ca cùng dịch vụ mà cá nhân đó đã hoàn thành                                   | `completedServiceCount`    |
| `C_ref`   | Mốc chuẩn hóa số ca đã hoàn thành                                                | `experienceReferenceCases` |
| `W_i`     | Số giây cứu hộ viên đang chờ được gửi đề nghị                                    | `waitingSeconds`           |
| `W_ref`   | Mốc chuẩn hóa thời gian chờ                                                      | `waitingReferenceSeconds`  |
| `R_i`     | Số đề nghị cùng dịch vụ đã chấp nhận trong cửa sổ ngày gần đây                   | `recentAcceptedCount`      |
| `R_ref`   | Mốc chuẩn hóa số ca đã nhận gần đây                                              | `recentReferenceCases`     |
| `K_i`     | Bộ đếm lượt đủ điều kiện trong nhóm ETA nhưng bị bỏ qua                          | `consecutiveSkips`         |
| `K_limit` | Ngưỡng kích hoạt ưu tiên chống bỏ đói                                            | `starvationSkipThreshold`  |

Tên `experience...` trong code là tên kỹ thuật hiện có. Khi trình bày nghiệp vụ nên gọi đúng là **“số ca cùng loại dịch vụ đã hoàn thành trên hệ thống”**, không đồng nhất với số năm kinh nghiệm, chứng chỉ, tay nghề hay mọi ca đã làm ngoài hệ thống.

### 6.2. Lọc nhóm ETA trước

Chỉ giữ ứng viên thỏa:

```text
T_i ≤ T_min + Δ
```

Với mặc định `Δ = 300 giây`: nếu người nhanh nhất mất 5 phút thì chỉ xét người có ETA tối đa 10 phút. Người mất 11 phút không được đưa vào nhóm, dù có nhiều ca hoàn thành hoặc nhiều lượt bị bỏ qua.

Đây là giới hạn **chênh lệch so với người nhanh nhất**, không phải giới hạn ETA tuyệt đối 5 phút hoặc 10 phút. Khi tính lại lượt sau, `T_min` được tính lại theo tập ứng viên mới.

### 6.3. Chuẩn hóa các thành phần

Định nghĩa hàm:

```text
u(x, b) = min(max(x, 0) / b, 1)
```

Bốn thành phần chi phí:

```text
E_i = u(T_i - T_min, Δ)
C_cost_i = 1 - u(C_i, C_ref)
W_cost_i = 1 - u(W_i, W_ref)
R_cost_i = u(R_i, R_ref)
```

Diễn giải:

- `E_i` nhỏ khi ETA gần với người nhanh nhất.
- `C_cost_i` nhỏ khi đã hoàn thành nhiều ca cùng dịch vụ.
- `W_cost_i` nhỏ khi đang chờ được gửi đề nghị lâu.
- `R_cost_i` lớn khi gần đây đã nhận nhiều ca.

Mỗi thành phần thuộc khoảng 0–1. Việc chuẩn hóa tránh đem số giây, số ca và các thang đo khác nhau cộng trực tiếp với nhau.

Khi vượt ngưỡng tham chiếu, thành phần tương ứng không thay đổi thêm: 50 và 500 ca có cùng `C_cost = 0` với `C_ref = 50`. Tuy nhiên số ca gốc vẫn có thể được dùng ở bước phá hòa cuối, nên không được nói vượt 50 ca là hoàn toàn không còn ảnh hưởng ở mọi trường hợp.

### 6.4. Điểm tổng hợp

```text
Score_i = w_eta × E_i
        + w_completed × C_cost_i
        + w_waiting × W_cost_i
        + w_recent × R_cost_i
```

Sau chuẩn hóa trọng số:

```text
w_eta + w_completed + w_waiting + w_recent = 1
```

**Điểm thấp hơn được ưu tiên hơn trong cùng tầng chống bỏ đói.**

Với các tham số mặc định:

```text
Score_i =
    0,55 × min(max(T_i - T_min, 0) / 300, 1)
  + 0,15 × [1 - min(max(C_i, 0) / 50, 1)]
  + 0,15 × [1 - min(max(W_i, 0) / 7200, 1)]
  + 0,15 × min(max(R_i, 0) / 10, 1)

R_i được đếm trong 7 ngày gần nhất.
```

Các dấu phẩy trong biểu thức trên là dấu thập phân tiếng Việt. Trong code/database, các trọng số được viết là `0.55`, `0.15`.

### 6.5. Vì sao phải nhân trọng số?

Trọng số thể hiện mức ảnh hưởng tương đối của từng thành phần đã chuẩn hóa. Ví dụ, chênh toàn bộ thang ETA đóng góp tối đa 0,55 vào điểm, trong khi chênh toàn bộ thang số ca đã hoàn thành đóng góp tối đa 0,15.

Điều này **không có nghĩa người gần nhất có 55% xác suất được chọn**, cũng không có nghĩa ETA luôn thắng mọi tiêu chí. Các thành phần khác cộng lại, cùng tầng chống bỏ đói, vẫn có thể thay đổi thứ tự.

Backend giới hạn từng trọng số đầu vào về 0–1 rồi chia cho tổng để chuẩn hóa. Database không cho trọng số âm, lớn hơn 1 hoặc tổng bằng 0. Nhánh phòng vệ của Java đặt trọng số ETA bằng 1 nếu tổng bằng 0; đây không phải cấu hình thông thường hợp lệ trong database.

### 6.6. Vì sao cộng số ca gần đây, không trừ?

Vì đang tính **chi phí**, không phải điểm thưởng.

- Nhận nhiều ca gần đây → `R_cost` tăng → điểm tăng → thứ tự giảm.
- Hoàn thành nhiều ca → dùng `1 - u(C_i, C_ref)` → điểm giảm → thứ tự tăng.
- Chờ lâu → dùng `1 - u(W_i, W_ref)` → điểm giảm → thứ tự tăng.

Nếu trừ `R_cost` trong công thức này, người vừa nhận nhiều ca lại được lợi hơn, ngược mục tiêu phân phối cơ hội.

## 7. Dữ liệu đếm chính xác như thế nào?

### 7.1. Số ca hoàn thành: C_i

Đếm từ `rescue_requests` với đồng thời ba điều kiện:

- `assigned_provider_id` là cá nhân đang xét.
- `service_code` trùng dịch vụ đang yêu cầu.
- `status = completed`.

Đây là tổng trong lịch sử hiện còn lưu, không chỉ 7 ngày và không phải tổng ca của đội. Ví dụ, các ca vận chuyển xe không được tự cộng vào số ca vá lốp.

### 7.2. Số ca đã nhận gần đây: R_i

Đếm từ `dispatch_offers` có:

- `provider_id` là cá nhân đang xét.
- `status = accepted`.
- Yêu cầu liên quan có cùng `service_code`.
- `responded_at` trong `recentWindowDays` ngày gần nhất.

Không đếm đề nghị chỉ được gửi mà chưa nhận, đã từ chối hoặc đã hết hạn. Không yêu cầu ca đã hoàn thành. Nếu ca sau đó bị hủy nhưng đề nghị vẫn có trạng thái `accepted`, nó vẫn được tính trong cửa sổ này.

Mục tiêu là đo cơ hội đã được nhận gần đây, không đo chất lượng xử lý.

### 7.3. Thời gian chờ: W_i

Công thức tương ứng với truy vấn hiện tại:

```text
mốc_đề_nghị = last_offered_at của đúng dịch vụ, nếu chưa có thì dùng ngày tạo thành viên
mốc_sẵn_sàng = available_since, nếu thiếu thì dùng ngày tạo thành viên

W_i = max(0, thời_điểm_hiện_tại - max(mốc_đề_nghị, mốc_sẵn_sàng))
```

Đơn vị dùng khi chấm điểm là giây.

Ví dụ: bật sẵn sàng lúc 08:00, được gửi đề nghị gần nhất lúc 09:00, đang xét lúc 09:30 thì thời gian chờ là 30 phút, không phải 90 phút.

- Đây là **thời gian cứu hộ viên chờ cơ hội**, không phải khách chờ cứu hộ đến.
- Mốc đề nghị thay đổi ngay khi hệ thống ghi đề nghị, không đợi họ nhận hay hoàn thành ca.
- Tắt rồi bật lại sẵn sàng làm bắt đầu lại phần thời gian chờ từ lần bật mới.
- Gửi lại thao tác bật khi đã sẵn sàng không tự đặt lại mốc đó.
- Mốc 7.200 giây nghĩa là từ 2 giờ trở lên thành phần chờ đã đạt ưu đãi tối đa, không phải phải đợi 2 giờ mới được nhận ca.

## 8. Quy tắc chống bỏ đói

### 8.1. Khi nào tăng bộ đếm?

Trong `writeOffer(...)`, sau khi các kiểm tra cuối hợp lệ và cùng giao dịch ghi đề nghị:

- Người được gửi đề nghị: đặt `consecutive_skips = 0`, cập nhật `last_offered_at = NOW()`.
- Các ứng viên còn lại **trong danh sách đã lọc nhóm ETA**: tăng bộ đếm lên 1, tối đa 1.000.000.
- Người bị loại vì ngoài nhóm ETA, không có tuyến đường, đang bận hoặc không đủ điều kiện: không được cộng thêm lượt trong lần đó.
- Nếu giao dịch không ghi được đề nghị thì các cập nhật trong giao dịch không được coi là một lượt thành công.

Bộ đếm lưu theo cặp `provider_id + service_code`. Được gửi đề nghị vá lốp không tự xóa bộ đếm của dịch vụ khác.

Một lượt không nhất thiết là một khách khác: khi một yêu cầu bị từ chối rồi được điều phối lại, các ứng viên còn lại có thể tiếp tục tích lũy lượt nếu vẫn nằm trong nhóm được xét.

### 8.2. Khi nào được đưa lên trước?

```text
Ưu tiên chống bỏ đói nếu K_i ≥ K_limit
Mặc định K_limit = 3
```

Tại thời điểm xếp hạng:

1. Người đạt ngưỡng đứng trước người chưa đạt ngưỡng.
2. Giữa những người đã đạt ngưỡng, người có số lượt bị bỏ qua lớn hơn đứng trước.
3. Sau đó mới so điểm chi phí và các tiêu chí phá hòa.

Ví dụ, bắt đầu với bộ đếm 0 và bị bỏ qua ba lượt hợp lệ thì bộ đếm thành 3. Ở lượt xếp hạng tiếp theo, nếu vẫn đủ điều kiện và trong nhóm ETA, người đó vào tầng chống bỏ đói. Không được diễn đạt thành “chắc chắn nhận ca ở lượt thứ ba”.

### 8.3. Những điều quy tắc này không bảo đảm

- Không bảo đảm chính xác cứ bỏ qua 3 lượt là người đó được giao ca tiếp theo: có thể có nhiều người cùng đạt ngưỡng hoặc có bộ đếm cao hơn.
- Không bỏ qua năng lực dịch vụ, xác minh, vùng phục vụ hoặc nhóm ETA để ưu tiên công bằng.
- Không bảo đảm mọi người có số ca, thu nhập hoặc thời gian chờ bằng nhau.
- Không bảo đảm không ai bị chờ vô hạn trong mọi điều kiện: thiếu yêu cầu phù hợp, vị trí luôn ngoài nhóm ETA hoặc hệ thống quá tải vẫn là giới hạn.
- Bộ đếm được xóa khi **gửi đề nghị**, không phải khi nhận ca. Nếu người đó từ chối hoặc treo máy, họ đã được tính là có một cơ hội.
- Code bật/tắt sẵn sàng không tự xóa bộ đếm lượt bị bỏ qua; thời gian chờ và bộ đếm lượt là hai cơ chế riêng.

Nên gọi đúng là “cơ chế hạn chế bỏ đói trong tập ứng viên phù hợp”, không khẳng định đã chứng minh công bằng tuyệt đối.

## 9. Thứ tự xếp hạng đầy đủ

Comparator trong `rankCandidates(...)` dùng thứ tự:

1. Đã đạt ngưỡng chống bỏ đói trước, chưa đạt sau.
2. Nếu đã đạt: số lượt bị bỏ qua giảm dần.
3. Điểm chi phí tăng dần.
4. ETA tăng dần.
5. Quãng đường OSRM tăng dần.
6. Thời gian chờ được đề nghị giảm dần.
7. Số ca cùng dịch vụ đã hoàn thành giảm dần.
8. UUID cứu hộ viên làm tiêu chí cuối theo comparator của Java.

Đối với người chưa đạt ngưỡng, bộ đếm 1 hay 2 chưa trực tiếp làm họ đứng trước nhau ở bước 2.

Khoảng cách đường bộ không có trọng số riêng trong công thức hiện tại; nó là tiêu chí phá hòa sau ETA. Điểm sao đánh giá và giá sửa xe cũng không có trong công thức này.

Không làm tròn điểm thành vài chữ số trước khi xếp hạng. Các bảng dưới đây làm tròn chỉ để dễ đọc.

## 10. Ví dụ tính tay

Dữ liệu sau là **giả định minh họa**, không phải kết quả gọi OSRM thật hoặc thông tin của các tài khoản demo.

Giả sử dùng toàn bộ cấu hình mặc định, các ứng viên đều đã qua điều kiện bắt buộc và có tuyến đường:

| Người |                ETA | C_i: ca hoàn thành |      W_i: chờ đề nghị | R_i: đã nhận trong 7 ngày | K_i ban đầu |
| ----- | -----------------: | -----------------: | --------------------: | ------------------------: | ----------: |
| A     |  300 giây / 5 phút |                 40 |  1.800 giây / 30 phút |                         4 |           0 |
| B     |  360 giây / 6 phút |                  5 | 7.200 giây / 120 phút |                         0 |           0 |
| C     |  480 giây / 8 phút |                 50 |  3.600 giây / 60 phút |                         8 |           0 |
| D     | 660 giây / 11 phút |                100 | 7.200 giây / 120 phút |                         0 |          99 |

Người nhanh nhất có ETA 300 giây. Giới hạn nhóm là `300 + 300 = 600 giây`, nên D bị loại trước khi xét chống bỏ đói.

### 10.1. Chưa có ai trong nhóm đạt ngưỡng chống bỏ đói

```text
A = 0,55×0 + 0,15×(1 - 40/50) + 0,15×(1 - 1800/7200) + 0,15×(4/10)
  = 0 + 0,03 + 0,1125 + 0,06
  = 0,2025

B = 0,55×(60/300) + 0,15×(1 - 5/50) + 0,15×(1 - 7200/7200) + 0,15×0
  = 0,11 + 0,135 + 0 + 0
  = 0,2450

C = 0,55×(180/300) + 0,15×(1 - 50/50) + 0,15×(1 - 3600/7200) + 0,15×(8/10)
  = 0,33 + 0 + 0,075 + 0,12
  = 0,5250
```

Thứ tự là **A → B → C**. C có nhiều ca hoàn thành nhất trong nhóm nhưng không đứng đầu vì ETA cao hơn và vừa nhận nhiều ca.

### 10.2. B đã bị bỏ qua ba lượt

Giữ nguyên các chỉ số trên nhưng giả sử `K_B = 3`, `K_A = K_C = 0`.

Thứ tự thành **B → A → C**, mặc dù `Score_B > Score_A`. Lý do là tầng chống bỏ đói được xét trước điểm.

D vẫn bị loại dù có 99 lượt bị bỏ qua, vì không nằm trong nhóm ETA.

### 10.3. Người ít ca cũng có thể đứng đầu mà chưa cần chống bỏ đói

Xét hai người khác cùng ETA 300 giây, đều có bộ đếm 0:

- Người X: đã hoàn thành 50 ca, mới bật sẵn sàng, đã nhận 10 ca gần đây.
- Người Y: chưa hoàn thành ca nào, chờ 2 giờ, chưa nhận ca gần đây.

```text
Score_X = 0 + 0 + 0,15 + 0,15 = 0,30
Score_Y = 0 + 0,15 + 0 + 0 = 0,15
```

Y đứng trước X. Như vậy, ít ca hoàn thành không đồng nghĩa vĩnh viễn không được chọn.

## 11. Gửi đề nghị, nhận ca và cấu hình

### 11.1. Người đứng đầu không nhận thì sao?

Hệ thống gửi tuần tự một đề nghị cho một người, không mặc định phát cùng lúc cho ba người.

- Chấp nhận trong thời hạn và còn đủ điều kiện: giao ca, lưu ETA/quãng đường của đề nghị và tắt trạng thái sẵn sàng của người nhận.
- Từ chối: đổi đề nghị thành `declined`, đưa yêu cầu về `searching` khi phù hợp và tính lại lượt kế tiếp.
- Không phản hồi: hết hạn sẽ đổi thành `expired` khi bước quét xử lý và tính lại.
- Các lượt sau loại người đã `declined` hoặc `expired` đối với cùng yêu cầu này. Hàm tìm lại hiện không xóa lịch sử đó.
- Không còn ứng viên: chuyển `no_provider`; không tự tuyên bố đã có người nhận.
- Ứng viên thay đổi điều kiện hoặc cửa hàng đổi tọa độ trong lúc OSRM trả kết quả: code kiểm tra lại trước khi ghi đề nghị; nếu ghi không thành công và yêu cầu vẫn đang tìm, chuyển `no_provider`.

Không nhất thiết người “đứng thứ hai lúc đầu” luôn được gửi tiếp: mỗi lần điều phối lại đều đọc dữ liệu, tính tuyến đường và xếp hạng lại. Thời gian chờ, bộ đếm bỏ qua, người sẵn sàng và ETA nhanh nhất có thể đã thay đổi.

### 11.2. Giới hạn chờ phản hồi

Thời hạn mặc định của một đề nghị là **45 giây kể từ lúc backend tạo đề nghị**, không phải từ lúc thông báo hiện trên điện thoại và không phải ETA đến khách.

Database không chấp nhận đề nghị đã hết hạn. Job quét hết hạn có `fixedDelay` mặc định 15.000 mili giây; việc gọi danh sách đề nghị cũng gọi xử lý hết hạn. Vì vậy, chuyển sang người tiếp theo có thêm thời gian quét, xử lý và mạng; 15 giây không phải cam kết độ trễ tối đa khi máy chủ bận.

Với ba người đều không phản hồi, riêng tổng thời hạn ba đề nghị là `3 × 45 = 135 giây`, nhưng đó **không phải cam kết khách có người nhận trong 135 giây**. Không có số người cố định bằng 3 trong thuật toán, không có bảo đảm luôn có người nhận, và cơ chế này chưa quy định một hạn chót tổng duy nhất cho mọi lượt tìm kiếm.

Khi người được chọn chấp nhận, ETA hiển thị trong yêu cầu được lưu bằng `ceil(eta_seconds / 60)`, tức làm tròn lên phút. Phần thời gian đã chờ nhận đề nghị không được tự cộng vào trường ETA đó.

### 11.3. Tham số hóa theo loại dịch vụ

Các giá trị nằm trong `public.service_types`, được tạo ở migration V7. `loadRequest(...)` đọc cấu hình tương ứng `service_code` của yêu cầu ở mỗi lượt.

| Trường database                       | Mặc định trong migration | Giới hạn database | Vai trò                                   |
| ------------------------------------- | -----------------------: | ----------------- | ----------------------------------------- |
| `matching_eta_window_seconds`         |                      300 | 60–3.600 giây     | Chênh ETA tối đa so với người nhanh nhất  |
| `matching_eta_weight`                 |                     0.55 | 0–1               | Trọng số chi phí ETA                      |
| `matching_experience_weight`          |                     0.15 | 0–1               | Trọng số số ca cùng dịch vụ đã hoàn thành |
| `matching_waiting_weight`             |                     0.15 | 0–1               | Trọng số thời gian chờ được đề nghị       |
| `matching_recent_cases_weight`        |                     0.15 | 0–1               | Trọng số số ca đã nhận gần đây            |
| `matching_experience_reference_cases` |                       50 | 1–10.000 ca       | Mốc chuẩn hóa ca hoàn thành               |
| `matching_waiting_reference_seconds`  |                    7.200 | 60–604.800 giây   | Mốc chuẩn hóa thời gian chờ               |
| `matching_recent_window_days`         |                        7 | 1–90 ngày         | Cửa sổ thống kê đề nghị đã nhận           |
| `matching_recent_reference_cases`     |                       10 | 1–1.000 ca        | Mốc chuẩn hóa ca đã nhận gần đây          |
| `matching_starvation_skip_threshold`  |                        3 | 1–100 lượt        | Ngưỡng ưu tiên chống bỏ đói               |
| `matching_offer_ttl_seconds`          |                       45 | 20–180 giây       | Thời hạn phản hồi mỗi đề nghị             |

Tổng bốn trọng số phải lớn hơn 0. Mặc định có tổng 1; Java chuẩn hóa nếu tổng khác 1.

**Hiện có cấu hình ở database, chưa có giao diện/API admin chuyên chỉnh các trường trọng số này.** API quản lý dịch vụ hiện chỉnh tên, mô tả, icon, trạng thái và một số thuộc tính dịch vụ; không được mô tả là admin đã có màn hình tùy chỉnh thuật toán.

Điều chỉnh tham số không cần viết lại công thức, nhưng cần thử nghiệm tác động và có quy trình kiểm soát. Không sửa migration cũ đã áp dụng chỉ để thay một trọng số trong database đang vận hành.

## 12. Có nên cho khách chọn “gần nhất”, “nhiều ca hoàn thành”…?

### 12.1. Nhận xét và đề xuất cho giai đoạn hiện tại

**Nên để hệ thống tự điều phối theo quy tắc công khai, có cấu hình; chưa nên bắt khách chọn thêm tiêu chí xếp hạng.**

Đây là nhận xét thiết kế, không phải kết luận rằng mọi ứng dụng cứu hộ đều phải như vậy.

Khách nên cung cấp nhu cầu thực tế: loại dịch vụ, loại xe, vị trí, tình trạng xe, điểm giao xe nếu cần và xác nhận an toàn. Đây là dữ liệu để hiểu ca cứu hộ, khác với việc bắt khách tự quyết định các trọng số nội bộ.

Lý do đề xuất:

- Giảm quyết định phụ ở thời điểm khách đang gặp sự cố.
- “Kinh nghiệm” quá rộng; số ca hoàn thành chỉ là chỉ số đo được trong hệ thống.
- Có rủi ro lựa chọn nghiêng về người có nhiều ca, làm người mới ít cơ hội hơn. Đây là rủi ro cần kiểm chứng, không phải số liệu chứng minh đa số khách chắc chắn sẽ chọn như vậy.
- Nhiều tiêu chí dễ xung đột: người đến nhanh nhất chưa chắc là người đã hoàn thành nhiều ca nhất.
- Thuật toán mặc định đã có ETA, ca hoàn thành và công bằng; bắt khách điều chỉnh thêm sẽ làm giải thích kết quả và kiểm thử phức tạp hơn.

Để minh bạch, có thể giải thích ngắn trên giao diện: “Hệ thống tìm cứu hộ viên đã được xác minh, phù hợp dịch vụ và thời gian đến, đồng thời cân bằng cơ hội nhận ca.” Đây là gợi ý nội dung, không khẳng định đã thêm lên giao diện.

### 12.2. Hiện code có nhận lựa chọn ưu tiên từ khách không?

**Chưa có.** `ApiModels.CreateRequest` chưa có trường chế độ ưu tiên hoặc bộ trọng số do khách chọn. Backend hiện lấy chính sách từ loại dịch vụ.

Điều này không có nghĩa hệ thống chọn tùy ý: nó thực hiện các điều kiện, công thức và thứ tự đã mô tả trong tài liệu.

### 12.3. Nếu thầy yêu cầu bổ sung lựa chọn

Phương án mở rộng dễ kiểm soát hơn là **chọn tối đa một chế độ**, mặc định “Hệ thống tự cân bằng”. Có thể nghiên cứu thêm chế độ “Ưu tiên đến sớm” hoặc “Ưu tiên số ca cùng dịch vụ đã hoàn thành”.

Không cần viết nhiều thuật toán độc lập:

```text
Score_i(mode) =
    w_eta(mode) × E_i
  + w_completed(mode) × C_cost_i
  + w_waiting(mode) × W_cost_i
  + w_recent(mode) × R_cost_i
```

Công thức vẫn là một; mỗi chế độ ánh xạ đến một bộ tham số phía backend đã được kiểm thử. Những chế độ này **chưa có trong code hiện tại**.

Các điều kiện xác minh, năng lực, vùng phục vụ và giới hạn bảo vệ khách vẫn phải giữ. Nếu giữ tầng chống bỏ đói, tên “Ưu tiên đến sớm” cũng không được quảng cáo thành “luôn chọn người gần nhất”: đây là hai cam kết khác nhau.

### 12.4. Nếu cho chọn nhiều tiêu chí cùng lúc thì xử lý thế nào?

Trước hết phải xác định lựa chọn là loại nào:

| Loại lựa chọn                                                   | Cách xử lý                                               | Vấn đề cần chấp nhận                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Điều kiện bắt buộc, ví dụ có khả năng vận chuyển xe             | Lọc ứng viên đáp ứng đồng thời các điều kiện được hỗ trợ | Có thể không còn ứng viên; phải thông báo, không tự bỏ điều kiện khách yêu cầu |
| Sở thích mềm, ví dụ ưu tiên thời gian đến hoặc số ca hoàn thành | Đưa vào một phép xếp hạng với mức ưu tiên rõ ràng        | Các tiêu chí có thể đánh đổi, không thể hứa mọi tiêu chí đều đạt cực đại       |
| Chọn nhiều chế độ có ý nghĩa gần nhau                           | Cần quy tắc hợp nhất hoặc cho khách sắp thứ tự ưu tiên   | Checkbox đơn thuần không cho biết tiêu chí nào quan trọng hơn                  |

Về toán học, có thể kết hợp các bộ trọng số bằng hệ số lựa chọn:

```text
w_j = tổng theo m của [λ_m × w_(m,j)]
λ_m ≥ 0; tổng λ_m = 1
```

Trong đó `m` là chế độ được chọn, `j` là một thành phần của công thức. Tuy nhiên phải quyết định `λ_m` là chia đều hay theo mức ưu tiên khách nhập. Chọn hết rồi chia đều có thể chỉ quay về gần chế độ cân bằng, không đem lại giá trị rõ ràng.

Đây chỉ là **phương án nghiên cứu**, chưa triển khai. Không nên nhận các con số trọng số tùy ý từ app rồi dùng trực tiếp; backend cần giới hạn cấu hình và giữ chính sách công bằng. Đề xuất hiện tại vẫn là không thêm lựa chọn ưu tiên, hoặc nếu bắt buộc thì chỉ một chế độ tùy chọn.

Không nên thêm “giá rẻ nhất” hoặc “đánh giá cao nhất” vào lựa chọn rồi tuyên bố thuật toán đã hỗ trợ: công thức hiện chưa có hai tiêu chí đó, và giá sửa xe có thể chưa biết trước chẩn đoán/báo giá.

## 13. Giới hạn và hướng đánh giá tiếp theo

Những điểm cần trình bày trung thực khi trao đổi với giảng viên:

1. **Trọng số mặc định là quyết định thiết kế**, chưa có bằng chứng chúng tối ưu cho hoạt động cứu hộ thực tế. Cần so sánh nhiều cấu hình bằng dữ liệu hoặc mô phỏng có tiêu chí đánh giá.
2. **ETA từ cửa hàng là một giả định vận hành.** Nếu nhân viên không xuất phát ở đó hoặc đường bị ùn tắc, thời gian thực tế có thể khác.
3. **Công bằng đang ở cấp cá nhân.** Cửa hàng có nhiều tài khoản có nhiều ứng viên hơn; chưa có cơ chế phân bổ công bằng hai tầng giữa cửa hàng và cá nhân.
4. **Ca hoàn thành không bằng tay nghề.** Không có ca trong hệ thống chưa chắc ít kinh nghiệm ngoài đời; nhiều ca không tự chứng minh chất lượng cao.
5. **Nhận gần đây không bằng sửa thành công gần đây.** Cần giữ rõ hai biến, không dùng cùng một tên “số ca” cho cả hai.
6. **Ưu tiên chống bỏ đói không vượt giới hạn ETA.** Đây là lựa chọn cân bằng lợi ích khách và cơ hội của cứu hộ viên, không phải bảo đảm nhận ca cho mọi người.
7. **Chưa có giới hạn tổng thời gian tìm kiếm thống nhất cho mọi tình huống.** Thời hạn từng đề nghị không thay thế hạn chót của toàn yêu cầu.
8. **Chưa có lịch sử đầy đủ mọi thành phần điểm và bộ tham số theo từng lần quyết định.** Các bảng đề nghị/thống kê hiện có không tương đương một bản giải trình hoàn chỉnh vì sao chọn A thay vì B. Nếu cần bảo vệ thuật toán bằng dữ liệu thực nghiệm, nên nghiên cứu bổ sung lịch sử quyết định có phiên bản chính sách.
9. **Kiểm thử logic không chứng minh OSRM đang chạy trên máy.** Kết quả thực tế còn phụ thuộc database, cấu hình dịch vụ tuyến đường và trạng thái mạng.

Các thước đo nên dùng khi đánh giá tiếp: thời gian đến dự kiến trung bình, thời gian khách chờ có người nhận, tỷ lệ từ chối/hết hạn, số ca không tìm được người, phân bố cơ hội nhận đề nghị giữa cứu hộ viên, số lượt bỏ qua lớn nhất và tỷ lệ người mới được đề nghị. Những chỉ số này là đề xuất đánh giá, không phải tất cả đã có dashboard hiện tại.

## 14. Đối chiếu file và cách trình bày với giảng viên

### 14.1. File triển khai

| File                                                                                                                                 | Nội dung cần xem                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DispatchService.java](backend/src/main/java/com/danang/motorescue/service/DispatchService.java)                                     | `eligibleCandidates`: lọc và lấy chỉ số; `rankCandidates`: nhóm ETA/chống bỏ đói/phá hòa; `rankingCost`: công thức; `writeOffer`: cập nhật bộ đếm và gửi tuần tự |
| [RoadRoutingService.java](backend/src/main/java/com/danang/motorescue/service/RoadRoutingService.java)                               | Gọi OSRM Table để lấy ETA/khoảng cách; gọi Route khi cần hình tuyến đường                                                                                        |
| [ProviderService.java](backend/src/main/java/com/danang/motorescue/service/ProviderService.java)                                     | Bật/tắt sẵn sàng, chấp nhận, từ chối và tiếp tục điều phối                                                                                                       |
| [RescueCreationService.java](backend/src/main/java/com/danang/motorescue/service/RescueCreationService.java)                         | Kiểm tra yêu cầu khách trước khi gọi điều phối                                                                                                                   |
| [RescueQueryService.java](backend/src/main/java/com/danang/motorescue/service/RescueQueryService.java)                               | Lấy tuyến đường từ vị trí đã chụp lại lúc giao ca; phân biệt tọa độ cửa hàng với độ chính xác GPS cũ                                                             |
| [DispatchOfferExpiryJob.java](backend/src/main/java/com/danang/motorescue/service/DispatchOfferExpiryJob.java)                       | Chu kỳ quét đề nghị hết hạn                                                                                                                                      |
| [DispatchRecoveryJob.java](backend/src/main/java/com/danang/motorescue/service/DispatchRecoveryJob.java)                             | Khôi phục xử lý các yêu cầu đang tìm khi luồng trước bị gián đoạn                                                                                                |
| [ApiModels.java](backend/src/main/java/com/danang/motorescue/model/ApiModels.java)                                                   | Hợp đồng đầu vào; hiện chưa có chế độ ưu tiên của khách                                                                                                          |
| [OperatorService.java](backend/src/main/java/com/danang/motorescue/service/OperatorService.java)                                     | API quản lý dịch vụ hiện chưa chỉnh các trọng số điều phối                                                                                                       |
| [V7__configurable_fair_dispatch.sql](backend/src/main/resources/db/migration/V7__configurable_fair_dispatch.sql)                     | Tham số mặc định, ràng buộc và bảng thống kê chống bỏ đói                                                                                                        |
| [V10__shop_dispatch_and_provider_approval.sql](backend/src/main/resources/db/migration/V10__shop_dispatch_and_provider_approval.sql) | Chuyển vị trí giao ca mới sang tọa độ cửa hàng và trạng thái duyệt thành viên                                                                                    |
| [V2__prevent_offer_accept_deadlock.sql](backend/src/main/resources/db/migration/V2__prevent_offer_accept_deadlock.sql)               | Nhận đề nghị trong giao dịch, kiểm tra hết hạn và lưu ETA theo phút                                                                                              |

### 14.2. Kiểm thử liên quan đã có trong mã nguồn

- [DispatchServiceTest.java](backend/src/test/java/com/danang/motorescue/service/DispatchServiceTest.java): lọc nhóm ETA trước khi xét ca hoàn thành; cân bằng chờ/ca gần đây; chống bỏ đói chỉ trong nhóm ETA.
- [RescueDatabaseIntegrationTest.java](backend/src/test/java/com/danang/motorescue/service/RescueDatabaseIntegrationTest.java): lấy tọa độ cửa hàng thay GPS điện thoại; đếm ca đúng loại dịch vụ; cập nhật lượt bỏ qua và đề nghị kế tiếp; gửi tuần tự; kiểm tra nhận đồng thời, hết hạn và vị trí thay đổi.

Các kiểm thử điều phối tích hợp dùng tuyến đường được giả lập để kiểm tra logic/database. Không được trình bày riêng chúng là bằng chứng đã gọi OSRM thật ngoài môi trường kiểm thử.

### 14.3. Cách giải thích ngắn gọn

> Em không cho khách phải tự cân đối giữa người gần và người nhiều ca hoàn thành. Hệ thống lọc cứu hộ viên đã được xác minh, đúng dịch vụ và sẵn sàng; OSRM tính thời gian từ cửa hàng đến khách. Trong nhóm có ETA không chênh quá ngưỡng cấu hình, hệ thống ưu tiên người bị bỏ qua nhiều lượt rồi so điểm tổng hợp: ETA, số ca cùng dịch vụ đã hoàn thành, thời gian chờ và số ca đã nhận gần đây. Công thức dùng điểm chi phí nên điểm thấp hơn được ưu tiên. Trọng số có thể cấu hình theo dịch vụ; cơ chế chống bỏ đói tạo cơ hội nhận đề nghị, không cam kết mọi người có số ca bằng nhau.

Đề xuất lựa chọn tiêu chí của khách, nếu được bổ sung sau này, cần được xem là thay đổi nghiệp vụ có kiểm thử; không phải phần hiện đã triển khai.
