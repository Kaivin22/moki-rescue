package com.danang.motorescue.service;

import com.danang.motorescue.config.PushProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PushReceiptJob {
    private final PushReceiptService receipts;
    private final PushProperties properties;

    public PushReceiptJob(PushReceiptService receipts, PushProperties properties) {
        this.receipts = receipts;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "#{@pushReceiptJob.delayMillis()}")
    public void collectPushReceipts() {
        receipts.collectDueReceipts();
    }

    public long delayMillis() {
        return properties.receiptScanIntervalMs();
    }
}
