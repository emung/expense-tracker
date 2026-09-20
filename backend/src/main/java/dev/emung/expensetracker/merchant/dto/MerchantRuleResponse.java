package dev.emung.expensetracker.merchant.dto;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.merchant.MerchantRule;

/**
 * @param hitCount how many expenses have been saved for this merchant
 * @param pinned   set when the rule was edited by hand; pinned rules are never auto-updated
 */
public record MerchantRuleResponse(long id, String merchantKey, long categoryId, String categoryName,
                                   boolean categoryArchived, Long accountId, String accountName,
                                   int hitCount, boolean pinned) {

    public static MerchantRuleResponse from(MerchantRule rule) {
        Category category = rule.getCategory();
        Account account = rule.getAccount();
        return new MerchantRuleResponse(rule.getId(), rule.getMerchantKey(), category.getId(), category.getName(),
                category.isArchived(), account == null ? null : account.getId(), account == null ? null : account.getName(),
                rule.getHitCount(), rule.isPinned());
    }
}
