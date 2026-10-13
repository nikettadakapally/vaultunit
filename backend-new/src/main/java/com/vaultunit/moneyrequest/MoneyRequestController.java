package com.vaultunit.moneyrequest;

import java.util.List;

import com.vaultunit.user.VaultUnitUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/money-requests")
public class MoneyRequestController {

    private final MoneyRequestService service;

    public MoneyRequestController(MoneyRequestService service) {
        this.service = service;
    }

    @GetMapping
    public List<MoneyRequestResponse> getRequests(@AuthenticationPrincipal VaultUnitUserDetails user) {
        return service.list(user.getId());
    }

    @PostMapping
    public ResponseEntity<MoneyRequestResponse> createRequest(
            @Valid @RequestBody MoneyRequestCreate body,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        MoneyRequestResponse request = service.create(body, user);
            return ResponseEntity.status(HttpStatus.CREATED).body(request);
    }

    @PostMapping("/{id}/paid")
    public MoneyRequestResponse markPaid(
            @PathVariable Long id,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        return service.markPaid(id, user);
    }

    @PostMapping("/{id}/decline")
    public MoneyRequestResponse decline(
            @PathVariable Long id,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        return service.decline(id, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        service.cancel(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
