package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="transactions") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Transaction {
    public enum TransactionType { INCOME, EXPENSE }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String description;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal amount;
    @Column(nullable=false) private LocalDate date;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private TransactionType type;
    private String note;
    private String receiptUrl;
    @Builder.Default private BigDecimal co2Kg = BigDecimal.ZERO;
    @Builder.Default private Boolean isRecurring = false;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="category_id") private Category category;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="bank_account_id") private BankAccount bankAccount;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
