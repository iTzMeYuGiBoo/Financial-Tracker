package com.financetracker.controller;

import com.financetracker.repository.CurrencyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/currencies")
@RequiredArgsConstructor
public class CurrencyController {

    private final CurrencyRepository repo;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        var list = repo.findAllByOrderByCountryAsc().stream()
            .map(c -> {
                var m = new LinkedHashMap<String, Object>();
                m.put("id",      c.getId());
                m.put("code",    c.getCode());
                m.put("symbol",  c.getSymbol());
                m.put("name",    c.getName());
                m.put("country", c.getCountry());
                m.put("flag",    c.getFlag());
                return (Map<String, Object>) m;
            })
            .toList();
        return ResponseEntity.ok(list);
    }
}
