package com.danang.motorescue.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DispatchOfferExpiryJob {
    private final DispatchService dispatch;

    public DispatchOfferExpiryJob(DispatchService dispatch) {
        this.dispatch = dispatch;
    }

    @Scheduled(fixedDelayString = "${app.matching.expiry-scan-interval-ms:15000}")
    public void expirePendingOffers() {
        dispatch.expireOffers();
    }
}
