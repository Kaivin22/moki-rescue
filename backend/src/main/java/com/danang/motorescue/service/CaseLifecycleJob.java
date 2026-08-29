package com.danang.motorescue.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CaseLifecycleJob {
    private final CaseLifecycleService lifecycle;

    public CaseLifecycleJob(CaseLifecycleService lifecycle) {
        this.lifecycle = lifecycle;
    }

    @Scheduled(fixedDelayString = "${app.case-lifecycle.scan-interval-ms:30000}")
    public void scanActiveRequests() {
        lifecycle.scan();
    }
}
