package com.financetracker.service;
import com.financetracker.dto.RecurringRequest;
import com.financetracker.entity.*;
import com.financetracker.exception.BadRequestException;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecurringTransactionService {
    private final RecurringTransactionRepository rRepo; private final CategoryRepository catRepo; private final BankAccountRepository bankRepo; private final TransactionRepository txRepo; private final UserService userService;
    public List<Map<String,Object>> getAll(){return rRepo.findByUserOrderByNextDueDateAsc(userService.getCurrentUser()).stream().map(this::build).toList();}
    @Transactional
    public Map<String,Object> create(RecurringRequest req){
        var u=userService.getCurrentUser();
        var cat=catRepo.findById(req.getCategoryId()).orElseThrow(()->new ResourceNotFoundException("Category not found"));
        var bank=req.getBankAccountId()!=null?bankRepo.findById(req.getBankAccountId()).orElse(null):null;
        var startDate = LocalDate.parse(req.getNextDueDate());
        var endDate = req.getEndDate()!=null && !req.getEndDate().isBlank()?LocalDate.parse(req.getEndDate()):null;
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestException("End date must be on or after start date");
        }
        var r=RecurringTransaction.builder().name(req.getName()).amount(BigDecimal.valueOf(req.getAmount())).type(Transaction.TransactionType.valueOf(req.getType()))
            .frequency(RecurringTransaction.Frequency.valueOf(req.getFrequency())).nextDueDate(startDate).endDate(endDate).note(req.getNote()).category(cat).bankAccount(bank).user(u).build();
        return build(rRepo.save(r));
    }
    @Transactional
    public void delete(Long id){var u=userService.getCurrentUser();var r=rRepo.findById(id).filter(x->x.getUser().getId().equals(u.getId())).orElseThrow(()->new ResourceNotFoundException("Not found"));rRepo.delete(r);}
    @Transactional
    public Map<String,Object> processDue(){
        var due=rRepo.findByActiveAndNextDueDateLessThanEqual(true,LocalDate.now());
        for(var r:due){
            if (r.getEndDate() != null && r.getNextDueDate().isAfter(r.getEndDate())) {
                r.setActive(false);
                rRepo.save(r);
                continue;
            }
            txRepo.save(Transaction.builder().description(r.getName()).amount(r.getAmount()).date(r.getNextDueDate()).type(r.getType()).note(r.getNote()).category(r.getCategory()).bankAccount(r.getBankAccount()).user(r.getUser()).isRecurring(true).co2Kg(BigDecimal.ZERO).build());
            r.setLastExecutedDate(r.getNextDueDate());
            var next = nextDate(r.getNextDueDate(),r.getFrequency());
            if (r.getEndDate() != null && next.isAfter(r.getEndDate())) {
                r.setActive(false);
            }
            r.setNextDueDate(next);
            rRepo.save(r);
        }
        return Map.of("processed",due.size(),"message",due.size()+" recurring transactions processed");
    }
    private LocalDate nextDate(LocalDate d,RecurringTransaction.Frequency f){return switch(f){case WEEKLY->d.plusWeeks(1);case BIWEEKLY->d.plusWeeks(2);case MONTHLY->d.plusMonths(1);case QUARTERLY->d.plusMonths(3);case YEARLY->d.plusYears(1);};}
    private Map<String,Object> build(RecurringTransaction r){
        var m=new LinkedHashMap<String,Object>();
        m.put("id",r.getId());m.put("name",r.getName());m.put("amount",r.getAmount());m.put("type",r.getType().name());m.put("frequency",r.getFrequency().name());
        m.put("nextDueDate",r.getNextDueDate().toString());m.put("endDate",r.getEndDate()!=null?r.getEndDate().toString():null);m.put("lastExecutedDate",r.getLastExecutedDate()!=null?r.getLastExecutedDate().toString():null);m.put("active",r.getActive());m.put("note",r.getNote());
        m.put("categoryId",r.getCategory().getId());m.put("categoryName",r.getCategory().getName());m.put("categoryIcon",r.getCategory().getIcon());m.put("categoryColor",r.getCategory().getColor());
        if(r.getBankAccount()!=null){m.put("bankAccountId",r.getBankAccount().getId());m.put("bankAccountName",r.getBankAccount().getName());m.put("bankAccountCurrency",r.getBankAccount().getCurrency().getCode());}
        m.put("createdAt",r.getCreatedAt().toString()); return m;
    }
}
