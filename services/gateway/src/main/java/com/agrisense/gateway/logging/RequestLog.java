package com.agrisense.gateway.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/** Logging helper that sets the traceId MDC key around each call (reactive code has no thread affinity). */
public final class RequestLog {

    private static final Logger LOG = LoggerFactory.getLogger("gateway");

    private RequestLog() {}

    public static void info(String traceId, String msg) {
        try (MDC.MDCCloseable ignored = MDC.putCloseable("traceId", traceId == null ? "" : traceId)) {
            LOG.info(msg);
        }
    }

    public static void warn(String traceId, String msg) {
        try (MDC.MDCCloseable ignored = MDC.putCloseable("traceId", traceId == null ? "" : traceId)) {
            LOG.warn(msg);
        }
    }

    public static void error(String traceId, String msg) {
        try (MDC.MDCCloseable ignored = MDC.putCloseable("traceId", traceId == null ? "" : traceId)) {
            LOG.error(msg);
        }
    }
}
