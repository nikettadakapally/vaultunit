package com.vaultunit.transaction;

import java.net.URI;
import java.util.List;

import com.vaultunit.user.VaultUnitUserDetails;
import com.vaultunit.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository repository;
    private final UserRepository users;

    public TransactionController(TransactionRepository repository, UserRepository users) {
        this.repository = repository;
        this.users = users;
    }

    @GetMapping
    public List<Transaction> getTransactions(@AuthenticationPrincipal VaultUnitUserDetails user) {
        return repository.findAllByUser_IdOrderByDateDescIdDesc(user.getId());
    }

    @PostMapping
    public ResponseEntity<Transaction> createTransaction(
            @Valid @RequestBody TransactionRequest request,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        String currency = request.currency() == null ? "INR" : request.currency().toUpperCase(java.util.Locale.ROOT);
        if (!currency.matches("[A-Z]{3}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Currency must be a three-letter code.");
        }
        if (!"INR".equals(currency) && request.amountInInr() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A normalized INR amount is required for foreign-currency transactions.");
        }
        Transaction transaction = repository.save(new Transaction(
                request.description().trim(),
                request.category().trim(),
                request.type(),
                request.amount(),
                currency,
                request.amountInInr() == null ? request.amount() : request.amountInInr(),
                request.date(),
                request.paymentMethod().trim(),
                users.getReferenceById(user.getId())));
        return ResponseEntity.created(URI.create("/api/transactions/" + transaction.getId())).body(transaction);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        Transaction transaction = repository.findByIdAndUser_Id(id, user.getId()).orElse(null);
        if (transaction == null) {
            return ResponseEntity.notFound().build();
        }
        repository.delete(transaction);
        return ResponseEntity.noContent().build();
    }
}
