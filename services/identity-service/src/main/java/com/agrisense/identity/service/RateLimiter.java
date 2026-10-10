package com.agrisense.identity.service;

import com.agrisense.identity.web.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * In-memory sliding-window limiter. SINGLE-INSTANCE ONLY: state is per JVM and lost on restart,
 * so with several replicas the effective limit is multiplied by the replica count.
 */
@Component
public class RateLimiter {
    private static final int SWEEP_THRESHOLD = 10_000;

    private final ConcurrentHashMap<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Clock clock;

    @Autowired
    public RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Records an attempt for {@code key}; throws 429 when more than {@code limit} fall inside {@code window}. */
    public void check(String key, int limit, Duration window) {
        long now = clock.millis();
        long windowMs = window.toMillis();
        if (hits.size() > SWEEP_THRESHOLD) sweep(now - windowMs);
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst() <= now - windowMs) q.pollFirst();
            if (q.size() >= limit) {
                long retryMs = q.peekFirst() + windowMs - now;
                throw ApiException.tooManyRequests((int) Math.max(1, (retryMs + 999) / 1000));
            }
            q.addLast(now);
        }
    }

    private void sweep(long cutoff) {
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || e.getValue().peekLast() <= cutoff;
            }
        });
    }
}
