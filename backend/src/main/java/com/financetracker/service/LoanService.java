package com.financetracker.service;
import com.financetracker.dto.LoanRequest;
import com.financetracker.entity.BankAccount;
import com.financetracker.entity.Loan;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.BankAccountRepository;
import com.financetracker.repository.LoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor
public class LoanService {
    private final LoanRepository repo;
    private final UserService userService;
    private final BankAccountRepository bankAccountRepo;

    public List<Map<String,Object>> getAll() {
        return repo.findByUserOrderByCreatedAtDesc(userService.getCurrentUser()).stream().map(this::build).toList();
    }

    public Map<String,Object> create(LoanRequest req) {
        var u = userService.getCurrentUser();
        BankAccount lenderAccount = null;
        if (req.getLenderBankAccountId() != null) {
            lenderAccount = bankAccountRepo.findById(req.getLenderBankAccountId())
                    .filter(a -> a.getUser().getId().equals(u.getId())).orElse(null);
        }
        var loan = Loan.builder()
                .name(req.getName())
                .loanType(Loan.LoanType.valueOf(req.getLoanType()))
                .totalAmount(BigDecimal.valueOf(req.getTotalAmount()))
                .amountPaid(req.getAmountPaid() != null ? BigDecimal.valueOf(req.getAmountPaid()) : BigDecimal.ZERO)
                .monthlyInstallment(req.getMonthlyInstallment() != null ? BigDecimal.valueOf(req.getMonthlyInstallment()) : null)
                .interestRate(req.getInterestRate() != null ? BigDecimal.valueOf(req.getInterestRate()) : null)
                .startDate(req.getStartDate() != null ? LocalDate.parse(req.getStartDate()) : null)
                .endDate(req.getEndDate() != null ? LocalDate.parse(req.getEndDate()) : null)
                .lender(req.getLender())
                .lenderBankAccount(lenderAccount)
                .note(req.getNote())
                .user(u)
                .build();
        return build(repo.save(loan));
    }

    public Map<String,Object> update(Long id, LoanRequest req) {
        var u = userService.getCurrentUser();
        var loan = repo.findById(id).filter(l -> l.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
        if (req.getName() != null) loan.setName(req.getName());
        if (req.getLoanType() != null) loan.setLoanType(Loan.LoanType.valueOf(req.getLoanType()));
        if (req.getTotalAmount() != null) loan.setTotalAmount(BigDecimal.valueOf(req.getTotalAmount()));
        if (req.getAmountPaid() != null) loan.setAmountPaid(BigDecimal.valueOf(req.getAmountPaid()));
        if (req.getMonthlyInstallment() != null) loan.setMonthlyInstallment(BigDecimal.valueOf(req.getMonthlyInstallment()));
        if (req.getInterestRate() != null) loan.setInterestRate(BigDecimal.valueOf(req.getInterestRate()));
        if (req.getStartDate() != null) loan.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getEndDate() != null) loan.setEndDate(LocalDate.parse(req.getEndDate()));
        if (req.getLender() != null) loan.setLender(req.getLender());
        if (req.getNote() != null) loan.setNote(req.getNote());
        if (req.getLenderBankAccountId() != null) {
            BankAccount ba = bankAccountRepo.findById(req.getLenderBankAccountId())
                    .filter(a -> a.getUser().getId().equals(u.getId())).orElse(null);
            loan.setLenderBankAccount(ba);
        }
        return build(repo.save(loan));
    }

