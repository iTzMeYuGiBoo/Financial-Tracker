package com.financetracker.service;
import com.financetracker.dto.BankAccountRequest;
import com.financetracker.entity.BankAccount;
import com.financetracker.entity.Currency;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.BankAccountRepository;
import com.financetracker.repository.CurrencyRepository;
import com.financetracker.repository.LoanRepository;
import com.financetracker.repository.RecurringTransactionRepository;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BankAccountService {
    private final BankAccountRepository repo;
    private final UserService userService;
    private final TransactionRepository txRepo;
    private final RecurringTransactionRepository recurRepo;
    private final LoanRepository loanRepo;
    private final CurrencyRepository currencyRepo;

    public List<Map<String,Object>> getAll(){
        return repo.findByUserOrderByNameAsc(userService.getCurrentUser())
                .stream().map(this::build).toList();
    }

    @Transactional
    public Map<String,Object> create(BankAccountRequest req){
        var u = userService.getCurrentUser();
        Currency currency = currencyRepo.findById(req.getCurrencyId())
                .orElseThrow(() -> new ResourceNotFoundException("Currency not found: " + req.getCurrencyId()));
        var balance = req.getCurrentBalance() != null ? BigDecimal.valueOf(req.getCurrentBalance()) : BigDecimal.ZERO;
        boolean isCC = Boolean.TRUE.equals(req.getIsCreditCard());
        var a = BankAccount.builder()
                .name(req.getName())
                .icon(req.getIcon() != null ? req.getIcon() : (isCC ? "💳" : "🏦"))
                .color(req.getColor() != null ? req.getColor() : "#3B82F6")
                .currency(currency)
                .currentBalance(balance)
                .isCreditCard(isCC)
                .creditLimit(isCC && req.getCreditLimit() != null ? BigDecimal.valueOf(req.getCreditLimit()) : BigDecimal.ZERO)
                .creditUsed(BigDecimal.ZERO)
                .user(u)
                .build();
        return build(repo.save(a));
    }

    @Transactional
    public Map<String,Object> payBill(Long id, BigDecimal amount){
        var u = userService.getCurrentUser();
        var a = repo.findById(id).filter(x -> x.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Not found"));
        if (!Boolean.TRUE.equals(a.getIsCreditCard())) throw new IllegalArgumentException("Not a credit card");
        var current = a.getCreditUsed() != null ? a.getCreditUsed() : BigDecimal.ZERO;
        a.setCreditUsed(current.subtract(amount).max(BigDecimal.ZERO));
        return build(repo.save(a));
    }

    @Transactional
    public void delete(Long id){
        var u = userService.getCurrentUser();
        var a = repo.findById(id).filter(x -> x.getUser().getId().equals(u.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Not found"));
        txRepo.deleteAll(txRepo.findByUserAndBankAccountIdOrderByDateDescCreatedAtDesc(u, id));
        recurRepo.findByUserOrderByNextDueDateAsc(u).stream()
                .filter(r -> r.getBankAccount() != null && r.getBankAccount().getId().equals(id))
                .forEach(r -> { r.setBankAccount(null); recurRepo.save(r); });
        loanRepo.findByUserOrderByCreatedAtDesc(u).stream()
                .filter(l -> l.getLenderBankAccount() != null && l.getLenderBankAccount().getId().equals(id))
                .forEach(l -> { l.setLenderBankAccount(null); loanRepo.save(l); });
        repo.delete(a);
    }

    private Map<String,Object> build(BankAccount a){
        Currency c = a.getCurrency();
        var m = new LinkedHashMap<String,Object>();
        m.put("id",             a.getId());
        m.put("name",           a.getName());
        m.put("icon",           a.getIcon());
        m.put("color",          a.getColor());
        m.put("currencyId",     c.getId());
        m.put("currencyCode",   c.getCode());
        m.put("currencySymbol", c.getSymbol());
        m.put("currencyName",   c.getName());
        m.put("country",        c.getCountry());
        m.put("flag",           c.getFlag() != null ? c.getFlag() : "🌐");
        m.put("currentBalance", a.getCurrentBalance());
        m.put("isCreditCard",   Boolean.TRUE.equals(a.getIsCreditCard()));
        m.put("creditLimit",    a.getCreditLimit()  != null ? a.getCreditLimit()  : BigDecimal.ZERO);
        m.put("creditUsed",     a.getCreditUsed()   != null ? a.getCreditUsed()   : BigDecimal.ZERO);
        m.put("createdAt",      a.getCreatedAt().toString());
        return m;
    }
}
