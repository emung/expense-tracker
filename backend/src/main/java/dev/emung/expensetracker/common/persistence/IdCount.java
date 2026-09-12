package dev.emung.expensetracker.common.persistence;

/** Projection for "count per foreign key" queries. */
public interface IdCount {

    Long getId();

    long getTotal();
}
