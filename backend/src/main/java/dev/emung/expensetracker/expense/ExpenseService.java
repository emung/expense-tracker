package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.account.Account;
import dev.emung.expensetracker.account.AccountRepository;
import dev.emung.expensetracker.category.Category;
import dev.emung.expensetracker.category.CategoryRepository;
import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.common.money.MoneyCalculator;
import dev.emung.expensetracker.common.text.Text;
import dev.emung.expensetracker.expense.dto.ExpenseListResponse;
import dev.emung.expensetracker.expense.dto.ExpenseRequest;
import dev.emung.expensetracker.expense.dto.ExpenseResponse;
import dev.emung.expensetracker.expense.dto.MerchantSuggestion;
import dev.emung.expensetracker.merchant.MerchantRuleService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ExpenseService {

    static final int MAX_SUGGESTIONS = 50;

    private final ExpenseRepository expenses;
    private final ExpenseTotalsRepository totals;
    private final MerchantQueryRepository merchants;
    private final CategoryRepository categories;
    private final AccountRepository accounts;
    private final MerchantRuleService merchantRules;

    public ExpenseService(ExpenseRepository expenses, ExpenseTotalsRepository totals, MerchantQueryRepository merchants,
                          CategoryRepository categories, AccountRepository accounts, MerchantRuleService merchantRules) {
        this.expenses = expenses;
        this.totals = totals;
        this.merchants = merchants;
        this.categories = categories;
        this.accounts = accounts;
        this.merchantRules = merchantRules;
    }

    public ExpenseListResponse list(ExpenseFilter filter, Pageable pageable) {
        Specification<Expense> specification = ExpenseSpecifications.matching(filter);
        var page = expenses.findAll(specification, pageable).map(ExpenseResponse::from);
        return ExpenseListResponse.of(page, totals.totals(specification));
    }

    public ExpenseResponse get(long id) {
        return ExpenseResponse.from(find(id));
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest request) {
        Expense expense = new Expense();
        apply(expense, request);
        return ExpenseResponse.from(expenses.save(expense));
    }

    @Transactional
    public ExpenseResponse update(long id, ExpenseRequest request) {
        Expense expense = find(id);
        apply(expense, request);
        return ExpenseResponse.from(expenses.saveAndFlush(expense));
    }

    @Transactional
    public void delete(long id) {
        expenses.delete(find(id));
    }

    public List<MerchantSuggestion> suggestMerchants(String query, int limit) {
        return merchants.suggest(query, Math.clamp(limit, 1, MAX_SUGGESTIONS));
    }

    private Expense find(long id) {
        return expenses.findById(id)
                .orElseThrow(() -> new NotFoundException("Cheltuiala %d nu există.".formatted(id)));
    }

    private void apply(Expense expense, ExpenseRequest request) {
        Category category = resolveCategory(request.categoryId(), expense.getCategory());
        Account account = resolveAccount(request.accountId(), expense.getAccount());
        var amount = MoneyCalculator.toBase(request.originalAmount(), request.originalCurrency(), request.fxRate());

        expense.setExpenseDate(request.expenseDate());
        expense.setMerchant(Text.normalizeName(request.merchant()));
        expense.setCategory(category);
        expense.setAccount(account);
        expense.setType(request.type());
        expense.setAmount(amount.originalAmount(), amount.currency(), amount.fxRate(), amount.amountRon());
        expense.setAmountExpression(Text.blankToNull(request.amountExpression()));
        expense.setDetails(Text.blankToNull(request.details()));

        // Remember the choice so the next entry for this merchant fills itself in.
        merchantRules.learn(expense.getMerchant(), category, account);
    }

    /** Archived categories can't be chosen for new data, but an expense may keep the one it already has. */
    private Category resolveCategory(Long id, Category current) {
        Category category = categories.findById(id)
                .orElseThrow(() -> new BusinessRuleException("categoryId", "Categoria selectată nu există."));
        if (category.isArchived() && (current == null || !current.getId().equals(category.getId()))) {
            throw new BusinessRuleException("categoryId", "Categoria „%s” este arhivată.".formatted(category.getName()));
        }
        return category;
    }

    private Account resolveAccount(Long id, Account current) {
        Account account = accounts.findById(id)
                .orElseThrow(() -> new BusinessRuleException("accountId", "Contul selectat nu există."));
        if (account.isArchived() && (current == null || !current.getId().equals(account.getId()))) {
            throw new BusinessRuleException("accountId", "Contul „%s” este arhivat.".formatted(account.getName()));
        }
        return account;
    }
}
