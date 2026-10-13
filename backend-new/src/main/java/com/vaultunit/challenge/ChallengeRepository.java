package com.vaultunit.challenge;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeRepository extends JpaRepository<SharedChallenge, Long> {

    @EntityGraph(attributePaths = { "createdBy", "participants", "participants.user" })
    List<SharedChallenge> findAllByOrderByStartDateDescIdDesc();

    @EntityGraph(attributePaths = { "participants" })
    Optional<SharedChallenge> findWithParticipantsById(Long id);

    @EntityGraph(attributePaths = { "participants" })
    Optional<SharedChallenge> findWithParticipantsByIdAndParticipantsUser_Id(Long id, Long userId);
}
