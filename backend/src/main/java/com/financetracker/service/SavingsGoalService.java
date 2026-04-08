package com.financetracker.service;
import com.financetracker.dto.*;
import com.financetracker.entity.SavingsGoal;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.SavingsGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class SavingsGoalService {
    private final SavingsGoalRepository repo; private final UserService userService;
    public List<Map<String,Object>> getAll(){return repo.findByUserOrderByCreatedAtDesc(userService.getCurrentUser()).stream().map(this::build).toList();}
    @Transactional
    public Map<String,Object> create(SavingsGoalRequest req){
        var u=userService.getCurrentUser();
        var g=SavingsGoal.builder().name(req.getName()).icon(req.getIcon()!=null?req.getIcon():"🎯").color(req.getColor()!=null?req.getColor():"#6366F1")
            .targetAmount(BigDecimal.valueOf(req.getTargetAmount())).currentAmount(req.getCurrentAmount()!=null?BigDecimal.valueOf(req.getCurrentAmount()):BigDecimal.ZERO)
            .targetDate(req.getTargetDate()!=null&&!req.getTargetDate().isEmpty()?LocalDate.parse(req.getTargetDate()):null).user(u).build();
        if(g.getCurrentAmount().compareTo(g.getTargetAmount())>=0) g.setCompleted(true);
        return build(repo.save(g));
    }
    @Transactional
    public Map<String,Object> contribute(Long id, ContributeRequest req){
        var u=userService.getCurrentUser();
        var g=repo.findById(id).filter(x->x.getUser().getId().equals(u.getId())).orElseThrow(()->new ResourceNotFoundException("Goal not found"));
        g.setCurrentAmount(g.getCurrentAmount().add(BigDecimal.valueOf(req.getAmount())));
        if(g.getCurrentAmount().compareTo(g.getTargetAmount())>=0){g.setCompleted(true);g.setCurrentAmount(g.getTargetAmount());}
        return build(repo.save(g));
    }
    @Transactional
    public void delete(Long id){var u=userService.getCurrentUser();var g=repo.findById(id).filter(x->x.getUser().getId().equals(u.getId())).orElseThrow(()->new ResourceNotFoundException("Not found"));repo.delete(g);}
    private Map<String,Object> build(SavingsGoal g){
        BigDecimal pct=g.getTargetAmount().compareTo(BigDecimal.ZERO)>0?g.getCurrentAmount().multiply(BigDecimal.valueOf(100)).divide(g.getTargetAmount(),2,RoundingMode.HALF_UP):BigDecimal.ZERO;
        var m=new LinkedHashMap<String,Object>();
        m.put("id",g.getId());m.put("name",g.getName());m.put("icon",g.getIcon());m.put("color",g.getColor());
        m.put("targetAmount",g.getTargetAmount());m.put("currentAmount",g.getCurrentAmount());m.put("progressPercentage",pct);
        m.put("targetDate",g.getTargetDate()!=null?g.getTargetDate().toString():null);m.put("completed",g.getCompleted());m.put("createdAt",g.getCreatedAt().toString());
        return m;
    }
}
