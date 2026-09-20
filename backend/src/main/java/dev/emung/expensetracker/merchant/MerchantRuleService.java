package dev.emung.expensetracker.merchant;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.account.AccountRepository;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.category.CategoryRepository;
import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.common.text.Text;
import dev.emung.expensetracker.merchant.dto.MerchantRuleRequest;
import dev.emung.expensetracker.merchant.dto.MerchantRuleResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MerchantRuleService {

    private final MerchantRuleRepository rules;
    private final CategoryRepository categories;
    private final AccountRepository accounts;

    public MerchantRuleService(MerchantRuleRepository rules, CategoryRepository categories, AccountRepository accounts) {
        this.rules = rules;
        this.categories = categories;
        this.accounts = accounts;
    }

    /**
     * Records what this merchant was filed under. Called whenever an expense is saved, so the next
     * entry for the same shop pre-fills itself.
     */
    @Transactional
    public void learn(String merchant, Category category, Account account) {
        String key = Text.normalizeName(merchant);
        if (key == null || key.isBlank()) {
            return;
        }
        MerchantRule rule = rules.findByMerchantKeyIgnoreCase(key).orElse(null);
        if (rule == null) {
            rule = new MerchantRule(key, category, account);
        } else if (!rule.isPinned()) {
            // A pinned rule keeps what the user chose; an unpinned one follows the latest entry.
            rule.setCategory(category);
            rule.setAccount(account);
        }
        rule.countHit();
        // Flushed, not left to commit: the merchant suggestions are a native query that must see
        // the rule this very transaction just changed.
        rules.saveAndFlush(rule);
    }

    public List<MerchantRuleResponse> list(String query) {
        String needle = Text.blankToNull(query);
        List<MerchantRule> found = needle == null
                ? rules.findByOrderByHitCountDescMerchantKeyAsc()
                : rules.findByMerchantKeyContainingIgnoreCaseOrderByHitCountDescMerchantKeyAsc(needle);
        return found.stream().map(MerchantRuleResponse::from).toList();
    }

    @Transactional
    public MerchantRuleResponse create(MerchantRuleRequest request) {
        String key = Text.normalizeName(request.merchantKey());
        if (rules.existsByMerchantKeyIgnoreCase(key)) {
            throw duplicateKey(key);
        }
        MerchantRule rule = new MerchantRule(key, resolveCategory(request.categoryId()), resolveAccount(request.accountId()));
        rule.setPinned(true);
        return MerchantRuleResponse.from(rules.save(rule));
    }

    /** Editing a rule by hand pins it, so later entries stop moving it. */
    @Transactional
    public MerchantRuleResponse update(long id, MerchantRuleRequest request) {
        MerchantRule rule = find(id);
        String key = Text.normalizeName(request.merchantKey());
        if (rules.existsByMerchantKeyIgnoreCaseAndIdNot(key, id)) {
            throw duplicateKey(key);
        }
        rule.setMerchantKey(key);
        rule.setCategory(resolveCategory(request.categoryId()));
        rule.setAccount(resolveAccount(request.accountId()));
        rule.setPinned(true);
        return MerchantRuleResponse.from(rules.saveAndFlush(rule));
    }

    @Transactional
    public void delete(long id) {
        rules.delete(find(id));
    }

    private MerchantRule find(long id) {
        return rules.findById(id)
                .orElseThrow(() -> new NotFoundException("Regula %d nu există.".formatted(id)));
    }

    /** Unlike expenses, a rule is about future entries, so an archived category is never a valid target. */
    private Category resolveCategory(Long id) {
        Category category = categories.findById(id)
                .orElseThrow(() -> new BusinessRuleException("categoryId", "Categoria selectată nu există."));
        if (category.isArchived()) {
            throw new BusinessRuleException("categoryId", "Categoria „%s” este arhivată.".formatted(category.getName()));
        }
        return category;
    }

    private Account resolveAccount(Long id) {
        if (id == null) {
            return null;
        }
        Account account = accounts.findById(id)
                .orElseThrow(() -> new BusinessRuleException("accountId", "Contul selectat nu există."));
        if (account.isArchived()) {
            throw new BusinessRuleException("accountId", "Contul „%s” este arhivat.".formatted(account.getName()));
        }
        return account;
    }

    private static ConflictException duplicateKey(String key) {
        return new ConflictException("Există deja o regulă pentru „%s”.".formatted(key));
    }
}
