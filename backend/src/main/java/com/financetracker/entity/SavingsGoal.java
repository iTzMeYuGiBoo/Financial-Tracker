package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity @Table(name="savings_goals") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SavingsGoal {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Builder.Default private String icon = "🎯";
    @Builder.Default private String color = "#6366F1";
    @Column(nullable=false,precision=15,scale=2) private BigDecimal targetAmount;
    @Builder.Default @Column(precision=15,scale=2) private BigDecimal currentAmount = BigDecimal.ZERO;
    private LocalDate targetDate;
    @Builder.Default private Boolean completed = false;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
