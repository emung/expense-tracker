package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "expense")
public class Expense extends BaseEntity {

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(nullable = false, length = 200)
    private String merchant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 10)
    private EntryType type;

    /** Always positive; the sign is carried by {@link #type}. */
    @Column(name = "original_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalAmount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "original_currency", nullable = false, length = 3)
    private CurrencyCode originalCurrency;

    /** Units of RON per unit of {@link #originalCurrency}; exactly 1 for RON. */
    @Column(name = "fx_rate", nullable = false, precision = 12, scale = 6)
    private BigDecimal fxRate;

    /** Server-computed amount in the base currency (RON). */
    @Column(name = "amount_ron", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountRon;

    /** The arithmetic the user typed, e.g. {@code -88,74+38.99}; informational only. */
    @Column(name = "amount_expression", length = 255)
    private String amountExpression;

    @Column(length = 1000)
    private String details;

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDate expenseDate) {
        this.expenseDate = expenseDate;
    }

    public String getMerchant() {
        return merchant;
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }

    public EntryType getType() {
        return type;
    }

    public void setType(EntryType type) {
        this.type = type;
    }

    public BigDecimal getOriginalAmount() {
        return originalAmount;
    }

    public CurrencyCode getOriginalCurrency() {
        return originalCurrency;
    }

    public BigDecimal getFxRate() {
        return fxRate;
    }

    public BigDecimal getAmountRon() {
        return amountRon;
    }

    /** Amount fields change together so they can never disagree. */
    public void setAmount(BigDecimal originalAmount, CurrencyCode originalCurrency, BigDecimal fxRate, BigDecimal amountRon) {
        this.originalAmount = originalAmount;
        this.originalCurrency = originalCurrency;
        this.fxRate = fxRate;
        this.amountRon = amountRon;
    }

    public String getAmountExpression() {
        return amountExpression;
    }

    public void setAmountExpression(String amountExpression) {
        this.amountExpression = amountExpression;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
