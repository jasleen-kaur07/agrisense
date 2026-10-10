package com.agrisense.gateway.filter;

import com.agrisense.gateway.config.GatewayProperties;
import com.agrisense.gateway.error.Problems;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** Limits request bodies (default 1 MB) while still streaming them. */
@Component
public class BodyLimitFilter implements WebFilter, Ordered {

    private final long max;

    public BodyLimitFilter(GatewayProperties props) {
        this.max = props.getMaxBodyBytes();
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 30;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest req = exchange.getRequest();
        long declared = req.getHeaders().getContentLength();
        if (declared > max) {
            return Problems.write(exchange, 413, "payload-too-large", "Payload too large",
                    "Request body exceeds the allowed size.");
        }
        ServerHttpRequest limited = new ServerHttpRequestDecorator(req) {
            @Override
            public Flux<DataBuffer> getBody() {
                AtomicLong seen = new AtomicLong();
                return super.getBody().doOnNext(b -> {
                    if (seen.addAndGet(b.readableByteCount()) > max) {
                        DataBufferUtils.release(b);
                        throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
                    }
                });
            }
        };
        return chain.filter(exchange.mutate().request(limited).build());
    }
}
