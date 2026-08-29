package com.danang.motorescue.service;

import com.danang.motorescue.config.PushProperties;
import com.danang.motorescue.service.ExpoPushProtocol.Receipt;
import com.fasterxml.jackson.databind.JsonNode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class PushReceiptService {
    private record PendingReceipt(
            UUID id, UUID deviceId, String ticketId, int attemptCount, Instant createdAt) {}

    private static final Logger log = LoggerFactory.getLogger(PushReceiptService.class);
    private final JdbcTemplate jdbc;
    private final RestClient client;
    private final PushProperties properties;

    public PushReceiptService(
            JdbcTemplate jdbc,
            @Qualifier("pushRestClient") RestClient client,
            PushProperties properties) {
        this.jdbc = jdbc;
        this.client = client;
        this.properties = properties;
    }

    public int collectDueReceipts() {
        expireStaleReceipts();
        List<PendingReceipt> pending = claimDueReceipts();
        if (pending.isEmpty()) return 0;

        try {
            JsonNode response = client.post()
                    .uri(properties.receiptUrl())
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .headers(headers -> {
                        if (!properties.accessToken().isBlank()) {
                            headers.setBearerAuth(properties.accessToken());
                        }
                    })
                    .body(Map.of("ids", pending.stream().map(PendingReceipt::ticketId).toList()))
                    .retrieve()
                    .body(JsonNode.class);
            Map<String, Receipt> receipts = ExpoPushProtocol.parseReceipts(response);
            Instant now = Instant.now();
            for (PendingReceipt item : pending) {
                Receipt receipt = receipts.get(item.ticketId());
                if (receipt == null) {
                    expireIfExhausted(item, now, "ReceiptUnavailable");
                } else if (receipt.delivered()) {
                    markDelivered(item.id());
                } else {
                    markFailed(item, receipt.errorCode());
                }
            }
        } catch (RestClientException | IllegalArgumentException exception) {
            Instant now = Instant.now();
            pending.forEach(item -> expireIfExhausted(item, now, "ReceiptRequestFailed"));
            log.warn("Expo push receipt check failed ({})", exception.getClass().getSimpleName());
        }
        return pending.size();
    }

    private List<PendingReceipt> claimDueReceipts() {
        return jdbc.query("""
                WITH due AS (
                  SELECT id
                  FROM public.push_delivery_receipts
                  WHERE status = 'pending' AND next_check_at <= NOW() AND attempt_count < ?
                  ORDER BY next_check_at, id
                  FOR UPDATE SKIP LOCKED
                  LIMIT ?
                )
                UPDATE public.push_delivery_receipts receipt
                SET attempt_count = (receipt.attempt_count + 1)::SMALLINT,
                    next_check_at = NOW() + (? * INTERVAL '1 millisecond'),
                    updated_at = NOW()
                FROM due
                WHERE receipt.id = due.id
                RETURNING receipt.id, receipt.push_device_id, receipt.expo_ticket_id,
                          receipt.attempt_count, receipt.created_at
                """, (rs, rowNum) -> new PendingReceipt(
                        rs.getObject("id", UUID.class),
                        rs.getObject("push_device_id", UUID.class),
                        rs.getString("expo_ticket_id"),
                        rs.getInt("attempt_count"),
                        rs.getTimestamp("created_at").toInstant()),
                properties.receiptMaxAttempts(), properties.receiptBatchSize(),
                properties.receiptRetryDelay().toMillis());
    }

    private void expireStaleReceipts() {
        jdbc.update("""
                UPDATE public.push_delivery_receipts
                SET status = 'expired', checked_at = NOW(),
                    last_error_code = 'ReceiptUnavailable', updated_at = NOW()
                WHERE status = 'pending'
                  AND next_check_at <= NOW()
                  AND (attempt_count >= ? OR created_at <= NOW() - (? * INTERVAL '1 millisecond'))
                """, properties.receiptMaxAttempts(), properties.receiptMaxAge().toMillis());
    }

    private void markDelivered(UUID receiptId) {
        jdbc.update("""
                UPDATE public.push_delivery_receipts
                SET status = 'delivered', checked_at = NOW(), last_error_code = NULL, updated_at = NOW()
                WHERE id = ? AND status = 'pending'
                """, receiptId);
    }

    private void markFailed(PendingReceipt item, String errorCode) {
        if (ExpoPushProtocol.deviceNotRegistered(errorCode)) {
            jdbc.update("""
                    WITH failed AS (
                      UPDATE public.push_delivery_receipts
                      SET status = 'failed', checked_at = NOW(), last_error_code = ?, updated_at = NOW()
                      WHERE id = ? AND status = 'pending'
                      RETURNING push_device_id
                    )
                    UPDATE public.push_devices device
                    SET is_active = FALSE
                    FROM failed
                    WHERE device.id = failed.push_device_id AND device.id = ?
                    """, errorCode, item.id(), item.deviceId());
            return;
        }
        jdbc.update("""
                UPDATE public.push_delivery_receipts
                SET status = 'failed', checked_at = NOW(), last_error_code = ?, updated_at = NOW()
                WHERE id = ? AND status = 'pending'
                """, errorCode, item.id());
    }

    private void expireIfExhausted(PendingReceipt item, Instant now, String reason) {
        boolean tooOld = !item.createdAt().plus(properties.receiptMaxAge()).isAfter(now);
        if (item.attemptCount() < properties.receiptMaxAttempts() && !tooOld) return;
        jdbc.update("""
                UPDATE public.push_delivery_receipts
                SET status = 'expired', checked_at = ?, last_error_code = ?, updated_at = NOW()
                WHERE id = ? AND status = 'pending'
                """, Timestamp.from(now), reason, item.id());
    }
}
