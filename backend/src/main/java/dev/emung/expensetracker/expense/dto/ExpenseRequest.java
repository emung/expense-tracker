package dev.emung.expensetracker.expense.dto;

import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.expense.EntryType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * There is deliberately no {@code amountRon}: the server always computes it.
 *
 * @param originalAmount   positive; the sign is expressed by {@code type}
 * @param fxRate           RON per unit of {@code originalCurrency}; required for EUR, omitted for RON
 * @param amountExpression the arithmetic typed by the user (e.g. {@code -88,74+38.99}), kept for reference
 */
public record ExpenseRequest(
        @NotNull(message = "Data este obligatorie.")
        LocalDate expenseDate,

        @NotBlank(message = "Magazinul este obligatoriu.")
        @Size(max = 200, message = "Magazinul poate avea cel mult 200 de caractere.")
        String merchant,

        @NotNull(message = "Categoria este obligatorie.")
        Long categoryId,

        @NotNull(message = "Contul este obligatoriu.")
        Long accountId,

        @NotNull(message = "Tipul este obligatoriu.")
        EntryType type,

        @NotNull(message = "Suma este obligatorie.")
        @Positive(message = "Suma trebuie să fie mai mare decât zero.")
        @Digits(integer = 10, fraction = 2, message = "Suma poate avea cel mult 2 zecimale.")
        BigDecimal originalAmount,

        @NotNull(message = "Moneda este obligatorie.")
        CurrencyCode originalCurrency,

        @Positive(message = "Cursul de schimb trebuie să fie mai mare decât zero.")
        @Digits(integer = 6, fraction = 6, message = "Cursul de schimb poate avea cel mult 6 zecimale.")
        BigDecimal fxRate,

        @Size(max = 255, message = "Formula poate avea cel mult 255 de caractere.")
        String amountExpression,

        @Size(max = 1000, message = "Detaliile pot avea cel mult 1000 de caractere.")
        String details) {
}
