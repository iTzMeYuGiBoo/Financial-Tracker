package com.financetracker.service;
import com.financetracker.dto.*;
import com.financetracker.entity.Category;
import com.financetracker.entity.User;
import com.financetracker.exception.BadRequestException;
import com.financetracker.repository.*;
import com.financetracker.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
import java.util.List;
@Service @RequiredArgsConstructor
public class AuthService {
    private static final String PASSWORD_POLICY = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$";
    private final UserRepository userRepo; private final CategoryRepository catRepo;
    private final PasswordEncoder encoder; private final JwtUtil jwt; private final AuthenticationManager authManager;
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalizeEmail(req.getEmail());
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if(userRepo.existsByEmailIgnoreCase(email)) throw new BadRequestException("Email already registered");
        if (req.getPassword() == null || !req.getPassword().matches(PASSWORD_POLICY)) {
            throw new BadRequestException("Password must be at least 8 characters and include upper, lower, number, and special character");
        }
        User u = User.builder().firstName(req.getFirstName()).lastName(req.getLastName()).email(email).password(encoder.encode(req.getPassword())).build();
        userRepo.save(u); seedCategories(u); return build(u, jwt.generateToken(u));
    }
    public AuthResponse login(AuthRequest req) {
        String email = normalizeEmail(req.getEmail());
        authManager.authenticate(new UsernamePasswordAuthenticationToken(email,req.getPassword()));
        User u = userRepo.findByEmailIgnoreCase(email).orElseThrow(); return build(u, jwt.generateToken(u));
    }
    private String normalizeEmail(String email){
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
    private void seedCategories(User u) {
        catRepo.saveAll(List.of(
            cat("Salary","💼","#10B981",Category.CategoryType.INCOME,u), cat("Freelance","💻","#3B82F6",Category.CategoryType.INCOME,u), cat("Investment","📈","#8B5CF6",Category.CategoryType.INCOME,u), cat("Gift","🎁","#EC4899",Category.CategoryType.INCOME,u),
            cat("Food & Dining","🍽️","#EF4444",Category.CategoryType.EXPENSE,u), cat("Transport","🚗","#F97316",Category.CategoryType.EXPENSE,u), cat("Shopping","🛍️","#EC4899",Category.CategoryType.EXPENSE,u),
            cat("Entertainment","🎬","#6366F1",Category.CategoryType.EXPENSE,u), cat("Health","🏥","#14B8A6",Category.CategoryType.EXPENSE,u), cat("Housing","🏠","#84CC16",Category.CategoryType.EXPENSE,u),
            cat("Utilities","⚡","#EAB308",Category.CategoryType.EXPENSE,u), cat("Education","🎓","#0EA5E9",Category.CategoryType.EXPENSE,u), cat("Travel","✈️","#A855F7",Category.CategoryType.EXPENSE,u)
        ));
    }
    private Category cat(String n,String i,String c,Category.CategoryType t,User u){return Category.builder().name(n).icon(i).color(c).type(t).user(u).build();}
    private AuthResponse build(User u,String t){return AuthResponse.builder().token(t).email(u.getEmail()).firstName(u.getFirstName()).lastName(u.getLastName()).build();}
}
