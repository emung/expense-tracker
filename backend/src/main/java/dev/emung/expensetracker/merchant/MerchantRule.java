package dev.emung.expensetracker.merchant;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Remembers where a merchant's expenses belong, so the same shop is categorised once instead of
 * every time. Rules are learned automatically when an expense is saved; editing one in Setări
 * {@link #isPinned() pins} it, and a pinned rule is never overwritten by later entries.
 */
@Entity
@Table(name = "merchant_rule")
public class MerchantRule extends BaseEntity {

    /** Matched case-insensitively through {@code ux_merchant_rule_key}. */
    @Column(name = "merchant_key", nullable = false, length = 200)
    private String merchantKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** Optional: many merchants are paid from whichever account happens to be handy. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "hit_count", nullable = false)
    private int hitCount;

    @Column(nullable = false)
    private boolean pinned;

    protected MerchantRule() {
    }

    public MerchantRule(String merchantKey, Category category, Account account) {
        this.merchantKey = merchantKey;
        this.category = category;
        this.account = account;
    }

    public String getMerchantKey() {
        return merchantKey;
    }

    public void setMerchantKey(String merchantKey) {
        this.merchantKey = merchantKey;
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

    public int getHitCount() {
        return hitCount;
    }

    public void countHit() {
        hitCount++;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }
}
