package com.danang.motorescue.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class HttpClientConfig {
    @Bean
    RestClient routingRestClient(
            RestClient.Builder builder,
            @Value("${app.http.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.http.read-timeout:8s}") Duration readTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(readTimeout);
        return builder.requestFactory(factory).build();
    }

    @Bean
    RestClient pushRestClient(
            RestClient.Builder builder,
            @Value("${app.http.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.http.read-timeout:8s}") Duration readTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(readTimeout);
        return builder.requestFactory(factory).build();
    }

    @Bean
    RestClient geminiRestClient(
            RestClient.Builder builder,
            @Value("${app.http.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.http.assistant-read-timeout:12s}") Duration readTimeout) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(readTimeout);
        return builder.requestFactory(factory).build();
    }
}
