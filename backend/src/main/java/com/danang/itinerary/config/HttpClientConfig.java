package com.danang.itinerary.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class HttpClientConfig {
    @Bean
    RestClient geminiRestClient(RestClient.Builder builder,
            @Value("${app.http.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.http.read-timeout:20s}") Duration readTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(readTimeout);
        return builder.baseUrl("https://generativelanguage.googleapis.com").requestFactory(factory).build();
    }

    @Bean
    RestClient routingRestClient(RestClient.Builder builder,
            @Value("${app.http.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.http.read-timeout:20s}") Duration readTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(readTimeout);
        return builder.requestFactory(factory).build();
    }
}
