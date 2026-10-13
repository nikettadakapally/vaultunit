package com.vaultunit.dashboard;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        BigDecimal totalBalance,
        BigDecimal monthlySpending,
        BigDecimal monthlyIncome,
        BigDecimal monthlySavings,
        int balanceChange,
        List<CategorySpending> spendingByCategory) {

    public record CategorySpending(String category, BigDecimal amount, int percentage) {
    }
}
