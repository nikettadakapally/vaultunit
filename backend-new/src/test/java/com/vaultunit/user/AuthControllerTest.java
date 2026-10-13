package com.vaultunit.user;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vaultunit.challenge.ChallengeRepository;
import com.vaultunit.moneyrequest.MoneyRequestRepository;
import com.vaultunit.transaction.TransactionRepository;
import java.time.LocalDate;
import java.util.Map;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vaultunit-auth-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "vaultunit.opening-balance=0.00"
})
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private TransactionRepository transactions;

    @Autowired
    private ChallengeRepository challenges;

    @Autowired
    private MoneyRequestRepository moneyRequests;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void clearDatabase() {
        moneyRequests.deleteAll();
        challenges.deleteAll();
        transactions.deleteAll();
        users.deleteAll();
    }

    @Test
    void registrationCreatesAnAccountAndKeepsItsTransactionsPrivate() throws Exception {
        Cookie firstUserSession = register("Riley", "RILEY@example.com");

        mockMvc.perform(get("/api/auth/me").cookie(firstUserSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("riley@example.com"))
                .andExpect(jsonPath("$.homeCurrency").value("INR"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        MvcResult transactionResult = mockMvc.perform(post("/api/transactions")
                        .cookie(firstUserSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Private groceries",
                                "category", "Food",
                                "type", "EXPENSE",
                                "amount", 24.50,
                                "date", "2026-10-10",
                                "paymentMethod", "UPI"))))
                .andExpect(status().isCreated())
                .andReturn();
        long transactionId = objectMapper.readTree(transactionResult.getResponse().getContentAsString())
                .get("id")
                .asLong();

        Cookie secondUserSession = register("Casey", "casey@example.com");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/transactions/{id}", transactionId)
                        .cookie(secondUserSession)
                        .with(csrf()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/transactions").cookie(secondUserSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/transactions").cookie(firstUserSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        User savedUser = users.findByEmail("riley@example.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotEquals("SafePass123!", savedUser.getPasswordHash());
        org.junit.jupiter.api.Assertions.assertEquals(2, users.count());
        org.junit.jupiter.api.Assertions.assertEquals(1, transactions.count());
    }

    @Test
    void duplicateRegistrationAndIncorrectLoginAreRejected() throws Exception {
        register("Riley", "riley@example.com");

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Another Riley",
                                "email", "RILEY@example.com",
                                "password", "AnotherPass123!"))))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "riley@example.com",
                                "password", "not-the-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password."));

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "unknown@example.com",
                                "password", "not-the-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password."));
    }

    @Test
    void anExistingAccountCanSignInAndSignOut() throws Exception {
        register("Riley", "riley@example.com");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "RILEY@example.com",
                                "password", "SafePass123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("riley@example.com"))
                .andReturn();

        Cookie session = loginResult.getResponse().getCookie("SESSION");
        org.junit.jupiter.api.Assertions.assertNotNull(session);
        mockMvc.perform(get("/api/auth/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Riley"));

        mockMvc.perform(post("/api/auth/logout").cookie(session).with(csrf()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/auth/me").cookie(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void financeEndpointsRequireAnAuthenticatedAccount() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/transactions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void currencyPreferenceAndForeignTransactionsAreNormalizedToInr() throws Exception {
        Cookie session = register("Riley", "riley@example.com");

        mockMvc.perform(post("/api/transactions")
                        .cookie(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Lunch in New York",
                                "category", "Food",
                                "type", "EXPENSE",
                                "amount", 15,
                                "currency", "USD",
                                "amountInInr", 1242.50,
                                "date", "2026-10-10",
                                "paymentMethod", "Card"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.amountInInr").value(1242.50));

        mockMvc.perform(get("/api/dashboard").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlySpending").value(1242.50));

        mockMvc.perform(patch("/api/auth/preferences")
                        .cookie(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("homeCurrency", "USD"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.homeCurrency").value("USD"));
    }

    @Test
    void usersCanJoinSharedChallengesAndOnlyTheirOwnExpensesAffectProgress() throws Exception {
        Cookie creatorSession = register("Riley", "riley@example.com");
        MvcResult createResult = mockMvc.perform(post("/api/challenges")
                        .cookie(creatorSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "7-day no-eating-out challenge",
                                "category", "Food",
                                "durationDays", 7))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantCount").value(1))
                .andExpect(jsonPath("$.participants[0].daysCompleted").value(1))
                .andExpect(jsonPath("$.participants[0].badge").value("Off to a great start"))
                .andExpect(jsonPath("$.participants[0].amount").doesNotExist())
                .andReturn();
        long challengeId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id")
                .asLong();

        Cookie secondUserSession = register("Casey", "casey@example.com");
        mockMvc.perform(post("/api/challenges/{id}/join", challengeId)
                        .cookie(secondUserSession)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participantCount").value(2))
                .andExpect(jsonPath("$.joinedByMe").value(true));

        mockMvc.perform(post("/api/transactions")
                        .cookie(secondUserSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Lunch",
                                "category", "Food",
                                "type", "EXPENSE",
                                "amount", 22,
                                "date", LocalDate.now().toString(),
                                "paymentMethod", "UPI"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/challenges").cookie(secondUserSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].participantCount").value(2))
                .andExpect(jsonPath("$[0].participants[0].name").value("Riley"))
                .andExpect(jsonPath("$[0].participants[1].name").value("Casey"))
                .andExpect(jsonPath("$[0].participants[1].daysCompleted").value(0))
                .andExpect(jsonPath("$[0].participants[1].currentStreak").value(0));

        mockMvc.perform(post("/api/challenges/{id}/join", challengeId)
                        .cookie(secondUserSession)
                        .with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    void usersCanCreateAndManageMoneyRequestsWithCorrectPermissions() throws Exception {
        Cookie requester = register("Riley", "riley@example.com");
        Cookie recipient = register("Casey", "casey@example.com");

        MvcResult created = mockMvc.perform(post("/api/money-requests")
                        .cookie(requester)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "recipientEmail", "CASEY@example.com",
                                "amount", 52.50,
                                "currency", "usd",
                                "note", "Dinner last Friday"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requesterName").value("Riley"))
                .andExpect(jsonPath("$.recipientEmail").value("casey@example.com"))
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requestedByMe").value(true))
                .andReturn();
        long requestId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/money-requests").cookie(recipient))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].requestedByMe").value(false))
                .andExpect(jsonPath("$[0].note").value("Dinner last Friday"));

        mockMvc.perform(post("/api/money-requests/{id}/paid", requestId)
                        .cookie(requester)
                        .with(csrf()))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/money-requests/{id}/paid", requestId)
                        .cookie(recipient)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));

        mockMvc.perform(get("/api/money-requests").cookie(requester))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PAID"));

        MvcResult declineRequest = mockMvc.perform(post("/api/money-requests")
                        .cookie(requester)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "recipientEmail", "casey@example.com",
                                "amount", 10,
                                "currency", "INR"))))
                .andExpect(status().isCreated())
                .andReturn();
        long declineRequestId = objectMapper.readTree(declineRequest.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/money-requests/{id}/decline", declineRequestId)
                        .cookie(recipient)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DECLINED"));

        mockMvc.perform(post("/api/money-requests/{id}/paid", declineRequestId)
                        .cookie(recipient)
                        .with(csrf()))
                .andExpect(status().isConflict());

        MvcResult cancelRequest = mockMvc.perform(post("/api/money-requests")
                        .cookie(requester)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "recipientEmail", "casey@example.com",
                                "amount", 1,
                                "currency", "EUR"))))
                .andExpect(status().isCreated())
                .andReturn();
        long cancelRequestId = objectMapper.readTree(cancelRequest.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/api/money-requests/{id}", cancelRequestId)
                        .cookie(recipient)
                        .with(csrf()))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/money-requests/{id}", cancelRequestId)
                        .cookie(requester)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/money-requests/{id}", cancelRequestId)
                        .cookie(requester)
                        .with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    void moneyRequestsRejectUnknownUsersSelfRequestsAndMissingAmounts() throws Exception {
        Cookie requester = register("Riley", "riley@example.com");

        mockMvc.perform(post("/api/money-requests")
                        .cookie(requester)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "recipientEmail", "unknown@example.com",
                                "amount", 5,
                                "currency", "INR"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/money-requests")
                        .cookie(requester)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "recipientEmail", "riley@example.com",
                                "amount", 5,
                                "currency", "INR"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/money-requests")
                        .cookie(requester)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "recipientEmail", "riley@example.com",
                                "currency", "INR"))))
                .andExpect(status().isBadRequest());
    }

    private Cookie register(String name, String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "email", email,
                                "password", "SafePass123!"))))
                .andExpect(status().isCreated())
                .andReturn();
        Cookie session = result.getResponse().getCookie("SESSION");
        org.junit.jupiter.api.Assertions.assertNotNull(session);
        org.junit.jupiter.api.Assertions.assertTrue(session.isHttpOnly());
        org.junit.jupiter.api.Assertions.assertTrue(session.getMaxAge() > 0);
        return session;
    }
}
