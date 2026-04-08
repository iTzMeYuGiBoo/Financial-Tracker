package com.financetracker.service;

import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncomeAnalyticsService {

    private final TransactionRepository txRepo;
    private final UserService userService;

    public Map<String, Object> getIncomeBreakdown() {
        User u = userService.getCurrentUser();
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        List<Transaction> all = txRepo.findByUserOrderByDateDescCreatedAtDesc(u);

        // --- This month income by category ---
        Map<String, BigDecimal> thisMonthByCat = new LinkedHashMap<>();
        Map<String, String> catIcons = new LinkedHashMap<>();
        Map<String, String> catColors = new LinkedHashMap<>();
        BigDecimal totalThisMonth = BigDecimal.ZERO;

        for (Transaction t : all) {
            if (t.getType() != Transaction.TransactionType.INCOME) continue;
            if (t.getDate().getMonthValue() != month || t.getDate().getYear() != year) continue;
            String catName = t.getCategory().getName();
            thisMonthByCat.merge(catName, t.getAmount(), BigDecimal::add);
            catIcons.putIfAbsent(catName, t.getCategory().getIcon());
            catColors.putIfAbsent(catName, t.getCategory().getColor());
            totalThisMonth = totalThisMonth.add(t.getAmount());
        }

        final BigDecimal finalTotal = totalThisMonth;
        List<Map<String, Object>> byCategory = thisMonthByCat.entrySet().stream()
        .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
        .map(e -> {
            BigDecimal pct = finalTotal.compareTo(BigDecimal.ZERO) > 0
                    ? e.getValue().multiply(BigDecimal.valueOf(100))
                        .divide(finalTotal, 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            return Map.<String, Object>of(
                    "categoryName", e.getKey(),
                    "categoryIcon", catIcons.getOrDefault(e.getKey(), "💰"),
                    "categoryColor", catColors.getOrDefault(e.getKey(), "#3B82F6"),
                    "amount", e.getValue(),
                    "percentage", pct
            );
        })
        .collect(Collectors.toList());

        // --- 6-month income trend ---
        List<Map<String, Object>> trend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate d = now.minusMonths(i);
            BigDecimal inc = safe(txRepo.sumIncomeByMonth(u, d.getMonthValue(), d.getYear()));
            BigDecimal exp = safe(txRepo.sumExpenseByMonth(u, d.getMonthValue(), d.getYear()));
            BigDecimal savings = inc.subtract(exp);
            BigDecimal savingsPct = inc.compareTo(BigDecimal.ZERO) > 0
                    ? savings.multiply(BigDecimal.valueOf(100)).divide(inc, 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            String label = d.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            trend.add(Map.<String, Object>of(
                    "month", label,
                    "income", inc,
                    "expenses", exp,
                    "savings", savings,
                    "savingsRate", savingsPct
            ));
        }

        // --- Year-to-date totals ---
        BigDecimal ytdIncome = safe(txRepo.sumIncomeByYear(u, year));
        BigDecimal ytdExpenses = safe(txRepo.sumExpenseByYear(u, year));
        BigDecimal ytdSavings = ytdIncome.subtract(ytdExpenses);
        BigDecimal ytdSavingsRate = ytdIncome.compareTo(BigDecimal.ZERO) > 0
                ? ytdSavings.multiply(BigDecimal.valueOf(100)).divide(ytdIncome, 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("thisMonthTotal", totalThisMonth);
        res.put("byCategory", byCategory);
        res.put("trend", trend);
        res.put("ytdIncome", ytdIncome);
        res.put("ytdExpenses", ytdExpenses);
        res.put("ytdSavings", ytdSavings);
        res.put("ytdSavingsRate", ytdSavingsRate);
        return res;
    }

    private BigDecimal safe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
