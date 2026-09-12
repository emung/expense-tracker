package dev.emung.expensetracker.account;

import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "account")
public class Account extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "default_currency", nullable = false, length = 3)
    private CurrencyCode defaultCurrency = CurrencyCode.BASE;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean archived;

    protected Account() {
    }

    public Account(String name, CurrencyCode defaultCurrency, int sortOrder) {
        this.name = name;
        this.defaultCurrency = defaultCurrency;
        this.sortOrder = sortOrder;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CurrencyCode getDefaultCurrency() {
        return defaultCurrency;
    }

    public void setDefaultCurrency(CurrencyCode defaultCurrency) {
        this.defaultCurrency = defaultCurrency;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
