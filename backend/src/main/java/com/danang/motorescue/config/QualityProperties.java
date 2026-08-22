package com.danang.motorescue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.quality")
public record QualityProperties(
        int minimumRatings,
        double warningAverage,
        double criticalAverage,
        int repeatAfterNewRatings,
        int warningsBeforeSuspensionReview,
        int adminReviewListLimit) {
    public QualityProperties {
        minimumRatings = minimumRatings <= 0 ? 5 : Math.max(3, Math.min(minimumRatings, 50));
        warningAverage = warningAverage <= 0 ? 3.5 : Math.max(1.5, Math.min(warningAverage, 4.5));
        criticalAverage = criticalAverage <= 0
                ? 3.0
                : Math.max(1.0, Math.min(criticalAverage, warningAverage));
        repeatAfterNewRatings = repeatAfterNewRatings <= 0
                ? 3
                : Math.max(1, Math.min(repeatAfterNewRatings, 20));
        warningsBeforeSuspensionReview = warningsBeforeSuspensionReview <= 0
                ? 3
                : Math.max(2, Math.min(warningsBeforeSuspensionReview, 5));
        adminReviewListLimit = adminReviewListLimit <= 0
                ? 30
                : Math.max(10, Math.min(adminReviewListLimit, 100));
    }

    public String alertSeverity(double average, int ratingCount) {
        if (ratingCount < minimumRatings || average >= warningAverage) return null;
        return average < criticalAverage ? "critical" : "warning";
    }

    public boolean canRepeat(Integer previousCheckpoint, int currentRatingCount) {
        return previousCheckpoint == null || currentRatingCount >= previousCheckpoint + repeatAfterNewRatings;
    }

    public boolean recommendsSuspensionReview(int warningCount) {
        return warningCount >= warningsBeforeSuspensionReview;
    }
}
