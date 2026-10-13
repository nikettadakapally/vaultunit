package com.vaultunit.moneyrequest;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MoneyRequestRepository extends JpaRepository<MoneyRequest, Long> {

    @EntityGraph(attributePaths = { "requester", "recipient" })
    List<MoneyRequest> findAllByRequester_IdOrRecipient_IdOrderByCreatedAtDesc(
            Long requesterId, Long recipientId);

    @EntityGraph(attributePaths = { "requester", "recipient" })
    Optional<MoneyRequest> findByIdAndRecipient_Id(Long id, Long recipientId);

    @EntityGraph(attributePaths = { "requester", "recipient" })
    Optional<MoneyRequest> findByIdAndRequester_Id(Long id, Long requesterId);
}
