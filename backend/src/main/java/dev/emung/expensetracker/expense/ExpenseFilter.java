package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.text.Text;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Normalized list filter. Dates form a half-open range {@code [from, toExclusive)}; every field is optional.
 */
public record ExpenseFilter(LocalDate from, LocalDate toExclusive, Long categoryId, Long accountId, EntryType type, String query) {

    public static ExpenseFilter none() {
        return new ExpenseFilter(null, null, null, null, null, null);
    }

    /**
     * @param month a whole calendar month, or
     * @param from  inclusive start date, and/or
     * @param to    inclusive end date
     */
    public static ExpenseFilter of(YearMonth month, LocalDate from, LocalDate to,
                                   Long categoryId, Long accountId, EntryType type, String query) {
        if (month != null && (from != null || to != null)) {
            throw new BusinessRuleException("month", "Folosiți fie luna, fie intervalul de date, nu ambele.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessRuleException("from", "Data de început este după data de sfârșit.");
        }
        LocalDate start = month != null ? month.atDay(1) : from;
        LocalDate endExclusive = month != null ? month.plusMonths(1).atDay(1) : to != null ? to.plusDays(1) : null;
        return new ExpenseFilter(start, endExclusive, categoryId, accountId, type, Text.blankToNull(query));
    }
}
