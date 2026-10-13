package com.vaultunit.user;

public record AccountResponse(Long id, String name, String email, String homeCurrency) {

    public static AccountResponse from(User user) {
        return new AccountResponse(user.getId(), user.getName(), user.getEmail(), user.getHomeCurrency());
    }

    public static AccountResponse from(VaultUnitUserDetails user) {
        return new AccountResponse(user.getId(), user.getName(), user.getEmail(), user.getHomeCurrency());
    }
}
