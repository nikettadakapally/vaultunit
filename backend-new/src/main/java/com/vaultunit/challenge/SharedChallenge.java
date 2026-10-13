package com.vaultunit.challenge;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.vaultunit.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "shared_challenges")
public class SharedChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false)
    private int durationDays;

    @Column(nullable = false)
    private LocalDate startDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "challenge", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ChallengeParticipant> participants = new ArrayList<>();

    protected SharedChallenge() {
    }

    public SharedChallenge(String title, String category, int durationDays, LocalDate startDate, User createdBy) {
        this.title = title;
        this.category = category;
        this.durationDays = durationDays;
        this.startDate = startDate;
        this.createdBy = createdBy;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getCategory() {
        return category;
    }

    public int getDurationDays() {
        return durationDays;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public List<ChallengeParticipant> getParticipants() {
        return participants;
    }

    public void addParticipant(ChallengeParticipant participant) {
        participants.add(participant);
    }
}
