package com.financetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_notes", uniqueConstraints = @UniqueConstraint(columnNames = { "user_id", "note_year",
        "note_month" }))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "note_year", nullable = false)
    private Integer year;

    @Column(name = "note_month", nullable = false)
    private Integer month; // 1-12

    @Column(columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
