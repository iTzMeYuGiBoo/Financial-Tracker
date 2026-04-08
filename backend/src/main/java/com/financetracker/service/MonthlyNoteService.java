package com.financetracker.service;

import com.financetracker.dto.MonthlyNoteRequest;
import com.financetracker.entity.MonthlyNote;
import com.financetracker.entity.User;
import com.financetracker.repository.MonthlyNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonthlyNoteService {

    private final MonthlyNoteRepository repo;
    private final UserService userService;

    public Map<String, Object> get(Integer year, Integer month) {
        User u = userService.getCurrentUser();
        if (year == null || month == null) {
            LocalDate now = LocalDate.now();
            year = now.getYear();
            month = now.getMonthValue();
        }
        MonthlyNote note = repo.findByUserAndYearAndMonth(u, year, month).orElse(null);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("year", year);
        res.put("month", month);
        res.put("note", note != null ? note.getNote() : "");
        return res;
    }

    @Transactional
    public Map<String, Object> upsert(MonthlyNoteRequest req) {
        User u = userService.getCurrentUser();
        Integer year = req.getYear();
        Integer month = req.getMonth();
        MonthlyNote existing = repo.findByUserAndYearAndMonth(u, year, month).orElse(null);
        if (existing == null) {
            existing = MonthlyNote.builder()
                    .user(u)
                    .year(year)
                    .month(month)
                    .note(req.getNote())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
        } else {
            existing.setNote(req.getNote());
            existing.setUpdatedAt(LocalDateTime.now());
        }
        MonthlyNote saved = repo.save(existing);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", saved.getId());
        res.put("year", saved.getYear());
        res.put("month", saved.getMonth());
        res.put("note", saved.getNote());
        return res;
    }
}
