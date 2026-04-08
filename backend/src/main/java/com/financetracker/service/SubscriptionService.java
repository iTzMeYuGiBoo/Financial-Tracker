package com.financetracker.service;

import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SubscriptionService {
    private final TransactionRepository txRepo;
    private final UserService userService;

    public List<Map<String, Object>> detectSubscriptions() {
        User u = userService.getCurrentUser();
        List<Transaction> all = txRepo.findByUserOrderByDateDescCreatedAtDesc(u);
        if (all.isEmpty()) return List.of();

        // group expenses by (normalized description, bank account)
        Map<String, List<Transaction>> groups = new HashMap<>();
        for (Transaction t : all) {
            if (t.getType() != Transaction.TransactionType.EXPENSE) continue;
            String desc = normalizeDescription(t.getDescription());
            if (desc.isBlank()) continue;
            String key = desc + "|" + (t.getBankAccount() != null ? t.getBankAccount().getId() : "NONE");
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(t);
        }

        List<Map<String, Object>> subs = new ArrayList<>();

        for (var entry : groups.entrySet()) {
            List<Transaction> txs = entry.getValue();
            txs.sort(Comparator.comparing(Transaction::getDate));
            if (txs.size() < 3) continue; // at least 3 charges

            // compute average gap between charges in days
            List<Long> gaps = new ArrayList<>();
            for (int i = 1; i < txs.size(); i++) {
                gaps.add(ChronoUnit.DAYS.between(txs.get(i - 1).getDate(), txs.get(i).getDate()));
            }
            double avgGap = gaps.stream().mapToLong(Long::longValue).average().orElse(0);
            if (avgGap < 20 || avgGap > 40) {
                // roughly monthly only for now
                continue;
            }

            // check amount stability (within +-20%)
            BigDecimal firstAmt = txs.get(0).getAmount();
            boolean stable = txs.stream().allMatch(t ->
                    t.getAmount().compareTo(firstAmt.multiply(BigDecimal.valueOf(0.8))) >= 0 &&
                            t.getAmount().compareTo(firstAmt.multiply(BigDecimal.valueOf(1.2))) <= 0
            );
            if (!stable) continue;

            // build subscription summary
            Transaction last = txs.get(txs.size() - 1);
            BigDecimal avgAmount = txs.stream()
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(txs.size()), 2, RoundingMode.HALF_UP);

            LocalDate lastDate = last.getDate();
            LocalDate nextDate = lastDate.plusDays((long) Math.round(avgGap));

            Map<String, Object> sub = new LinkedHashMap<>();
            sub.put("merchant", prettyDescription(last.getDescription()));
            sub.put("avgAmount", avgAmount);
            sub.put("chargeCount", txs.size());
            sub.put("lastChargeDate", lastDate.toString());
            sub.put("nextChargeDate", nextDate.toString());
            sub.put("categoryName", last.getCategory().getName());
            sub.put("categoryIcon", last.getCategory().getIcon());
            sub.put("categoryColor", last.getCategory().getColor());
            if (last.getBankAccount() != null) {
                sub.put("bankAccountId", last.getBankAccount().getId());
                sub.put("bankAccountName", last.getBankAccount().getName());
                sub.put("currencySymbol", last.getBankAccount().getCurrency().getSymbol());
            } else {
                sub.put("currencySymbol", "€");
            }
            subs.add(sub);
        }
        // sort by avgAmount desc
        subs.sort((a, b) -> ((BigDecimal) b.get("avgAmount")).compareTo((BigDecimal) a.get("avgAmount")));
        return subs;
    }

    private String normalizeDescription(String desc) {
        // CWE-570 fix: removed always-false `desc == null` branch.
        // Called only with t.getDescription() which is @Column(nullable=false).
        String d = desc.trim().toLowerCase(Locale.ENGLISH);
        d = d.replaceAll("[0-9]", "");
        d = d.replaceAll("\\s+", " ");
        return d;
    }

    private String prettyDescription(String desc) {
        // CWE-570 fix: removed always-false `desc == null` check.
        // Called only with last.getDescription() which is @Column(nullable=false).
        if (desc.isBlank()) return "Unknown";
        String cleaned = desc.trim();
        if (cleaned.length() <= 1) return cleaned.toUpperCase(Locale.ENGLISH);
        return cleaned.substring(0, 1).toUpperCase(Locale.ENGLISH) + cleaned.substring(1);
    }
}
