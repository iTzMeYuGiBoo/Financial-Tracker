package com.financetracker.service;
import com.financetracker.dto.BudgetRequest;
import com.financetracker.entity.Budget;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.*;
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
public class BudgetService {
    private final BudgetRepository budgetRepo;
    private final CategoryRepository catRepo;
    private final TransactionRepository txRepo;
    private final UserService userService;

    public List<Map<String, Object>> getAll() {
        var u = userService.getCurrentUser();
        return budgetRepo.findByUserOrderByYearDescMonthDesc(u).stream().map(b -> buildResponse(b, u)).toList();
    }

    @Transactional
    public Map<String, Object> create(BudgetRequest req) {
        var u = userService.getCurrentUser();
        var cat = catRepo.findById(req.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        var b = Budget.builder()
                .limitAmount(BigDecimal.valueOf(req.getLimitAmount()))
                .month(req.getMonth())
                .year(req.getYear())
                .category(cat)
                .user(u)
                .build();
        return buildResponse(budgetRepo.save(b), u);
    }

    @Transactional
    public void delete(Long id) {
        var u = userService.getCurrentUser();
        var b = budgetRepo.findById(id)
                .filter(x -> x.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Not found"));
        budgetRepo.delete(b);
    }

    /**
     * Returns only budgets that are approaching or over for the current month/year.
     */
    public List<Map<String, Object>> getAlerts() {
        var u = userService.getCurrentUser();
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();
        List<Map<String, Object>> alerts = new ArrayList<>();
        for (Budget b : budgetRepo.findByUserOrderByYearDescMonthDesc(u)) {
            if (!Objects.equals(b.getMonth(), month) || !Objects.equals(b.getYear(), year)) continue;
            Map<String, Object> full = buildResponse(b, u);
            BigDecimal pct = (BigDecimal) full.get("percentage");
            boolean over = (Boolean) full.get("isOverBudget");
            String status;
            if (over) status = "OVER";
            else if (pct.compareTo(BigDecimal.valueOf(80)) >= 0) status = "APPROACHING";
            else status = "OK";
            if ("OK".equals(status)) continue;
            full.put("status", status);
            alerts.add(full);
        }
        alerts.sort((a, b) -> ((BigDecimal) b.get("percentage")).compareTo((BigDecimal) a.get("percentage")));
        return alerts;
    }

    private Map<String, Object> buildResponse(Budget b, com.financetracker.entity.User u) {
        BigDecimal spent = txRepo.sumExpenseByCategoryAndMonth(u, b.getCategory().getId(), b.getMonth(), b.getYear());
        if (spent == null) spent = BigDecimal.ZERO;
        BigDecimal pct = b.getLimitAmount().compareTo(BigDecimal.ZERO) > 0
                ? spent.multiply(BigDecimal.valueOf(100)).divide(b.getLimitAmount(), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        var m = new LinkedHashMap<String, Object>();
        m.put("id", b.getId());
        m.put("limitAmount", b.getLimitAmount());
        m.put("month", b.getMonth());
        m.put("year", b.getYear());
        m.put("categoryId", b.getCategory().getId());
        m.put("categoryName", b.getCategory().getName());
        m.put("categoryIcon", b.getCategory().getIcon());
        m.put("categoryColor", b.getCategory().getColor());
        m.put("spentAmount", spent);
        m.put("remainingAmount", b.getLimitAmount().subtract(spent));
        m.put("percentage", pct);
        m.put("isOverBudget", spent.compareTo(b.getLimitAmount()) > 0);
        return m;
    }
}
