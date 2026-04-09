package com.fitnesstracker.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FitnessTrackerBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitnessTrackerBackendApplication.class, args);
    }
}