    public Map<String,Object> makePayment(Long id, Double amount) {
        var u = userService.getCurrentUser();
        var loan = repo.findById(id).filter(l -> l.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
        loan.setAmountPaid(loan.getAmountPaid().add(BigDecimal.valueOf(amount)));
        if (loan.getAmountPaid().compareTo(loan.getTotalAmount()) >= 0) {
            loan.setActive(false);
        }
        return build(repo.save(loan));
    }

    public void delete(Long id) {
        var u = userService.getCurrentUser();
        var loan = repo.findById(id).filter(l -> l.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
        repo.delete(loan);
    }

    public List<Map<String,Object>> getAmortizationSchedule(Long id) {
        var u = userService.getCurrentUser();
        var loan = repo.findById(id).filter(l -> l.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));

        List<Map<String,Object>> schedule = new ArrayList<>();
        if (loan.getTotalAmount() == null || loan.getAmountPaid() == null) return schedule;

        BigDecimal remaining = loan.getTotalAmount().subtract(loan.getAmountPaid());
        BigDecimal monthlyRate = loan.getInterestRate() != null
                ? loan.getInterestRate().divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal installment = loan.getMonthlyInstallment();
        if (installment == null || installment.compareTo(BigDecimal.ZERO) <= 0) return schedule;

        LocalDate date = loan.getStartDate() != null ? loan.getStartDate() : LocalDate.now();
        // Fast-forward to current payment period
        int monthsPaid = 0;
        if (loan.getAmountPaid().compareTo(BigDecimal.ZERO) > 0 && loan.getStartDate() != null) {
            // Approximate months paid
            LocalDate payDate = loan.getStartDate();
            BigDecimal simRemaining = loan.getTotalAmount();
            while (simRemaining.subtract(loan.getTotalAmount().subtract(loan.getAmountPaid())).compareTo(BigDecimal.ZERO) < 0 && monthsPaid < 600) {
                BigDecimal interest = simRemaining.multiply(monthlyRate).setScale(2, RoundingMode.HALF_UP);
                BigDecimal principal = installment.subtract(interest).max(BigDecimal.ZERO);
                simRemaining = simRemaining.subtract(principal).max(BigDecimal.ZERO);
                monthsPaid++;
            }
            date = loan.getStartDate().plusMonths(monthsPaid);
        }

        int num = 1;
        while (remaining.compareTo(BigDecimal.ZERO) > 0 && num <= 600) {
            date = date.plusMonths(1);
            BigDecimal interest = remaining.multiply(monthlyRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal payment = installment.min(remaining.add(interest));
            BigDecimal principal = payment.subtract(interest).max(BigDecimal.ZERO);
            if (principal.compareTo(remaining) > 0) principal = remaining;

            Map<String,Object> row = new LinkedHashMap<>();
            row.put("number", num);
            row.put("date", date.toString());
            row.put("beginningBalance", remaining.setScale(2, RoundingMode.HALF_UP));
            row.put("payment", payment.setScale(2, RoundingMode.HALF_UP));
            row.put("principal", principal.setScale(2, RoundingMode.HALF_UP));
            row.put("interest", interest.setScale(2, RoundingMode.HALF_UP));
            remaining = remaining.subtract(principal).max(BigDecimal.ZERO);
            row.put("endingBalance", remaining.setScale(2, RoundingMode.HALF_UP));
            schedule.add(row);
            num++;
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
        }
        return schedule;
    }

    private Map<String,Object> build(Loan l) {
        var m = new LinkedHashMap<String,Object>();
        m.put("id", l.getId());
        m.put("name", l.getName());
        m.put("loanType", l.getLoanType().name());
        m.put("totalAmount", l.getTotalAmount());
        m.put("amountPaid", l.getAmountPaid());
        m.put("remainingAmount", l.getTotalAmount().subtract(l.getAmountPaid()));
        BigDecimal pct = (l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0)
                ? l.getAmountPaid().multiply(BigDecimal.valueOf(100)).divide(l.getTotalAmount(), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        m.put("progressPercentage", pct);
        m.put("monthlyInstallment", l.getMonthlyInstallment());
        m.put("interestRate", l.getInterestRate());
        m.put("startDate", l.getStartDate() != null ? l.getStartDate().toString() : null);
        m.put("endDate", l.getEndDate() != null ? l.getEndDate().toString() : null);
        m.put("lender", l.getLender());
        m.put("lenderBankAccountId", l.getLenderBankAccount() != null ? l.getLenderBankAccount().getId() : null);
        m.put("lenderBankAccountName", l.getLenderBankAccount() != null ? l.getLenderBankAccount().getName() : null);
        m.put("note", l.getNote());
        m.put("active", l.getActive());
        m.put("createdAt", l.getCreatedAt().toString());
        return m;
    }
}
