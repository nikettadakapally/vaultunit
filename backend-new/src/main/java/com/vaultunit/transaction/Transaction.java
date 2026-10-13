package com.vaultunit.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import com.vaultunit.user.User;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String description;

    @Column(nullable = false, length = 40)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3, columnDefinition = "VARCHAR(3) DEFAULT 'INR' NOT NULL")
    private String currency = "INR";

    @Column(precision = 12, scale = 2)
    private BigDecimal amountInInr;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 40)
    private String paymentMethod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    protected Transaction() {
    }

    public Transaction(String description, String category, TransactionType type, BigDecimal amount,
            LocalDate date, String paymentMethod, User user) {
        this(description, category, type, amount, "INR", amount, date, paymentMethod, user);
    }

    public Transaction(String description, String category, TransactionType type, BigDecimal amount,
            String currency, BigDecimal amountInInr, LocalDate date, String paymentMethod, User user) {
        this.description = description;
        this.category = category;
        this.type = type;
        this.amount = amount;
        this.currency = currency;
        this.amountInInr = amountInInr;
        this.date = date;
        this.paymentMethod = paymentMethod;
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public TransactionType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public BigDecimal getAmountInInr() {
        return amountInInr == null && "INR".equals(currency) ? amount : amountInInr;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }
}
