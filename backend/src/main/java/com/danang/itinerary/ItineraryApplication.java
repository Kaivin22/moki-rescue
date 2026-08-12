package com.danang.itinerary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ItineraryApplication {

	public static void main(String[] args) {
		SpringApplication.run(ItineraryApplication.class, args);
	}

}
