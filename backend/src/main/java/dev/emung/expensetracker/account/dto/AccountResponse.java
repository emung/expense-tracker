package dev.emung.expensetracker.account.dto;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.common.money.CurrencyCode;

/** @param expenseCount lets the UI offer "delete" only for unused accounts */
public record AccountResponse(Long id, String name, CurrencyCode defaultCurrency, int sortOrder, boolean archived, long expenseCount) {

    public static AccountResponse from(Account account, long expenseCount) {
        return new AccountResponse(account.getId(), account.getName(), account.getDefaultCurrency(),
                account.getSortOrder(), account.isArchived(), expenseCount);
    }
}
