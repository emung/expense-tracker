package dev.emung.expensetracker.expense.dto;

import java.math.BigDecimal;

/**
 * @param merchant       spelling used most recently
 * @param uses           how many expenses use this merchant (case-insensitive)
 * @param lastCategoryId category to pre-fill: the merchant's rule when it has one, otherwise the most recent expense's
 * @param lastAccountId  account to pre-fill, resolved the same way
 * @param lastAmountRon  the most recent amount in lei, shown as a hint but never pre-filled
 * @param fromRule       true when a saved rule decided the category, rather than the last entry
 */
public record MerchantSuggestion(String merchant, long uses, Long lastCategoryId, Long lastAccountId,
                                 BigDecimal lastAmountRon, boolean fromRule) {
}
