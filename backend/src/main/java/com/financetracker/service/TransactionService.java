package com.financetracker.service;
import com.financetracker.dto.TransactionRequest;
import com.financetracker.entity.*;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository txRepo;
    private final CategoryRepository catRepo;
    private final BankAccountRepository bankRepo;
    private final UserService userService;

    // CO2 factors kg per € spent
    private static final Map<String, Double> CO2_FACTORS = Map.of(
            "Food & Dining", 0.8,
            "Transport", 1.2,
            "Shopping", 0.6,
            "Entertainment", 0.3,
            "Health", 0.2,
            "Utilities", 0.9,
            "Travel", 2.5,
            "Housing", 0.4
    );

    @Transactional
    public Map<String, Object> createTransaction(TransactionRequest req) {
        User user = userService.getCurrentUser();
        Category cat = catRepo.findById(req.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        BankAccount account = req.getBankAccountId() != null
                ? bankRepo.findById(req.getBankAccountId()).orElse(null)
                : null;

        BigDecimal co2 = BigDecimal.ZERO;
        if (Transaction.TransactionType.EXPENSE.name().equals(req.getType())) {
            double factor = CO2_FACTORS.getOrDefault(cat.getName(), 0.2);
            co2 = BigDecimal.valueOf(req.getAmount() * factor);
        }

        Transaction t = Transaction.builder()
                .description(req.getDescription())
                .amount(BigDecimal.valueOf(req.getAmount()))
                .date(LocalDate.parse(req.getDate()))
                .type(Transaction.TransactionType.valueOf(req.getType()))
                .note(req.getNote())
                .category(cat)
                .bankAccount(account)
                .user(user)
                .co2Kg(co2)
                .build();

        txRepo.save(t);
        // adjust account balance
        if (account != null) {
            applyDeltaToAccount(account, t.getType(), t.getAmount());
        }
        return buildResponse(t);
    }

    @Transactional
    public Map<String, Object> updateTransaction(Long id, TransactionRequest req) {
        User user = userService.getCurrentUser();
        Transaction existing = txRepo.findById(id)
                .filter(tx -> tx.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        Category cat = catRepo.findById(req.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        BankAccount newAccount = req.getBankAccountId() != null
                ? bankRepo.findById(req.getBankAccountId()).orElse(null)
                : null;

        BigDecimal co2 = BigDecimal.ZERO;
        if (Transaction.TransactionType.EXPENSE.name().equals(req.getType())) {
            double factor = CO2_FACTORS.getOrDefault(cat.getName(), 0.2);
            co2 = BigDecimal.valueOf(req.getAmount() * factor);
        }

        // revert old impact on old account if present
        BankAccount oldAccount = existing.getBankAccount();
        if (oldAccount != null) {
            revertDeltaFromAccount(oldAccount, existing.getType(), existing.getAmount());
        }

        existing.setDescription(req.getDescription());
        existing.setAmount(BigDecimal.valueOf(req.getAmount()));
        existing.setDate(LocalDate.parse(req.getDate()));
        existing.setType(Transaction.TransactionType.valueOf(req.getType()));
        existing.setNote(req.getNote());
        existing.setCategory(cat);
        existing.setBankAccount(newAccount);
        existing.setCo2Kg(co2);

        txRepo.save(existing);

        // apply new impact to new account if present
        if (newAccount != null) {
            applyDeltaToAccount(newAccount, existing.getType(), existing.getAmount());
        }

        return buildResponse(existing);
    }

    @Transactional
    public void deleteTransaction(Long id) {
        User u = userService.getCurrentUser();
        Transaction t = txRepo.findById(id)
                .filter(tx -> tx.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Not found"));

        BankAccount account = t.getBankAccount();
        if (account != null) {
            revertDeltaFromAccount(account, t.getType(), t.getAmount());
        }
        txRepo.delete(t);
    }

    public List<Map<String, Object>> getAllTransactions() {
        return getAllTransactions(null);
    }

    public List<Map<String, Object>> getAllTransactions(Long bankAccountId) {
        User u = userService.getCurrentUser();
        List<Transaction> txs = bankAccountId != null
                ? txRepo.findByUserAndBankAccountIdOrderByDateDescCreatedAtDesc(u, bankAccountId)
                : txRepo.findByUserOrderByDateDescCreatedAtDesc(u);
        return txs.stream().map(this::buildResponse).toList();
    }

    public Map<String, Object> buildResponse(Transaction t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("description", t.getDescription());
        m.put("amount", t.getAmount());
        m.put("date", t.getDate().toString());
        m.put("type", t.getType().name());
        m.put("note", t.getNote());
        m.put("co2Kg", t.getCo2Kg());
        m.put("isRecurring", t.getIsRecurring());
        m.put("createdAt", t.getCreatedAt().toString());
        m.put("categoryId", t.getCategory().getId());
        m.put("categoryName", t.getCategory().getName());
        m.put("categoryIcon", t.getCategory().getIcon());
        m.put("categoryColor", t.getCategory().getColor());
        if (t.getBankAccount() != null) {
            m.put("bankAccountId", t.getBankAccount().getId());
            m.put("bankAccountName", t.getBankAccount().getName());
            m.put("bankAccountCurrency", t.getBankAccount().getCurrency().getCode());
            m.put("bankAccountCurrencySymbol", t.getBankAccount().getCurrency().getSymbol());
            m.put("bankAccountColor", t.getBankAccount().getColor());
        }
        return m;
    }

    public TransactionRepository getRepo() {
        return txRepo;
    }

    private void applyDeltaToAccount(BankAccount account, Transaction.TransactionType type, BigDecimal amount) {
        // CWE-570 fix: removed always-false `amount == null` check.
        // All call sites pass BigDecimal.valueOf(...) or a @Column(nullable=false) field value.
        BigDecimal current = account.getCurrentBalance() != null ? account.getCurrentBalance() : BigDecimal.ZERO;
        if (type == Transaction.TransactionType.INCOME) {
            current = current.add(amount);
        } else {
            current = current.subtract(amount);
        }
        account.setCurrentBalance(current);
        bankRepo.save(account);
    }

    private void revertDeltaFromAccount(BankAccount account, Transaction.TransactionType type, BigDecimal amount) {
        // CWE-570 fix: removed always-false `amount == null` check.
        // All call sites pass BigDecimal.valueOf(...) or a @Column(nullable=false) field value.
        BigDecimal current = account.getCurrentBalance() != null ? account.getCurrentBalance() : BigDecimal.ZERO;
        if (type == Transaction.TransactionType.INCOME) {
            current = current.subtract(amount);
        } else {
            current = current.add(amount);
        }
        account.setCurrentBalance(current);
        bankRepo.save(account);
    }
}
