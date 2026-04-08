package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="bank_accounts") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BankAccount {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Builder.Default private String icon = "🏦";
    @Builder.Default private String color = "#3B82F6";
    @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="currency_id", nullable=false) private Currency currency;
    @Builder.Default @Column(precision = 15, scale = 2) private BigDecimal currentBalance = BigDecimal.ZERO;
    @Builder.Default private Boolean isCreditCard = false;
    @Builder.Default @Column(precision = 15, scale = 2) private BigDecimal creditLimit = BigDecimal.ZERO;
    @Builder.Default @Column(precision = 15, scale = 2) private BigDecimal creditUsed = BigDecimal.ZERO;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
