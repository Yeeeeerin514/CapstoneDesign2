package com.albasave.albasave_server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AlbasaveServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(AlbasaveServerApplication.class, args);
	}

}
