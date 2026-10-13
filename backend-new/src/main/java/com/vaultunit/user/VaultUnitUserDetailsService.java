package com.vaultunit.user;

import java.util.Locale;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class VaultUnitUserDetailsService implements UserDetailsService {

    private final UserRepository repository;

    public VaultUnitUserDetailsService(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        return repository.findByEmail(normalizedEmail)
                .map(VaultUnitUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password."));
    }
}
