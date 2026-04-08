package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="recurring_transactions", schema="finance_app") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RecurringTransaction {
    public enum Frequency { WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=true) private String name;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Transaction.TransactionType type;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Frequency frequency;
    @Column(nullable=true) private LocalDate nextDueDate;
    private LocalDate endDate;
    private LocalDate lastExecutedDate;
    @Builder.Default private Boolean active = true;
    private String note;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="category_id") private Category category;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="bank_account_id") private BankAccount bankAccount;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
