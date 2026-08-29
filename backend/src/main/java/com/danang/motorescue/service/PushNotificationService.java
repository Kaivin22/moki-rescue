package com.danang.motorescue.service;

import com.danang.motorescue.config.PushProperties;
import com.danang.motorescue.service.ExpoPushProtocol.Ticket;
import com.fasterxml.jackson.databind.JsonNode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

@Service
public class PushNotificationService {
    private record Recipient(UUID deviceId, String token, String locale) {}
    private record Copy(String title, String body) {}
    private static final int MAX_MESSAGES_PER_REQUEST = 100;
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private final JdbcTemplate jdbc;
    private final RestClient client;
    private final PushProperties properties;

    public PushNotificationService(
            JdbcTemplate jdbc,
            @Qualifier("pushRestClient") RestClient client,
            PushProperties properties) {
        this.jdbc = jdbc;
        this.client = client;
        this.properties = properties;
    }

    @Async("notificationExecutor")
    public void notifyUser(UUID userId, NotificationKind kind, String detail, UUID requestId) {
        if (userId == null) return;
        List<Recipient> recipients = jdbc.query("""
                SELECT device.id, device.expo_push_token, profile.locale
                FROM public.push_devices device
                JOIN public.profiles profile ON profile.id = device.user_id
                WHERE device.user_id = ? AND device.is_active AND profile.is_active
                ORDER BY device.id
                """, (rs, rowNum) -> new Recipient(
                        rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)), userId);
        if (recipients.isEmpty()) return;

        for (int start = 0; start < recipients.size(); start += MAX_MESSAGES_PER_REQUEST) {
            int end = Math.min(start + MAX_MESSAGES_PER_REQUEST, recipients.size());
            sendBatch(recipients.subList(start, end), kind, detail, requestId);
        }
    }

    @Async("notificationExecutor")
    public void notifyStaff(NotificationKind kind, String detail, UUID requestId) {
        List<Recipient> recipients = jdbc.query("""
                SELECT device.id, device.expo_push_token, profile.locale
                FROM public.push_devices device
                JOIN public.profiles profile ON profile.id = device.user_id
                WHERE profile.role IN ('dispatcher', 'admin')
                  AND device.is_active AND profile.is_active
                ORDER BY device.id
                """, (rs, rowNum) -> new Recipient(
                        rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)));
        for (int start = 0; start < recipients.size(); start += MAX_MESSAGES_PER_REQUEST) {
            int end = Math.min(start + MAX_MESSAGES_PER_REQUEST, recipients.size());
            sendBatch(recipients.subList(start, end), kind, detail, requestId);
        }
    }

    private void sendBatch(List<Recipient> recipients, NotificationKind kind, String detail, UUID requestId) {
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
        JsonNode response = requestTickets(messages);
        if (response == null) return;
        try {
            List<Ticket> tickets = ExpoPushProtocol.parseTickets(response, recipients.size());
            Instant nextCheckAt = Instant.now().plus(properties.receiptInitialDelay());
            for (int index = 0; index < tickets.size(); index++) {
                Recipient recipient = recipients.get(index);
                Ticket ticket = tickets.get(index);
                if (ticket.accepted()) {
                    try {
                        jdbc.update("""
                                INSERT INTO public.push_delivery_receipts(
                                  push_device_id, expo_ticket_id, next_check_at
                                ) VALUES (?, ?, ?)
                                ON CONFLICT (expo_ticket_id) DO NOTHING
                                """, recipient.deviceId(), ticket.id(), Timestamp.from(nextCheckAt));
                    } catch (DataIntegrityViolationException ignored) {
                        // The installation may have been unregistered while Expo accepted the batch.
                    }
                } else if (ExpoPushProtocol.deviceNotRegistered(ticket.errorCode())) {
                    jdbc.update("UPDATE public.push_devices SET is_active = FALSE WHERE id = ?", recipient.deviceId());
                } else {
                    log.warn("Expo push ticket rejected ({})", ticket.errorCode());
                }
            }
        } catch (IllegalArgumentException exception) {
            log.warn("Push ticket response rejected ({})", exception.getClass().getSimpleName());
        }
    }

    private JsonNode requestTickets(List<Map<String, Object>> messages) {
        for (int attempt = 1; attempt <= properties.sendMaxAttempts(); attempt++) {
            try {
                return client.post().uri(properties.expoUrl())
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .headers(headers -> {
                        if (!properties.accessToken().isBlank()) {
                            headers.setBearerAuth(properties.accessToken());
                        }
                    })
                    .body(messages)
                    .retrieve()
                    .body(JsonNode.class);
            } catch (RestClientException exception) {
                boolean lastAttempt = attempt == properties.sendMaxAttempts();
                if (lastAttempt || !isTransient(exception) || !pauseBeforeRetry(attempt)) {
                    log.warn("Push delivery failed ({})", exception.getClass().getSimpleName());
                    return null;
                }
            }
        }
        return null;
    }

    private boolean pauseBeforeRetry(int attempt) {
        long multiplier = 1L << Math.min(attempt - 1, 4);
        long delayMillis = Math.min(properties.sendInitialBackoff().toMillis() * multiplier, 30_000);
        try {
            Thread.sleep(delayMillis);
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private boolean isTransient(RestClientException exception) {
        if (exception instanceof ResourceAccessException) return true;
        if (exception instanceof RestClientResponseException response) {
            int status = response.getStatusCode().value();
            return status == 429 || status >= 500;
        }
        return false;
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
                case SUPPORT_REQUESTED -> new Copy("Customer needs dispatch support", "Open the attention queue and review the request.");
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
            case SUPPORT_REQUESTED -> new Copy("Khách cần điều phối hỗ trợ", "Mở hàng đợi cảnh báo để kiểm tra yêu cầu.");
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
            case "quote_approved" -> "The quote was approved. The provider must confirm before starting work.";
            case "repairing" -> "The provider started the approved repair.";
            case "transporting" -> "The provider started the approved transport.";
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
            case "quote_approved" -> "Báo giá đã được duyệt. Cứu hộ viên cần xác nhận trước khi bắt đầu.";
            case "repairing" -> "Cứu hộ viên đã bắt đầu công việc sửa xe được duyệt.";
            case "transporting" -> "Cứu hộ viên đã bắt đầu vận chuyển theo báo giá được duyệt.";
            case "awaiting_completion" -> "Cứu hộ viên yêu cầu xác nhận hoàn tất.";
            case "completed" -> "Khách đã xác nhận ca cứu hộ hoàn tất.";
            default -> "Mở ứng dụng để xem cập nhật mới.";
        };
    }
}
