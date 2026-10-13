package com.vaultunit.challenge;

import java.time.LocalDate;

import com.vaultunit.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "challenge_participants", uniqueConstraints = {
        @UniqueConstraint(name = "uk_challenge_participant", columnNames = { "challenge_id", "user_id" })
})
public class ChallengeParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "challenge_id", nullable = false)
    private SharedChallenge challenge;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate joinedOn;

    protected ChallengeParticipant() {
    }

    public ChallengeParticipant(SharedChallenge challenge, User user, LocalDate joinedOn) {
        this.challenge = challenge;
        this.user = user;
        this.joinedOn = joinedOn;
    }

    public Long getId() {
        return id;
    }

    public SharedChallenge getChallenge() {
        return challenge;
    }

    public User getUser() {
        return user;
    }

    public LocalDate getJoinedOn() {
        return joinedOn;
    }
}
