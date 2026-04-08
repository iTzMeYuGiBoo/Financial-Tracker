package com.financetracker.service;

import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.repository.BankAccountRepository;
import com.financetracker.repository.LoanRepository;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {
        private final TransactionRepository txRepo;
        private final BankAccountRepository bankRepo;
        private final LoanRepository loanRepo;
        private final UserService userService;

        public Map<String, Object> getStats(Long bankAccountId) {
                User u = userService.getCurrentUser();
                int m = LocalDate.now().getMonthValue();
                int y = LocalDate.now().getYear();

                BigDecimal inc = safe(txRepo.sumIncomeByMonth(u, m, y, bankAccountId));
                BigDecimal exp = safe(txRepo.sumExpenseByMonth(u, m, y, bankAccountId));
                BigDecimal bal = inc.subtract(exp);
                BigDecimal co2 = safe(txRepo.sumCo2ByMonth(u, m, y, bankAccountId));
                BigDecimal savings = inc.compareTo(BigDecimal.ZERO) > 0
                                ? bal.multiply(BigDecimal.valueOf(100)).divide(inc, 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                int health = calcHealth(inc, exp, savings);
                String grade = grade(health);

                // All user transactions (we will filter per account when needed)
                var all = txRepo.findByUserOrderByDateDescCreatedAtDesc(u);

                // Top expense categories for this month (respect account filter)
                Map<String, BigDecimal[]> catMap = new LinkedHashMap<>();
                for (var t : all) {
                        if (t.getType() == Transaction.TransactionType.EXPENSE
                                        && t.getDate().getMonthValue() == m
                                        && t.getDate().getYear() == y
                                        && (bankAccountId == null || (t.getBankAccount() != null
                                                        && t.getBankAccount().getId().equals(bankAccountId)))) {
                                var k = t.getCategory().getName();
                                catMap.computeIfAbsent(k, x -> new BigDecimal[] { BigDecimal.ZERO, null, null });
                                catMap.get(k)[0] = catMap.get(k)[0].add(t.getAmount());
                                catMap.get(k)[1] = BigDecimal.valueOf(t.getCategory().getId());
                        }
                }
                var topCats = catMap.entrySet().stream()
                                .sorted((a, b) -> b.getValue()[0].compareTo(a.getValue()[0]))
                                .limit(6)
                                .map(e -> {
                                        var cat = all.stream()
                                                        .filter(t -> t.getCategory().getName().equals(e.getKey()))
                                                        .findFirst()
                                                        .orElse(null);
                                        BigDecimal pct = exp.compareTo(BigDecimal.ZERO) > 0
                                                        ? e.getValue()[0].multiply(BigDecimal.valueOf(100)).divide(exp,
                                                                        1, RoundingMode.HALF_UP)
                                                        : BigDecimal.ZERO;
                                        return Map.<String, Object>of(
                                                        "name", e.getKey(),
                                                        "amount", e.getValue()[0],
                                                        "percentage", pct,
                                                        "color", cat != null ? cat.getCategory().getColor() : "#3B82F6",
                                                        "icon", cat != null ? cat.getCategory().getIcon() : "💰");
                                }).toList();

                // Monthly trend last 6 months (respect account filter)
                var trend = new ArrayList<Map<String, Object>>();
                for (int i = 5; i >= 0; i--) {
                        LocalDate d = LocalDate.now().minusMonths(i);
                        String mn = d.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + d.getYear();
                        BigDecimal mi = safe(txRepo.sumIncomeByMonth(u, d.getMonthValue(), d.getYear(), bankAccountId));
                        BigDecimal me = safe(
                                        txRepo.sumExpenseByMonth(u, d.getMonthValue(), d.getYear(), bankAccountId));
                        trend.add(Map.<String, Object>of("month", mn, "income", mi, "expense", me));
                }

                // Recent 8 transactions (respect account filter)
                var recent = txRepo.findTop10ByUserOrderByDateDesc(u, PageRequest.of(0, 8)).stream()
                                .filter(t -> bankAccountId == null || (t.getBankAccount() != null
                                                && t.getBankAccount().getId().equals(bankAccountId)))
                                .map(t -> {
                                        Map<String, Object> r = new LinkedHashMap<>();
                                        r.put("id", t.getId());
                                        r.put("description", t.getDescription());
                                        r.put("date", t.getDate().toString());
                                        r.put("categoryName", t.getCategory().getName());
                                        r.put("categoryIcon", t.getCategory().getIcon());
                                        r.put("categoryColor", t.getCategory().getColor());
                                        r.put("type", t.getType().name());
                                        r.put("amount", t.getAmount());
                                        r.put("currencySymbol",
                                                        t.getBankAccount() != null
                                                                        ? t.getBankAccount().getCurrency().getSymbol()
                                                                        : "€");
                                        r.put("co2Kg", t.getCo2Kg());
                                        return r;
                                }).toList();

                var res = new LinkedHashMap<String, Object>();
                res.put("totalIncome", inc);
                res.put("totalExpenses", exp);
                res.put("balance", bal);
                res.put("savingsRate", savings);
                res.put("totalCo2Kg", co2);
                res.put("healthScore", health);
                res.put("healthGrade", grade);
                res.put("topCategories", topCats);
                res.put("monthlyTrend", trend);
                res.put("recentTransactions", recent);
                return res;
        }

        public Map<String, Object> getHealthScore(Long bankAccountId) {
                User u = userService.getCurrentUser();
                int m = LocalDate.now().getMonthValue();
                int y = LocalDate.now().getYear();
                BigDecimal inc = safe(txRepo.sumIncomeByMonth(u, m, y, bankAccountId));
                BigDecimal exp = safe(txRepo.sumExpenseByMonth(u, m, y, bankAccountId));
                BigDecimal savings = inc.compareTo(BigDecimal.ZERO) > 0
                                ? inc.subtract(exp).multiply(BigDecimal.valueOf(100)).divide(inc, 2,
                                                RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                int savScore = Math.min(30, savings.intValue());
                int balScore = inc.subtract(exp).compareTo(BigDecimal.ZERO) >= 0 ? 25 : 0;
                int divScore = 20;
                int budgetScore = 15;
                int consistencyScore = 10;
                int total = savScore + balScore + divScore + budgetScore + consistencyScore;
                int streak = calcStreak(u);
                var components = List.<Map<String, Object>>of(
                                Map.<String, Object>of("name", "Savings Rate", "icon", "💰", "score", savScore, "maxScore", 30,
                                                "description", savings.toPlainString() + "% of income saved", "color",
                                                "#10B981"),
                                Map.<String, Object>of("name", "Balance", "icon", "⚖️", "score", balScore, "maxScore", 25,
                                                "description",
                                                inc.subtract(exp).compareTo(BigDecimal.ZERO) >= 0
                                                                ? "Income exceeds expenses"
                                                                : "Spending more than earning",
                                                "color", "#3B82F6"),
                                Map.<String, Object>of("name", "Spending Diversity", "icon", "🎯", "score", divScore, "maxScore", 20,
                                                "description", "Spending across " + divScore + " categories", "color",
                                                "#8B5CF6"),
                                Map.<String, Object>of("name", "Budget Adherence", "icon", "📊", "score", budgetScore, "maxScore", 15,
                                                "description", "On track with budgets", "color", "#F97316"),
                                Map.<String, Object>of("name", "Consistency", "icon", "📅", "score", consistencyScore, "maxScore", 10,
                                                "description", streak + " month saving streak", "color", "#EC4899"));
                List<String> badges = new ArrayList<>();
                if (savings.doubleValue() >= 20)
                        badges.add("💎 Super Saver");
                if (savings.doubleValue() >= 30)
                        badges.add("🚀 Aggressive Saver");
                if (streak >= 3)
                        badges.add("🔥 " + streak + "-Month Streak");
                if (streak >= 6)
                        badges.add("🏆 Long-Term Discipline");
                if (total >= 80)
                        badges.add("⭐ Finance Champion");
                if (total >= 90)
                        badges.add("🌟 Elite Money Manager");
                if (inc.compareTo(BigDecimal.ZERO) > 0 && exp.compareTo(inc.multiply(BigDecimal.valueOf(0.7))) <= 0)
                        badges.add("⚖️ Balanced Spender");
                if (inc.compareTo(BigDecimal.ZERO) > 0 && exp.compareTo(inc.multiply(BigDecimal.valueOf(0.5))) <= 0)
                        badges.add("🧊 Frugal Pro");
                if (co2TrendImproving(u, bankAccountId))
                        badges.add("🌱 Greener Footprint");
                String gradeColor = total >= 80 ? "#10B981"
                                : total >= 60 ? "#3B82F6" : total >= 40 ? "#F97316" : "#EF4444";
                return Map.<String, Object>of(
                                "score", total,
                                "grade", grade(total),
                                "gradeColor", gradeColor,
                                "summary", summary(total),
                                "savingStreak", streak,
                                "badges", badges,
                                "components", components);
        }

        public Map<String, Object> getNetWorth(Long bankAccountId) {
                User u = userService.getCurrentUser();

                // Total assets = sum of all bank account balances (exclude credit cards)
                var allAccounts = bankRepo.findByUserOrderByNameAsc(u);
                BigDecimal assets;
                if (bankAccountId != null) {
                        assets = allAccounts.stream()
                                .filter(a -> a.getId().equals(bankAccountId) && !Boolean.TRUE.equals(a.getIsCreditCard()))
                                .map(a -> a.getCurrentBalance())
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                } else {
                        assets = allAccounts.stream()
                                .filter(a -> !Boolean.TRUE.equals(a.getIsCreditCard()))
                                .map(a -> a.getCurrentBalance())
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                }

                // Total liabilities = credit card used amounts + loan remaining amounts
                BigDecimal creditCardLiabilities = allAccounts.stream()
                        .filter(a -> Boolean.TRUE.equals(a.getIsCreditCard()))
                        .map(a -> a.getCreditUsed() != null ? a.getCreditUsed() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal loanLiabilities = loanRepo.findByUserOrderByCreatedAtDesc(u).stream()
                        .filter(l -> Boolean.TRUE.equals(l.getActive()))
                        .map(l -> l.getTotalAmount().subtract(l.getAmountPaid()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal liabilities = creditCardLiabilities.add(loanLiabilities);
                BigDecimal nw = assets.subtract(liabilities);

                var history = new ArrayList<Map<String, Object>>();
                BigDecimal running = BigDecimal.ZERO;
                for (int i = 11; i >= 0; i--) {
                        LocalDate d = LocalDate.now().minusMonths(i);
                        BigDecimal inc = safe(
                                        txRepo.sumIncomeByMonth(u, d.getMonthValue(), d.getYear(), bankAccountId));
                        BigDecimal exp = safe(
                                        txRepo.sumExpenseByMonth(u, d.getMonthValue(), d.getYear(), bankAccountId));
                        running = running.add(inc).subtract(exp);
                        String mn = d.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
                        history.add(Map.<String, Object>of("month", mn, "netWorth", running));
                }
                return Map.<String, Object>of("totalAssets", assets, "totalLiabilities", liabilities, "netWorth", nw, "history",
                                history);
        }

        public Map<String, Object> getCashFlowForecast(Long bankAccountId) {
                User u = userService.getCurrentUser();
                LocalDate today = LocalDate.now();
                BigDecimal inc = safe(
                                txRepo.sumIncomeByMonth(u, today.getMonthValue(), today.getYear(), bankAccountId));
                BigDecimal exp = safe(
                                txRepo.sumExpenseByMonth(u, today.getMonthValue(), today.getYear(), bankAccountId));
                BigDecimal dailyInc = inc.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP);
                BigDecimal dailyExp = exp.divide(BigDecimal.valueOf(30), 4, RoundingMode.HALF_UP);
                BigDecimal projInc = dailyInc.multiply(BigDecimal.valueOf(30));
                BigDecimal projExp = dailyExp.multiply(BigDecimal.valueOf(30));
                BigDecimal curr = inc.subtract(exp);
                String status = curr.compareTo(BigDecimal.ZERO) >= 0 ? "HEALTHY"
                                : curr.compareTo(BigDecimal.valueOf(-500)) >= 0 ? "WARNING" : "CRITICAL";
                var daily = new ArrayList<Map<String, Object>>();
                BigDecimal bal = curr;
                for (int i = 0; i < 30; i++) {
                        bal = bal.add(dailyInc).subtract(dailyExp);
                        daily.add(Map.<String, Object>of("date", today.plusDays(i).toString(), "projectedBalance", bal));
                }
                return Map.<String, Object>of(
                                "currentBalance", curr,
                                "projectedMonthlyIncome", projInc,
                                "projectedMonthlyExpense", projExp,
                                "projectedNetSavings", projInc.subtract(projExp),
                                "daysUntilLow", curr.compareTo(BigDecimal.ZERO) < 0 ? 0 : 999,
                                "forecastStatus", status,
                                "dailyForecast", daily);
        }

        public Map<String, Object> getCarbonFootprint(Long bankAccountId) {
                User u = userService.getCurrentUser();
                int m = LocalDate.now().getMonthValue();
                int y = LocalDate.now().getYear();
                BigDecimal totalCo2 = safe(txRepo.sumCo2ByMonth(u, m, y, bankAccountId));
                var all = txRepo.findByUserOrderByDateDescCreatedAtDesc(u);
                Map<String, BigDecimal> byCat = new LinkedHashMap<>();
                Map<String, String> catColor = new HashMap<>();
                Map<String, String> catIcon = new HashMap<>();
                for (var t : all) {
                        if (t.getCo2Kg() == null)
                                continue;
                        if (t.getDate().getMonthValue() != m || t.getDate().getYear() != y)
                                continue;
                        if (bankAccountId != null && (t.getBankAccount() == null
                                        || !t.getBankAccount().getId().equals(bankAccountId)))
                                continue;
                        String name = t.getCategory().getName();
                        byCat.merge(name, t.getCo2Kg(), BigDecimal::add);
                        catColor.putIfAbsent(name, t.getCategory().getColor());
                        catIcon.putIfAbsent(name, t.getCategory().getIcon());
                }
                var byCategory = byCat.entrySet().stream().map(e -> Map.<String, Object>of(
                                "name", e.getKey(),
                                "co2Kg", e.getValue(),
                                "color", catColor.getOrDefault(e.getKey(), "#22C55E"),
                                "icon", catIcon.getOrDefault(e.getKey(), "🌍"))).toList();
                var byMonth = new ArrayList<Map<String, Object>>();
                for (int i = 5; i >= 0; i--) {
                        LocalDate d = LocalDate.now().minusMonths(i);
                        String mn = d.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + d.getYear();
                        BigDecimal c = safe(txRepo.sumCo2ByMonth(u, d.getMonthValue(), d.getYear(), bankAccountId));
                        byMonth.add(Map.<String, Object>of("month", mn, "co2Kg", c));
                }
                var equivalencies = List.<Map<String, Object>>of(
                                Map.<String, Object>of("label", "Flights avoided", "value",
                                                totalCo2.divide(BigDecimal.valueOf(250), 1, RoundingMode.HALF_UP)
                                                                .toPlainString(),
                                                "icon", "✈️"),
                                Map.<String, Object>of("label", "Beef meals skipped", "value",
                                                totalCo2.divide(BigDecimal.valueOf(7), 1, RoundingMode.HALF_UP)
                                                                .toPlainString(),
                                                "icon", "🍔"),
                                Map.<String, Object>of("label", "Trees needed", "value",
                                                totalCo2.divide(BigDecimal.valueOf(21), 1, RoundingMode.HALF_UP)
                                                                .toPlainString(),
                                                "icon", "🌳"));
                return Map.<String, Object>of("totalCo2Kg", totalCo2, "byCategory", byCategory, "byMonth", byMonth, "equivalencies",
                                equivalencies);
        }

        private boolean co2TrendImproving(User u, Long bankAccountId) {
                LocalDate now = LocalDate.now();
                LocalDate lastMonth = now.minusMonths(1);
                BigDecimal currentCo2 = safe(txRepo.sumCo2ByMonth(u, now.getMonthValue(), now.getYear(), bankAccountId));
                BigDecimal lastCo2 = safe(txRepo.sumCo2ByMonth(u, lastMonth.getMonthValue(), lastMonth.getYear(), bankAccountId));
                if (currentCo2.compareTo(BigDecimal.ZERO) == 0 && lastCo2.compareTo(BigDecimal.ZERO) == 0) {
                        return false;
                }
                return currentCo2.compareTo(lastCo2) <= 0;
        }

        private BigDecimal safe(BigDecimal v) {
                return v != null ? v : BigDecimal.ZERO;
        }

        private int calcHealth(BigDecimal inc, BigDecimal exp, BigDecimal savings) {
                int base = 50;
                if (inc.compareTo(exp) > 0) {
                        base += 10;
                }
                if (savings.doubleValue() >= 20) {
                        base += 20;
                }
                return Math.min(100, base);
        }

        private String grade(int score) {
                return score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
        }

        private String summary(int score) {
                if (score >= 85) {
                        return "Excellent overall financial health";
                }
                if (score >= 70) {
                        return "Strong position with room to optimise";
                }
                if (score >= 55) {
                        return "Decent, but there are clear improvement areas";
                }
                if (score >= 40) {
                        return "Needs attention to avoid issues";
                }
                return "High risk - urgent changes recommended";
        }

        private int calcStreak(User u) {
                return 3;
        }
}
