package com.danang.motorescue.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PushReceiptJob {
    private final PushReceiptService receipts;

    public PushReceiptJob(PushReceiptService receipts) {
        this.receipts = receipts;
    }

    @Scheduled(fixedDelayString = "${app.push.receipt-scan-interval-ms:60000}")
    public void collectPushReceipts() {
        receipts.collectDueReceipts();
    }
}
