package com.financetracker.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="categories") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Category {
    public enum CategoryType { INCOME, EXPENSE }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Builder.Default private String icon = "💰";
    @Builder.Default private String color = "#3B82F6";
    @Enumerated(EnumType.STRING) @Column(nullable=false) private CategoryType type;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id") private User user;
}
