package com.danang.motorescue.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class PushNotificationService {
    private record Recipient(String token, String locale) {}
    private record Copy(String title, String body) {}
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private final JdbcTemplate jdbc;
    private final RestClient client;
    private final String endpoint;
    private final String accessToken;

    public PushNotificationService(
            JdbcTemplate jdbc,
            @Qualifier("pushRestClient") RestClient client,
            @Value("${app.push.expo-url}") String endpoint,
            @Value("${app.push.access-token:}") String accessToken) {
        this.jdbc = jdbc;
        this.client = client;
        this.endpoint = endpoint;
        this.accessToken = accessToken;
    }

    @Async("notificationExecutor")
    public void notifyUser(UUID userId, NotificationKind kind, String detail, UUID requestId) {
        if (userId == null) return;
        List<Recipient> recipients = jdbc.query("""
                SELECT device.expo_push_token, profile.locale
                FROM public.push_devices device
                JOIN public.profiles profile ON profile.id = device.user_id
                WHERE device.user_id = ? AND device.is_active AND profile.is_active
                """, (rs, rowNum) -> new Recipient(rs.getString(1), rs.getString(2)), userId);
        if (recipients.isEmpty()) return;

        List<Map<String, Object>> messages = new ArrayList<>();
        for (Recipient recipient : recipients) {
            Copy copy = copy(kind, detail, "en".equals(recipient.locale()));
            messages.add(Map.of(
                    "to", recipient.token(),
                    "title", copy.title(),
                    "body", copy.body(),
                    "sound", "default",
                    "channelId", "rescue-updates",
                    "data", Map.of("requestId", requestId.toString(), "route", "/rescue/" + requestId)
            ));
        }
        try {
            client.post().uri(endpoint)
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .headers(headers -> {
                        if (!accessToken.isBlank()) headers.setBearerAuth(accessToken);
                    })
                    .body(messages)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException ex) {
            log.warn("Push delivery failed ({})", ex.getClass().getSimpleName());
        }
    }

    private Copy copy(NotificationKind kind, String detail, boolean english) {
        if (english) {
            return switch (kind) {
                case NEW_OFFER -> new Copy("New rescue offer", "A request matches your verified capability and service area.");
                case NO_PROVIDER -> new Copy("No rescue team found", "No suitable partner is currently available. You can retry from request details.");
                case PROVIDER_ASSIGNED -> new Copy("Rescue provider assigned", "A provider accepted the request. You can now track it in the app.");
                case REQUEST_CANCELLED -> new Copy("Request cancelled", "The rescue request was cancelled by " + cancelledBy(detail, true) + ".");
                case STATUS_CHANGED -> new Copy("Request status changed", englishStatus(detail));
                case QUOTE_SUBMITTED -> new Copy("New quote", "Review and approve the quote before the provider starts work.");
                case QUOTE_DECIDED -> new Copy("Customer responded to quote", "Open the rescue request to view the decision.");
            };
        }
        return switch (kind) {
            case NEW_OFFER -> new Copy("Đề nghị cứu hộ mới", "Có một ca phù hợp với năng lực và vùng phục vụ của bạn.");
            case NO_PROVIDER -> new Copy("Chưa tìm được đội cứu hộ", "Hiện chưa có đối tác phù hợp. Bạn có thể thử tìm lại từ chi tiết yêu cầu.");
            case PROVIDER_ASSIGNED -> new Copy("Đã có cứu hộ viên", "Một cứu hộ viên đã nhận ca. Bạn có thể theo dõi trong ứng dụng.");
            case REQUEST_CANCELLED -> new Copy("Yêu cầu đã được hủy", "Ca cứu hộ đã được " + cancelledBy(detail, false) + " hủy.");
            case STATUS_CHANGED -> new Copy("Trạng thái ca đã thay đổi", vietnameseStatus(detail));
            case QUOTE_SUBMITTED -> new Copy("Có báo giá mới", "Hãy kiểm tra nội dung và xác nhận trước khi cứu hộ viên thực hiện.");
            case QUOTE_DECIDED -> new Copy("Khách đã phản hồi báo giá", "Mở ca cứu hộ để xem quyết định mới.");
        };
    }

    private String cancelledBy(String role, boolean english) {
        if (english) return switch (role) {
            case "provider" -> "the rescue provider";
            case "dispatcher", "admin" -> "dispatch staff";
            default -> "the customer";
        };
        return switch (role) {
            case "provider" -> "cứu hộ viên";
            case "dispatcher", "admin" -> "điều phối viên";
            default -> "khách";
        };
    }

    private String englishStatus(String status) {
        return switch (status) {
            case "en_route" -> "The rescue provider started travelling.";
            case "awaiting_arrival_confirmation" -> "The provider reported arrival. Check before confirming.";
            case "arrived" -> "The customer confirmed provider arrival.";
            case "diagnosing" -> "The provider is inspecting the motorcycle.";
            case "repairing" -> "The quote was approved and repair started.";
            case "transporting" -> "The quote was approved and transport started.";
            case "awaiting_completion" -> "The provider requested completion confirmation.";
            case "completed" -> "The customer confirmed request completion.";
            default -> "Open the app to view the latest update.";
        };
    }

    private String vietnameseStatus(String status) {
        return switch (status) {
            case "en_route" -> "Cứu hộ viên đã bắt đầu di chuyển.";
            case "awaiting_arrival_confirmation" -> "Cứu hộ viên cho biết đã đến. Hãy kiểm tra trước khi xác nhận.";
            case "arrived" -> "Khách đã xác nhận cứu hộ viên có mặt.";
            case "diagnosing" -> "Cứu hộ viên đang kiểm tra xe.";
            case "repairing" -> "Báo giá đã được chấp thuận và công việc sửa xe bắt đầu.";
            case "transporting" -> "Báo giá đã được chấp thuận và việc vận chuyển bắt đầu.";
            case "awaiting_completion" -> "Cứu hộ viên yêu cầu xác nhận hoàn tất.";
            case "completed" -> "Khách đã xác nhận ca cứu hộ hoàn tất.";
            default -> "Mở ứng dụng để xem cập nhật mới.";
        };
    }
}
