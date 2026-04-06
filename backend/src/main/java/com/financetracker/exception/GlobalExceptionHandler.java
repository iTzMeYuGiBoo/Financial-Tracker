package com.financetracker.exception;
import org.springframework.http.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String,String>> handleBad(BadRequestException e){ return ResponseEntity.badRequest().body(Map.of("error",e.getMessage())); }
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String,String>> handleBadCredentials(BadCredentialsException e){ return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","Invalid email or password")); }
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String,String>> handleNotFound(ResourceNotFoundException e){ return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",e.getMessage())); }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String,String>> handleForbidden(AccessDeniedException e){ return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","Forbidden")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String,String>> handleDataIntegrity(DataIntegrityViolationException e){ return ResponseEntity.badRequest().body(Map.of("error","Email already registered")); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String,String>> handleGeneral(Exception e){ return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","Internal server error")); }
}
