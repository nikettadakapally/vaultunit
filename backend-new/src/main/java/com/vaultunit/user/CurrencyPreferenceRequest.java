package com.vaultunit.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CurrencyPreferenceRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z]{3}") String homeCurrency) {
}
