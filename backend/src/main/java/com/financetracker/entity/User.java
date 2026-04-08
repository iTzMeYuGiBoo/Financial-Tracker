package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.*;

@Entity @Table(name="users", schema="finance_app") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class User implements UserDetails {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String firstName;
    private String lastName;
    @Column(unique=true,nullable=false) private String email;
    @Column(nullable=false) private String password;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    private void normalizeEmail() {
        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
        }
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return List.of(); }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isEnabled() { return true; }
}
