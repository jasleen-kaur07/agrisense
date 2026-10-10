package com.agrisense.identity.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BeansConfig {
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
