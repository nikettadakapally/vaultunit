package com.vaultunit.challenge;

import java.time.LocalDate;
import java.util.List;

public record ChallengeResponse(
        Long id,
        String title,
        String category,
        int durationDays,
        LocalDate startDate,
        LocalDate endDate,
        String creatorName,
        int participantCount,
        boolean joinedByMe,
        boolean active,
        List<ParticipantProgress> participants) {

    public record ParticipantProgress(
            Long userId,
            String name,
            LocalDate joinedOn,
            int daysCompleted,
            int currentStreak,
            int progressPercent,
            String badge) {
    }
}
