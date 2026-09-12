package dev.emung.expensetracker.expense.dto;

/**
 * @param merchant       spelling used most recently
 * @param uses           how many expenses use this merchant (case-insensitive)
 * @param lastCategoryId category of the most recent expense, to pre-fill the form
 * @param lastAccountId  account of the most recent expense, to pre-fill the form
 */
public record MerchantSuggestion(String merchant, long uses, Long lastCategoryId, Long lastAccountId) {
}
