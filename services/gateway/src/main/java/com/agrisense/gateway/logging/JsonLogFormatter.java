package com.agrisense.gateway.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.logging.structured.StructuredLogFormatter;

/** One JSON object per line: ts, level, service, traceId, msg (+ error class when present). */
public class JsonLogFormatter implements StructuredLogFormatter<ILoggingEvent> {

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String format(ILoggingEvent event) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ts", event.getInstant().toString());
        m.put("level", event.getLevel().toString());
        m.put("service", "gateway");
        String trace = event.getMDCPropertyMap().get("traceId");
        m.put("traceId", trace == null ? "" : trace);
        m.put("msg", event.getFormattedMessage());
        IThrowableProxy t = event.getThrowableProxy();
        if (t != null) {
            m.put("error", t.getClassName());
        }
        try {
            return mapper.writeValueAsString(m) + "\n";
        } catch (JsonProcessingException e) {
            return "{\"service\":\"gateway\",\"level\":\"ERROR\",\"msg\":\"log serialization failed\"}\n";
        }
    }
}
