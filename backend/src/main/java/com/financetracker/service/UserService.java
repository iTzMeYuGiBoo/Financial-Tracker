package com.financetracker.service;
import com.financetracker.entity.User;
import com.financetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
@Service @RequiredArgsConstructor
public class UserService implements UserDetailsService {
    private final UserRepository userRepository;
    @Override public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException { return userRepository.findByEmailIgnoreCase(email).orElseThrow(()->new UsernameNotFoundException("User not found: "+email)); }
    public User getCurrentUser() { String e = SecurityContextHolder.getContext().getAuthentication().getName(); return userRepository.findByEmailIgnoreCase(e).orElseThrow(()->new UsernameNotFoundException("User not found")); }
}
