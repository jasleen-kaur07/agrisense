package com.agrisense.gateway.error;

import com.agrisense.gateway.logging.RequestLog;
import io.netty.channel.ConnectTimeoutException;
import io.netty.handler.timeout.ReadTimeoutException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.channels.ClosedChannelException;
import java.util.concurrent.TimeoutException;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import reactor.core.publisher.Mono;

/** Converts every exception into problem+json, never leaking internals. */
@Component
@Order(-2)
public class ProblemExceptionHandler implements WebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.error(ex);
        }
        String traceId = String.valueOf(exchange.getAttributes().getOrDefault(Problems.TRACE_ATTR, ""));
        int cause = classify(ex);
        if (cause == 504) {
            RequestLog.warn(traceId, "downstream timeout: " + ex.getClass().getSimpleName());
            return Problems.write(exchange, 504, "gateway-timeout", "Gateway timeout",
                    "The upstream service did not respond in time.");
        }
        if (cause == 502) {
            RequestLog.warn(traceId, "downstream connect failure: " + ex.getClass().getSimpleName());
            return Problems.write(exchange, 502, "bad-gateway", "Bad gateway",
                    "The upstream service is unreachable.");
        }
        if (ex instanceof ResponseStatusException rse) {
            int s = rse.getStatusCode().value();
            if (s == 404) {
                return Problems.write(exchange, 404, "not-found", "Not found", "No such resource.");
            }
            if (s == 413) {
                return Problems.write(exchange, 413, "payload-too-large", "Payload too large",
                        "Request body exceeds the allowed size.");
            }
            if (s == 504) {
                return Problems.write(exchange, 504, "gateway-timeout", "Gateway timeout",
                        "The upstream service did not respond in time.");
            }
            if (s >= 400 && s < 500) {
                String title = HttpStatus.resolve(s) == null ? "Bad request" : HttpStatus.valueOf(s).getReasonPhrase();
                return Problems.write(exchange, s, s == 405 ? "method-not-allowed" : "bad-request", title,
                        "The request could not be processed.");
            }
            RequestLog.warn(traceId, "gateway error status " + s);
            return Problems.write(exchange, 502, "bad-gateway", "Bad gateway", "The upstream service failed.");
        }
        RequestLog.error(traceId, "unhandled error: " + ex.getClass().getName());
        return Problems.write(exchange, 500, "internal", "Internal error", "Unexpected gateway error.");
    }

    /** Returns 504 for timeouts, 502 for connect failures, 0 otherwise. */
    static int classify(Throwable ex) {
        int result = 0;
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof ReadTimeoutException || t instanceof TimeoutException
                    || t instanceof ConnectTimeoutException) {
                return 504;
            }
            if (t instanceof ConnectException || t instanceof UnknownHostException
                    || t instanceof ClosedChannelException) {
                result = 502;
            }
            if (t.getCause() == t) break;
        }
        return result;
    }
}
