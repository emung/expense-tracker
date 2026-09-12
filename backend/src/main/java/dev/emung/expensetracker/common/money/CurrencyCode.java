package dev.emung.expensetracker.common.money;

/** Supported currencies. RON is the base currency all reports are expressed in. */
public enum CurrencyCode {
    RON,
    EUR;

    public static final CurrencyCode BASE = RON;
}
