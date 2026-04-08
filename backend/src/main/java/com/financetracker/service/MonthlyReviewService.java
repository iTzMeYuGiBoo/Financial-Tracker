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
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonthlyReviewService {

    private final TransactionRepository txRepo;
    private final UserService userService;

    public Map<String, Object> getReview(LocalDate from, LocalDate to) {
        User u = userService.getCurrentUser();
        List<Transaction> txs = txRepo.findByUserAndDateBetweenOrderByDateAsc(u, from, to);

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;
        Map<String, BigDecimal> expenseByCategory = new LinkedHashMap<>();
        Map<String, String> catIcons = new HashMap<>();
        Map<String, String> catColors = new HashMap<>();

        for (Transaction t : txs) {
            if (t.getType() == Transaction.TransactionType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            } else {
                totalExpenses = totalExpenses.add(t.getAmount());
                String key = t.getCategory().getName();
                expenseByCategory.merge(key, t.getAmount(), BigDecimal::add);
                catIcons.putIfAbsent(key, t.getCategory().getIcon());
                catColors.putIfAbsent(key, t.getCategory().getColor());
            }
        }

        BigDecimal netSavings = totalIncome.subtract(totalExpenses);
        BigDecimal savingsRate = totalIncome.compareTo(BigDecimal.ZERO) > 0
                ? netSavings.multiply(BigDecimal.valueOf(100)).divide(totalIncome, 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Top categories (expenses)
        List<Map<String, Object>> topCategories = new ArrayList<>();
        BigDecimal totalExpForPct = totalExpenses.compareTo(BigDecimal.ZERO) > 0 ? totalExpenses : BigDecimal.ONE;
        expenseByCategory.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(6)
                .forEach(e -> {
                    BigDecimal pct = e.getValue().multiply(BigDecimal.valueOf(100)).divide(totalExpForPct, 1, RoundingMode.HALF_UP);
                    String name = e.getKey();
                    topCategories.add(Map.of(
                            "categoryName", name,
                            "amount", e.getValue(),
                            "percentage", pct,
                            "categoryIcon", catIcons.getOrDefault(name, "💳"),
                            "categoryColor", catColors.getOrDefault(name, "#3B82F6")
                    ));
                });

        // Largest transactions by absolute amount
        List<Map<String, Object>> largestTransactions = txs.stream()
                .sorted((a, b) -> b.getAmount().compareTo(a.getAmount()))
                .limit(8)
                .map(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", t.getId());
                    m.put("date", t.getDate().toString());
                    m.put("description", t.getDescription());
                    m.put("type", t.getType().name());
                    m.put("amount", t.getAmount());
                    m.put("categoryName", t.getCategory().getName());
                    m.put("categoryIcon", t.getCategory().getIcon());
                    m.put("categoryColor", t.getCategory().getColor());
                    return m;
                })
                .toList();

        long days = from.until(to).getDays() + 1L;
        if (days < 1) days = 1;
        BigDecimal avgDailySpend = totalExpenses.divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("from", from.toString());
        res.put("to", to.toString());
        res.put("totalIncome", totalIncome);
        res.put("totalExpenses", totalExpenses);
        res.put("netSavings", netSavings);
        res.put("savingsRate", savingsRate);
        res.put("avgDailySpend", avgDailySpend);
        res.put("topCategories", topCategories);
        res.put("largestTransactions", largestTransactions);
        return res;
    }
}
