package com.vaultunit.moneyrequest;

import java.math.BigDecimal;
import java.time.Instant;

public record MoneyRequestResponse(
        Long id,
        String requesterName,
        String requesterEmail,
        String recipientName,
        String recipientEmail,
        BigDecimal amount,
        String currency,
        String note,
        MoneyRequestStatus status,
        Instant createdAt,
        Instant updatedAt,
        boolean requestedByMe) {

    public static MoneyRequestResponse from(MoneyRequest request, Long currentUserId) {
        return new MoneyRequestResponse(
                request.getId(),
                request.getRequester().getName(),
                request.getRequester().getEmail(),
                request.getRecipient().getName(),
                request.getRecipient().getEmail(),
                request.getAmount(),
                request.getCurrency(),
                request.getNote(),
                request.getStatus(),
                request.getCreatedAt(),
                request.getUpdatedAt(),
                request.getRequester().getId().equals(currentUserId));
    }
}
