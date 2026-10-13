package com.vaultunit.challenge;

import java.net.URI;
import java.util.List;

import com.vaultunit.user.VaultUnitUserDetails;
import jakarta.validation.Valid;
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
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeService service;

    public ChallengeController(ChallengeService service) {
        this.service = service;
    }

    @GetMapping
    public List<ChallengeResponse> getChallenges(@AuthenticationPrincipal VaultUnitUserDetails user) {
        return service.list(user.getId());
    }

    @PostMapping
    public ResponseEntity<ChallengeResponse> createChallenge(
            @Valid @RequestBody ChallengeRequest request,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        ChallengeResponse challenge = service.create(request, user);
        return ResponseEntity.created(URI.create("/api/challenges/" + challenge.id())).body(challenge);
    }

    @PostMapping("/{id}/join")
    public ChallengeResponse joinChallenge(
            @PathVariable Long id,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        return service.join(id, user);
    }

    @DeleteMapping("/{id}/join")
    public ResponseEntity<Void> leaveChallenge(
            @PathVariable Long id,
            @AuthenticationPrincipal VaultUnitUserDetails user) {
        service.leave(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
