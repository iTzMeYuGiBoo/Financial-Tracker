package com.financetracker.dto;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse { private String token; private String email; private String firstName; private String lastName; }
