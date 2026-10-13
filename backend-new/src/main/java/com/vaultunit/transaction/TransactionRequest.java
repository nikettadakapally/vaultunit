package com.vaultunit.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TransactionRequest(
        @NotBlank @Size(max = 120) String description,
        @NotBlank @Size(max = 40) String category,
        @NotNull TransactionType type,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull LocalDate date,
        @NotBlank @Size(max = 40) String paymentMethod,
        @Size(min = 3, max = 3) String currency,
        @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2) BigDecimal amountInInr) {
}
