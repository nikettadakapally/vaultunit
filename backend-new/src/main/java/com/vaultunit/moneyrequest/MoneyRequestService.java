package com.vaultunit.moneyrequest;

import java.util.List;
import java.util.Locale;

import com.vaultunit.user.User;
import com.vaultunit.user.UserRepository;
import com.vaultunit.user.VaultUnitUserDetails;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MoneyRequestService {

    private final MoneyRequestRepository requests;
    private final UserRepository users;

    public MoneyRequestService(MoneyRequestRepository requests, UserRepository users) {
        this.requests = requests;
        this.users = users;
    }

    @Transactional
    public MoneyRequestResponse create(MoneyRequestCreate body, VaultUnitUserDetails currentUser) {
        String recipientEmail = body.recipientEmail().trim().toLowerCase(Locale.ROOT);
        if (recipientEmail.equals(currentUser.getEmail().toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot request money from yourself.");
        }
        User recipient = users.findByEmail(recipientEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No VaultUnit account was found for that email."));
        String note = body.note() == null ? null : body.note().trim();
        if (note != null && note.isEmpty()) note = null;

        MoneyRequest request = requests.save(new MoneyRequest(
                users.getReferenceById(currentUser.getId()),
                recipient,
                body.amount(),
                body.currency().toUpperCase(Locale.ROOT),
                note));
        return MoneyRequestResponse.from(request, currentUser.getId());
    }

    @Transactional
    public List<MoneyRequestResponse> list(Long currentUserId) {
        return requests.findAllByRequester_IdOrRecipient_IdOrderByCreatedAtDesc(currentUserId, currentUserId).stream()
                .map(request -> MoneyRequestResponse.from(request, currentUserId))
                .toList();
    }

    @Transactional
    public MoneyRequestResponse markPaid(Long requestId, VaultUnitUserDetails currentUser) {
        MoneyRequest request = requireRecipientRequest(requestId, currentUser.getId());
        ensurePending(request);
        request.setStatus(MoneyRequestStatus.PAID);
        return MoneyRequestResponse.from(request, currentUser.getId());
    }

    @Transactional
    public MoneyRequestResponse decline(Long requestId, VaultUnitUserDetails currentUser) {
        MoneyRequest request = requireRecipientRequest(requestId, currentUser.getId());
        ensurePending(request);
        request.setStatus(MoneyRequestStatus.DECLINED);
        return MoneyRequestResponse.from(request, currentUser.getId());
    }

    @Transactional
    public void cancel(Long requestId, Long currentUserId) {
        MoneyRequest request = requests.findByIdAndRequester_Id(requestId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Money request not found."));
        ensurePending(request);
        request.setStatus(MoneyRequestStatus.CANCELLED);
    }

    private MoneyRequest requireRecipientRequest(Long requestId, Long recipientId) {
        return requests.findByIdAndRecipient_Id(requestId, recipientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Money request not found."));
    }

    private void ensurePending(MoneyRequest request) {
        if (request.getStatus() != MoneyRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This money request is no longer pending.");
        }
    }
}
