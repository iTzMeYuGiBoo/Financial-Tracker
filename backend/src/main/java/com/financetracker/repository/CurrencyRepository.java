package com.financetracker.repository;
import com.financetracker.entity.Currency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface CurrencyRepository extends JpaRepository<Currency, Long> {
    Optional<Currency> findFirstByCode(String code);
    List<Currency> findAllByOrderByCountryAsc();
    boolean existsByCode(String code);
    boolean existsByCodeAndCountry(String code, String country);

    /** Inserts a currency row, silently ignoring it if (code, country) already exists. */
    @Modifying
    @Query(value = "INSERT INTO finance_app.currencies (code, symbol, name, country, flag) " +
                   "VALUES (:code, :symbol, :name, :country, :flag) " +
                   "ON CONFLICT (code, country) DO NOTHING",
           nativeQuery = true)
    void insertIfAbsent(@Param("code") String code, @Param("symbol") String symbol,
                        @Param("name") String name, @Param("country") String country,
                        @Param("flag") String flag);
}
