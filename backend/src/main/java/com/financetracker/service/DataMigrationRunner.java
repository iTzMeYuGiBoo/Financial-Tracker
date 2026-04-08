package com.financetracker.service;

import com.financetracker.entity.Currency;
import com.financetracker.repository.CurrencyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

@Service
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class DataMigrationRunner implements ApplicationRunner {

    private final CurrencyRepository currencyRepo;
    private final EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        currencyRepo.findByCode("USD").ifPresent(usd -> {
            int updated = em.createNativeQuery(
                    "UPDATE finance_app.bank_accounts SET currency_id = :cid WHERE currency_id IS NULL")
                    .setParameter("cid", usd.getId())
                    .executeUpdate();
            if (updated > 0) {
                log.info("Migration: set default currency (USD) on {} bank accounts", updated);
            }
        });
    }
}
