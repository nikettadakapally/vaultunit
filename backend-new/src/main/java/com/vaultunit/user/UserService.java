package com.vaultunit.user;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (repository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        return repository.saveAndFlush(new User(
                request.name().trim(),
                email,
                passwordEncoder.encode(request.password())));
    }

    @Transactional(readOnly = true)
    public User requireByEmail(String email) {
        return repository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found."));
    }

    @Transactional
    public User updateHomeCurrency(String email, String currency) {
        String normalizedCurrency = currency.trim().toUpperCase(Locale.ROOT);
        if (!normalizedCurrency.matches("[A-Z]{3}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Currency must be a three-letter code.");
        }
        User user = requireByEmail(email);
        user.setHomeCurrency(normalizedCurrency);
        return repository.save(user);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
