package com.vaultunit.challenge;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import com.vaultunit.transaction.Transaction;
import com.vaultunit.transaction.TransactionRepository;
import com.vaultunit.transaction.TransactionType;
import com.vaultunit.user.User;
import com.vaultunit.user.UserRepository;
import com.vaultunit.user.VaultUnitUserDetails;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChallengeService {

    private final ChallengeRepository challenges;
    private final ChallengeParticipantRepository participants;
    private final TransactionRepository transactions;
    private final UserRepository users;

    public ChallengeService(
            ChallengeRepository challenges,
            ChallengeParticipantRepository participants,
            TransactionRepository transactions,
            UserRepository users) {
        this.challenges = challenges;
        this.participants = participants;
        this.transactions = transactions;
        this.users = users;
    }

    @Transactional
    public ChallengeResponse create(ChallengeRequest request, VaultUnitUserDetails currentUser) {
        LocalDate today = LocalDate.now();
        User creator = users.getReferenceById(currentUser.getId());
        SharedChallenge challenge = challenges.save(new SharedChallenge(
                request.title().trim(),
                normalizeCategory(request.category()),
                request.durationDays(),
                today,
                creator));
        ChallengeParticipant participant = new ChallengeParticipant(challenge, creator, today);
        participants.save(participant);
        challenge.addParticipant(participant);
        return getChallenge(challenge.getId(), currentUser.getId());
    }

    @Transactional
    public List<ChallengeResponse> list(Long currentUserId) {
        return challenges.findAllByOrderByStartDateDescIdDesc().stream()
                .map(challenge -> toResponse(challenge, currentUserId))
                .toList();
    }

    @Transactional
    public ChallengeResponse join(Long challengeId, VaultUnitUserDetails currentUser) {
        SharedChallenge challenge = challenges.findWithParticipantsById(challengeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Challenge not found."));
        LocalDate today = LocalDate.now();
        if (today.isAfter(challenge.getStartDate().plusDays(challenge.getDurationDays() - 1L))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This challenge has already ended.");
        }
        if (participants.existsByChallenge_IdAndUser_Id(challengeId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already joined this challenge.");
        }
        ChallengeParticipant participant = new ChallengeParticipant(
                challenge,
                users.getReferenceById(currentUser.getId()),
                today);
        participants.save(participant);
        challenge.addParticipant(participant);
        return getChallenge(challengeId, currentUser.getId());
    }

    @Transactional
    public void leave(Long challengeId, Long currentUserId) {
        ChallengeParticipant participant = participants.findByChallenge_IdAndUser_Id(challengeId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "You are not a participant in this challenge."));
        participants.delete(participant);
    }

    private ChallengeResponse getChallenge(Long challengeId, Long currentUserId) {
        SharedChallenge challenge = challenges.findWithParticipantsById(challengeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Challenge not found."));
        return toResponse(challenge, currentUserId);
    }

    private ChallengeResponse toResponse(SharedChallenge challenge, Long currentUserId) {
        LocalDate today = LocalDate.now();
        LocalDate endDate = challenge.getStartDate().plusDays(challenge.getDurationDays() - 1L);
        List<ChallengeResponse.ParticipantProgress> progress = challenge.getParticipants().stream()
                .map(participant -> participantProgress(challenge, participant, today))
                .sorted((left, right) -> Integer.compare(right.currentStreak(), left.currentStreak()))
                .toList();
        boolean joinedByMe = challenge.getParticipants().stream()
                .anyMatch(participant -> participant.getUser().getId().equals(currentUserId));
        return new ChallengeResponse(
                challenge.getId(),
                challenge.getTitle(),
                challenge.getCategory(),
                challenge.getDurationDays(),
                challenge.getStartDate(),
                endDate,
                challenge.getCreatedBy().getName(),
                progress.size(),
                joinedByMe,
                !today.isAfter(endDate),
                progress);
    }

    private ChallengeResponse.ParticipantProgress participantProgress(
            SharedChallenge challenge,
            ChallengeParticipant participant,
            LocalDate today) {
        LocalDate start = participant.getJoinedOn().isAfter(challenge.getStartDate())
                ? participant.getJoinedOn()
                : challenge.getStartDate();
        LocalDate end = challenge.getStartDate().plusDays(challenge.getDurationDays() - 1L);
        if (today.isBefore(end)) end = today;

        int daysCompleted = 0;
        int currentStreak = 0;
        if (!end.isBefore(start)) {
            List<Transaction> expenses = transactions.findByUser_IdAndDateGreaterThanEqualAndDateLessThanAndType(
                    participant.getUser().getId(), start, end.plusDays(1), TransactionType.EXPENSE);
            for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                LocalDate currentDate = date;
                boolean spent = expenses.stream()
                        .anyMatch(expense -> expense.getDate().equals(currentDate)
                                && (isAllCategories(challenge.getCategory())
                                        || expense.getCategory().equalsIgnoreCase(challenge.getCategory())));
                if (!spent) {
                    daysCompleted++;
                    currentStreak++;
                } else {
                    currentStreak = 0;
                }
            }
        }

        int progressPercent = (int) Math.round(daysCompleted * 100.0 / challenge.getDurationDays());
        String badge = daysCompleted >= challenge.getDurationDays() ? "Challenge champion"
                : currentStreak >= 3 ? currentStreak + "-day streak"
                        : daysCompleted >= Math.ceil(challenge.getDurationDays() / 2.0) ? "Halfway hero"
                                : daysCompleted > 0 ? "Off to a great start" : "Challenge joined";
        return new ChallengeResponse.ParticipantProgress(
                participant.getUser().getId(),
                participant.getUser().getName(),
                participant.getJoinedOn(),
                daysCompleted,
                currentStreak,
                Math.min(progressPercent, 100),
                badge);
    }

    private boolean isAllCategories(String category) {
        return "ALL".equalsIgnoreCase(category);
    }

    private String normalizeCategory(String category) {
        String value = category.trim();
        return "ALL".equalsIgnoreCase(value) ? "ALL" : value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1).toLowerCase(Locale.ROOT);
    }
}
