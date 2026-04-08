package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="loans", schema="finance_app") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Loan {
    public enum LoanType { PERSONAL, EDUCATIONAL, MORTGAGE, AUTO, MEDICAL, BUSINESS, OTHER }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private LoanType loanType;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal totalAmount;
    @Builder.Default @Column(precision=15,scale=2) private BigDecimal amountPaid = BigDecimal.ZERO;
    @Column(precision=15,scale=2) private BigDecimal monthlyInstallment;
    @Column(precision=5,scale=2) private BigDecimal interestRate;
    private LocalDate startDate;
    private LocalDate endDate;
    private String lender;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="lender_bank_account_id") private BankAccount lenderBankAccount;
    private String note;
    @Builder.Default private Boolean active = true;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
