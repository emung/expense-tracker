package dev.emung.expensetracker.expense;

/** An expense reduces the balance; a refund (return, cashback) offsets its category's spend. */
public enum EntryType {
    EXPENSE,
    REFUND
}
