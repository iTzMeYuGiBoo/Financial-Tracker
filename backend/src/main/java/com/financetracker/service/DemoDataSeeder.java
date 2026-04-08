package com.financetracker.service;

import com.financetracker.entity.*;
import com.financetracker.entity.Currency;
import com.financetracker.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(2)
public class DemoDataSeeder implements CommandLineRunner {
    private static final String DEMO_EMAIL = "demo@financetracker.com";
    private static final String DEMO_PASSWORD = "Demo@1234";

    private final UserRepository userRepo;
    private final CategoryRepository catRepo;
    private final BankAccountRepository bankRepo;
    private final TransactionRepository txRepo;
    private final LoanRepository loanRepo;
    private final RecurringTransactionRepository recurRepo;
    private final SavingsGoalRepository goalRepo;
    private final BudgetRepository budgetRepo;
    private final PasswordEncoder encoder;
    private final CurrencyRepository currencyRepo;

    // Same CO2 factors as TransactionService – keeps carbon data consistent
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

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepo.existsByEmailIgnoreCase(DEMO_EMAIL)) {
            log.info("Demo user already exists, skipping seed.");
            return;
        }
        log.info("Seeding demo user data...");

        User user = User.builder()
                .firstName("Demo").lastName("User")
                .email(DEMO_EMAIL)
                .password(encoder.encode(DEMO_PASSWORD))
                .build();
        userRepo.save(user);

        // ── Categories ──────────────────────────────────────────────
        Category salary       = cat("Salary",        "💼", "#10B981", Category.CategoryType.INCOME,  user);
        Category freelance    = cat("Freelance",     "💻", "#3B82F6", Category.CategoryType.INCOME,  user);
        Category investment   = cat("Investment",    "📈", "#8B5CF6", Category.CategoryType.INCOME,  user);
        Category gift         = cat("Gift",          "🎁", "#EC4899", Category.CategoryType.INCOME,  user);
        Category food         = cat("Food & Dining", "🍽️", "#EF4444", Category.CategoryType.EXPENSE, user);
        Category transport    = cat("Transport",     "🚗", "#F97316", Category.CategoryType.EXPENSE, user);
        Category shopping     = cat("Shopping",      "🛍️", "#EC4899", Category.CategoryType.EXPENSE, user);
        Category entertainment= cat("Entertainment", "🎬", "#6366F1", Category.CategoryType.EXPENSE, user);
        Category health       = cat("Health",        "🏥", "#14B8A6", Category.CategoryType.EXPENSE, user);
        Category housing      = cat("Housing",       "🏠", "#84CC16", Category.CategoryType.EXPENSE, user);
        Category utilities    = cat("Utilities",     "⚡", "#EAB308", Category.CategoryType.EXPENSE, user);
        Category education    = cat("Education",     "🎓", "#0EA5E9", Category.CategoryType.EXPENSE, user);
        Category travel       = cat("Travel",        "✈️", "#A855F7", Category.CategoryType.EXPENSE, user);
        catRepo.saveAll(List.of(salary, freelance, investment, gift, food, transport,
                shopping, entertainment, health, housing, utilities, education, travel));

        // ── Bank Accounts (initial balance = 0; computed after seeding txns) ──
        Currency eurCurrency = currencyRepo.findByCode("EUR").orElseThrow(() ->
                new IllegalStateException("EUR currency not found — CurrencySeeder must run first"));
        Currency usdCurrency = currencyRepo.findByCode("USD").orElseThrow(() ->
                new IllegalStateException("USD currency not found — CurrencySeeder must run first"));
        BankAccount main = BankAccount.builder().name("AIB Current").icon("🏦").color("#3B82F6")
                .currency(eurCurrency)
                .currentBalance(BigDecimal.ZERO).isCreditCard(false).user(user).build();
        BankAccount savings = BankAccount.builder().name("Revolut Savings").icon("💰").color("#10B981")
                .currency(eurCurrency)
                .currentBalance(BigDecimal.ZERO).isCreditCard(false).user(user).build();
        BankAccount usd = BankAccount.builder().name("Wise USD").icon("🌍").color("#8B5CF6")
                .currency(usdCurrency)
                .currentBalance(BigDecimal.ZERO).isCreditCard(false).user(user).build();
        BankAccount cc = BankAccount.builder().name("Visa Gold").icon("💳").color("#F97316")
                .currency(eurCurrency)
                .currentBalance(BigDecimal.ZERO).isCreditCard(true)
                .creditLimit(new BigDecimal("5000.00")).creditUsed(BigDecimal.ZERO).user(user).build();
        bankRepo.saveAll(List.of(main, savings, usd, cc));

        // Track balance deltas per account so balances stay consistent
        Map<Long, BigDecimal> deltas = new HashMap<>();
        BigDecimal ccUsed = BigDecimal.ZERO;

        // ── Transactions (6 months of realistic data) ───────────────
        LocalDate today = LocalDate.now();

        // {description, amount, type, category, account, monthsAgo, dayOfMonth, note}
        Object[][] txData = {
                // ─── Current month ───
                {"Salary", 3200, "INCOME", salary, main, 0, 1, "Monthly salary deposit"},
                {"Freelance project", 850, "INCOME", freelance, usd, 0, 3, "Logo design for TechCorp"},
                {"Grocery shopping", 67.50, "EXPENSE", food, main, 0, 2, "Weekly groceries at Tesco"},
                {"Netflix subscription", 15.99, "EXPENSE", entertainment, cc, 0, 5, "Monthly streaming"},
                {"Electricity bill", 89.00, "EXPENSE", utilities, main, 0, 7, "SSE Airtricity bill"},
                {"Coffee & lunch", 42.30, "EXPENSE", food, cc, 0, 4, "Work lunches"},
                {"Gym membership", 49.99, "EXPENSE", health, main, 0, 8, "FlyeFit monthly"},
                {"Uber rides", 28.50, "EXPENSE", transport, cc, 0, 6, "Weekly commute"},
                // ─── Month -1 ───
                {"Salary", 3200, "INCOME", salary, main, 1, 1, "Monthly salary deposit"},
                {"Side project payment", 400, "INCOME", freelance, usd, 1, 5, "WordPress site maintenance"},
                {"Rent payment", 1200, "EXPENSE", housing, main, 1, 1, "Monthly apartment rent"},
                {"Weekly groceries", 145.20, "EXPENSE", food, main, 1, 3, "Tesco & Lidl shopping"},
                {"Spotify Premium", 9.99, "EXPENSE", entertainment, cc, 1, 5, "Music subscription"},
                {"Doctor visit", 80, "EXPENSE", health, main, 1, 10, "GP consultation"},
                {"Online course", 29.99, "EXPENSE", education, cc, 1, 12, "Udemy web development"},
                {"Gas station", 55.00, "EXPENSE", transport, main, 1, 8, "Car fuel top-up"},
                {"Birthday gift", 45.00, "EXPENSE", shopping, cc, 1, 15, "Gift for a friend"},
                // ─── Month -2 ───
                {"Salary", 3200, "INCOME", salary, main, 2, 1, "Monthly salary deposit"},
                {"Dividend payment", 125.50, "INCOME", investment, savings, 2, 10, "ETF quarterly dividend"},
                {"Rent payment", 1200, "EXPENSE", housing, main, 2, 1, "Monthly apartment rent"},
                {"Supermarket", 178.30, "EXPENSE", food, main, 2, 4, "Monthly grocery haul"},
                {"Flight to London", 189.00, "EXPENSE", travel, cc, 2, 15, "Ryanair return flight"},
                {"Hotel London", 320.00, "EXPENSE", travel, cc, 2, 16, "2 nights at Premier Inn"},
                {"Phone bill", 35.00, "EXPENSE", utilities, main, 2, 7, "Vodafone monthly"},
                {"Clothing", 95.00, "EXPENSE", shopping, main, 2, 20, "Zara summer collection"},
                // ─── Month -3 ───
                {"Salary", 3200, "INCOME", salary, main, 3, 1, "Monthly salary deposit"},
                {"Freelance design work", 600, "INCOME", freelance, usd, 3, 8, "UI/UX project for StartupX"},
                {"Rent payment", 1200, "EXPENSE", housing, main, 3, 1, "Monthly apartment rent"},
                {"Groceries", 132.80, "EXPENSE", food, main, 3, 5, "Weekly grocery runs"},
                {"Internet bill", 45.00, "EXPENSE", utilities, main, 3, 6, "Eir broadband monthly"},
                {"Cinema tickets", 24.00, "EXPENSE", entertainment, cc, 3, 12, "IMAX movie night"},
                {"Pharmacy", 18.50, "EXPENSE", health, main, 3, 14, "Prescription refill"},
                // ─── Month -4 ───
                {"Salary", 3200, "INCOME", salary, main, 4, 1, "Monthly salary deposit"},
                {"Tax refund", 450, "INCOME", gift, main, 4, 15, "Revenue tax refund"},
                {"Rent payment", 1200, "EXPENSE", housing, main, 4, 1, "Monthly apartment rent"},
                {"Groceries", 155.60, "EXPENSE", food, main, 4, 3, "Weekly groceries"},
                {"Car insurance", 180.00, "EXPENSE", transport, main, 4, 10, "Annual premium installment"},
                {"Amazon order", 67.90, "EXPENSE", shopping, cc, 4, 18, "Electronics accessories"},
                // ─── Month -5 ───
                {"Salary", 3200, "INCOME", salary, main, 5, 1, "Monthly salary deposit"},
                {"Rent payment", 1200, "EXPENSE", housing, main, 5, 1, "Monthly apartment rent"},
                {"New Year dinner", 85.00, "EXPENSE", food, main, 5, 2, "Celebratory dinner out"},
                {"Winter jacket", 120, "EXPENSE", shopping, main, 5, 8, "Patagonia sale"},
                {"Heating bill", 110.00, "EXPENSE", utilities, main, 5, 9, "Gas heating bill"},
        };

        List<Transaction> transactionsToSave = new ArrayList<>();
        for (Object[] row : txData) {
            Transaction.TransactionType type = "INCOME".equals(row[2])
                    ? Transaction.TransactionType.INCOME : Transaction.TransactionType.EXPENSE;
            double amt = ((Number) row[1]).doubleValue();
            int monthsAgo = (int) row[5];
            int day = (int) row[6];
            Category txCat = (Category) row[3];
            BankAccount txAcct = (BankAccount) row[4];

            LocalDate date = today.minusMonths(monthsAgo)
                    .withDayOfMonth(Math.min(day, today.minusMonths(monthsAgo).lengthOfMonth()));

            // Dynamic description for salary (e.g. "Salary - April")
            String desc = (String) row[0];
            if ("Salary".equals(desc)) {
                desc = "Salary - " + date.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            }

            // CO2 using same category-specific factors as TransactionService
            BigDecimal co2 = BigDecimal.ZERO;
            if (type == Transaction.TransactionType.EXPENSE) {
                double factor = CO2_FACTORS.getOrDefault(txCat.getName(), 0.2);
                co2 = BigDecimal.valueOf(amt * factor);
            }

            Transaction tx = Transaction.builder()
                    .description(desc)
                    .amount(BigDecimal.valueOf(amt))
                    .date(date).type(type)
                    .note((String) row[7])
                    .category(txCat)
                    .bankAccount(txAcct)
                    .user(user)
                    .co2Kg(co2)
                    .build();
            transactionsToSave.add(tx);

            // Accumulate balance delta per account (same logic as TransactionService)
            BigDecimal delta = type == Transaction.TransactionType.INCOME
                    ? BigDecimal.valueOf(amt) : BigDecimal.valueOf(-amt);
            deltas.merge(txAcct.getId(), delta, BigDecimal::add);

            // Track CC credit used separately
            if (Boolean.TRUE.equals(txAcct.getIsCreditCard()) && type == Transaction.TransactionType.EXPENSE) {
                ccUsed = ccUsed.add(BigDecimal.valueOf(amt));
            }
        }
        txRepo.saveAll(transactionsToSave);

        // ── Compute final bank balances ─────────────────────────────
        // Base balances represent money in accounts before the 6-month demo window
        BigDecimal aibBase     = new BigDecimal("2500.00");
        BigDecimal revBase     = new BigDecimal("12000.00");
        BigDecimal usdBase     = new BigDecimal("300.00");

        main.setCurrentBalance(aibBase.add(deltas.getOrDefault(main.getId(), BigDecimal.ZERO)));
        savings.setCurrentBalance(revBase.add(deltas.getOrDefault(savings.getId(), BigDecimal.ZERO)));
        usd.setCurrentBalance(usdBase.add(deltas.getOrDefault(usd.getId(), BigDecimal.ZERO)));
        cc.setCreditUsed(ccUsed);
        cc.setCurrentBalance(BigDecimal.ZERO);
        bankRepo.saveAll(List.of(main, savings, usd, cc));

        // ── Loans (mortgage linked to AIB account) ──────────────────
        Loan mortgage = Loan.builder().name("Apartment Mortgage").loanType(Loan.LoanType.MORTGAGE)
                .totalAmount(new BigDecimal("250000")).amountPaid(new BigDecimal("32000"))
                .monthlyInstallment(new BigDecimal("1200")).interestRate(new BigDecimal("3.75"))
                .startDate(LocalDate.of(2022, 1, 1)).endDate(LocalDate.of(2047, 1, 1))
                .lender("AIB Bank").lenderBankAccount(main).active(true).user(user).build();
        Loan carLoan = Loan.builder().name("Car Loan - Toyota").loanType(Loan.LoanType.AUTO)
                .totalAmount(new BigDecimal("18000")).amountPaid(new BigDecimal("6000"))
                .monthlyInstallment(new BigDecimal("350")).interestRate(new BigDecimal("5.50"))
                .startDate(LocalDate.of(2023, 6, 1)).endDate(LocalDate.of(2027, 6, 1))
                .lender("Bank of Ireland").active(true).user(user).build();
        loanRepo.saveAll(List.of(mortgage, carLoan));

        // ── Savings Goals ───────────────────────────────────────────
        SavingsGoal emergency = SavingsGoal.builder().name("Emergency Fund").icon("🔒").color("#EF4444")
                .targetAmount(new BigDecimal("10000")).currentAmount(new BigDecimal("6500"))
                .targetDate(LocalDate.now().plusMonths(6)).user(user).build();
        SavingsGoal vacation = SavingsGoal.builder().name("Japan Trip").icon("✈️").color("#8B5CF6")
                .targetAmount(new BigDecimal("4000")).currentAmount(new BigDecimal("1200"))
                .targetDate(LocalDate.now().plusMonths(10)).user(user).build();
        goalRepo.saveAll(List.of(emergency, vacation));

        // ── Recurring Transactions (match existing tx patterns) ─────
        RecurringTransaction rent = RecurringTransaction.builder()
                .name("Rent Payment").amount(new BigDecimal("1200"))
                .type(Transaction.TransactionType.EXPENSE).frequency(RecurringTransaction.Frequency.MONTHLY)
                .nextDueDate(today.plusMonths(1).withDayOfMonth(1)).active(true)
                .category(housing).bankAccount(main).user(user).build();
        RecurringTransaction netflix = RecurringTransaction.builder()
                .name("Netflix").amount(new BigDecimal("15.99"))
                .type(Transaction.TransactionType.EXPENSE).frequency(RecurringTransaction.Frequency.MONTHLY)
                .nextDueDate(today.plusMonths(1).withDayOfMonth(5)).active(true)
                .category(entertainment).bankAccount(cc).user(user).build();
        RecurringTransaction salaryRec = RecurringTransaction.builder()
                .name("Monthly Salary").amount(new BigDecimal("3200"))
                .type(Transaction.TransactionType.INCOME).frequency(RecurringTransaction.Frequency.MONTHLY)
                .nextDueDate(today.plusMonths(1).withDayOfMonth(1)).active(true)
                .category(salary).bankAccount(main).user(user).build();
        RecurringTransaction spotify = RecurringTransaction.builder()
                .name("Spotify Premium").amount(new BigDecimal("9.99"))
                .type(Transaction.TransactionType.EXPENSE).frequency(RecurringTransaction.Frequency.MONTHLY)
                .nextDueDate(today.plusMonths(1).withDayOfMonth(5)).active(true)
                .category(entertainment).bankAccount(cc).user(user).build();
        RecurringTransaction gym = RecurringTransaction.builder()
                .name("Gym Membership").amount(new BigDecimal("49.99"))
                .type(Transaction.TransactionType.EXPENSE).frequency(RecurringTransaction.Frequency.MONTHLY)
                .nextDueDate(today.plusMonths(1).withDayOfMonth(8)).active(true)
                .category(health).bankAccount(main).user(user).build();
        recurRepo.saveAll(List.of(rent, netflix, salaryRec, spotify, gym));

        // ── Budgets (current month – all categories with this-month spending) ──
        int curMonth = today.getMonthValue();
        int curYear  = today.getYear();
        budgetRepo.saveAll(List.of(
                Budget.builder().limitAmount(new BigDecimal("300")).month(curMonth).year(curYear).category(food).user(user).build(),
                Budget.builder().limitAmount(new BigDecimal("100")).month(curMonth).year(curYear).category(entertainment).user(user).build(),
                Budget.builder().limitAmount(new BigDecimal("200")).month(curMonth).year(curYear).category(transport).user(user).build(),
                Budget.builder().limitAmount(new BigDecimal("150")).month(curMonth).year(curYear).category(shopping).user(user).build(),
                Budget.builder().limitAmount(new BigDecimal("120")).month(curMonth).year(curYear).category(utilities).user(user).build(),
                Budget.builder().limitAmount(new BigDecimal("100")).month(curMonth).year(curYear).category(health).user(user).build()
        ));

        log.info("Demo data seeded! AIB={}, Revolut={}, Wise={}, CC used={}",
                main.getCurrentBalance(), savings.getCurrentBalance(),
                usd.getCurrentBalance(), cc.getCreditUsed());
    }

    private Category cat(String n, String i, String c, Category.CategoryType t, User u) {
        return Category.builder().name(n).icon(i).color(c).type(t).user(u).build();
    }
}
