package com.danang.motorescue;

import com.danang.motorescue.config.AssistantProperties;
import com.danang.motorescue.config.ApiRateLimitProperties;
import com.danang.motorescue.config.CaseLifecycleProperties;
import com.danang.motorescue.config.MatchingProperties;
import com.danang.motorescue.config.RoutingProperties;
import com.danang.motorescue.config.RescuePolicyProperties;
import com.danang.motorescue.config.QualityProperties;
import com.danang.motorescue.config.PushProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({
        RoutingProperties.class,
        MatchingProperties.class,
        AssistantProperties.class,
        ApiRateLimitProperties.class,
        CaseLifecycleProperties.class,
        RescuePolicyProperties.class,
        QualityProperties.class,
        PushProperties.class
})
public class MokiRescueApplication {
    public static void main(String[] args) {
        SpringApplication.run(MokiRescueApplication.class, args);
    }
}
