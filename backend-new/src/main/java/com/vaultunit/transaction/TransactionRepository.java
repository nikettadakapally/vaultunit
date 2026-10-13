package com.vaultunit.transaction;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findAllByUser_IdOrderByDateDescIdDesc(Long userId);

    Optional<Transaction> findByIdAndUser_Id(Long id, Long userId);

    List<Transaction> findByUser_IdAndDateGreaterThanEqualAndDateLessThanAndType(
            Long userId, LocalDate startInclusive, LocalDate endExclusive, TransactionType type);
}
