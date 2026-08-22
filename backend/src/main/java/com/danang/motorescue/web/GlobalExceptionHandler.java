package com.danang.motorescue.web;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.TransientDataAccessResourceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ErrorResponse(Instant timestamp, int status, String code, String message, String path) {}

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorResponse> api(ApiException ex, HttpServletRequest request) {
        return response(ex.status(), ex.code(), ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Dữ liệu gửi lên không hợp lệ.");
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ErrorResponse> database(DataAccessException ex, HttpServletRequest request) {
        log.error("Database error on {}", request.getRequestURI(), ex);
        return response(HttpStatus.CONFLICT, "DATABASE_CONFLICT", "Dữ liệu đã thay đổi. Vui lòng tải lại.", request);
    }

    @ExceptionHandler({DataAccessResourceFailureException.class, TransientDataAccessResourceException.class})
    ResponseEntity<ErrorResponse> databaseUnavailable(DataAccessException ex, HttpServletRequest request) {
        log.error("Database unavailable on {}", request.getRequestURI(), ex);
        return response(HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE",
                "Máy chủ dữ liệu đang tạm thời không sẵn sàng. Vui lòng thử lại sau.", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled API error on {}", request.getRequestURI(), ex);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Máy chủ gặp lỗi không mong muốn.", request);
    }

    private ResponseEntity<ErrorResponse> response(
            HttpStatus status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ErrorResponse(
                Instant.now(), status.value(), code, message, request.getRequestURI()));
    }
}
