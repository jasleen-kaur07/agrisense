package com.agrisense.advisory.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Problem(String type, String title, int status, String detail, String instance, String traceId,
                      List<FieldErr> errors) {
    public record FieldErr(String field, String message) {}
}
