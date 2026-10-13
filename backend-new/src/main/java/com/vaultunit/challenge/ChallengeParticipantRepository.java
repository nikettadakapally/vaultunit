package com.vaultunit.challenge;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChallengeParticipantRepository extends JpaRepository<ChallengeParticipant, Long> {
    boolean existsByChallenge_IdAndUser_Id(Long challengeId, Long userId);

    Optional<ChallengeParticipant> findByChallenge_IdAndUser_Id(Long challengeId, Long userId);
}
