package com.vaultunit.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.vaultunit.transaction.Transaction;
import com.vaultunit.transaction.TransactionRepository;
import com.vaultunit.transaction.TransactionType;
import com.vaultunit.user.VaultUnitUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TransactionRepository repository;
    private final BigDecimal openingBalance;

    public DashboardController(
            TransactionRepository repository,
            @Value("${vaultunit.opening-balance:0.00}") BigDecimal openingBalance) {
        this.repository = repository;
        this.openingBalance = openingBalance;
    }

    @GetMapping
    public DashboardResponse getDashboard(@AuthenticationPrincipal VaultUnitUserDetails user) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate nextMonthStart = monthStart.plusMonths(1);

        List<Transaction> allTransactions = repository.findAllByUser_IdOrderByDateDescIdDesc(user.getId());
        List<Transaction> monthlyExpenses = repository.findByUser_IdAndDateGreaterThanEqualAndDateLessThanAndType(
                user.getId(), monthStart, nextMonthStart, TransactionType.EXPENSE);
        List<Transaction> monthlyIncomeTransactions = repository.findByUser_IdAndDateGreaterThanEqualAndDateLessThanAndType(
                user.getId(), monthStart, nextMonthStart, TransactionType.INCOME);

        BigDecimal totalIncome = sumAmounts(allTransactions, TransactionType.INCOME);
        BigDecimal totalExpenses = sumAmounts(allTransactions, TransactionType.EXPENSE);
        BigDecimal monthlyIncome = monthlyIncomeTransactions.stream()
                .map(Transaction::getAmountInInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlySpending = monthlyExpenses.stream()
                .map(Transaction::getAmountInInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlySavings = monthlyIncome.subtract(monthlySpending);
        Map<String, BigDecimal> categoryTotals = monthlyExpenses.stream()
                .collect(Collectors.groupingBy(
                        Transaction::getCategory,
                        Collectors.mapping(Transaction::getAmountInInr, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        List<DashboardResponse.CategorySpending> categories = categoryTotals.entrySet().stream()
                .map(entry -> new DashboardResponse.CategorySpending(
                        entry.getKey(),
                        entry.getValue(),
                        monthlySpending.signum() == 0
                                ? 0
                                : entry.getValue().multiply(BigDecimal.valueOf(100))
                                        .divide(monthlySpending, 0, java.math.RoundingMode.HALF_UP).intValue()))
                .sorted((left, right) -> right.amount().compareTo(left.amount()))
                .toList();

        return new DashboardResponse(
                openingBalance.add(totalIncome).subtract(totalExpenses),
                monthlySpending,
                monthlyIncome,
                monthlySavings,
                12,
                categories);
    }

    private BigDecimal sumAmounts(List<Transaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(transaction -> transaction.getType() == type)
                .map(Transaction::getAmountInInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
