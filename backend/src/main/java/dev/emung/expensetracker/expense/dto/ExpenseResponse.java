package dev.emung.expensetracker.expense.dto;

import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.expense.EntryType;
import dev.emung.expensetracker.expense.Expense;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** @param signedAmountRon negative for expenses, positive for refunds - convenient for display */
public record ExpenseResponse(
        Long id,
        LocalDate expenseDate,
        String merchant,
        Long categoryId,
        String categoryName,
        Long accountId,
        String accountName,
        EntryType type,
        BigDecimal originalAmount,
        CurrencyCode originalCurrency,
        BigDecimal fxRate,
        BigDecimal amountRon,
        BigDecimal signedAmountRon,
        String amountExpression,
        String details,
        Instant createdAt,
        Instant updatedAt) {

    /** Must be called inside a transaction: reads the lazy category and account names. */
    public static ExpenseResponse from(Expense expense) {
        BigDecimal signed = expense.getType() == EntryType.EXPENSE ? expense.getAmountRon().negate() : expense.getAmountRon();
        return new ExpenseResponse(
                expense.getId(),
                expense.getExpenseDate(),
                expense.getMerchant(),
                expense.getCategory().getId(),
                expense.getCategory().getName(),
                expense.getAccount().getId(),
                expense.getAccount().getName(),
                expense.getType(),
                expense.getOriginalAmount(),
                expense.getOriginalCurrency(),
                expense.getFxRate(),
                expense.getAmountRon(),
                signed,
                expense.getAmountExpression(),
                expense.getDetails(),
                expense.getCreatedAt(),
                expense.getUpdatedAt());
    }
}
