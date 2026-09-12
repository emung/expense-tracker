package dev.emung.expensetracker.account;

import dev.emung.expensetracker.account.dto.AccountRequest;
import dev.emung.expensetracker.account.dto.AccountResponse;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.common.persistence.IdCount;
import dev.emung.expensetracker.common.text.Text;
import dev.emung.expensetracker.expense.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AccountService {

    private static final int SORT_STEP = 10;

    private final AccountRepository accounts;
    private final ExpenseRepository expenses;

    public AccountService(AccountRepository accounts, ExpenseRepository expenses) {
        this.accounts = accounts;
        this.expenses = expenses;
    }

    public List<AccountResponse> list(boolean includeArchived) {
        List<Account> result = includeArchived
                ? accounts.findAllByOrderBySortOrderAscNameAsc()
                : accounts.findByArchivedFalseOrderBySortOrderAscNameAsc();
        Map<Long, Long> counts = expenses.countPerAccount().stream()
                .collect(Collectors.toMap(IdCount::getId, IdCount::getTotal));
        return result.stream()
                .map(account -> AccountResponse.from(account, counts.getOrDefault(account.getId(), 0L)))
                .toList();
    }

    public AccountResponse get(long id) {
        return AccountResponse.from(find(id), expenses.countByAccountId(id));
    }

    @Transactional
    public AccountResponse create(AccountRequest request) {
        String name = Text.normalizeName(request.name());
        if (accounts.existsByNameIgnoreCase(name)) {
            throw duplicateName(name);
        }
        CurrencyCode currency = request.defaultCurrency() != null ? request.defaultCurrency() : CurrencyCode.BASE;
        int sortOrder = request.sortOrder() != null ? request.sortOrder() : accounts.maxSortOrder() + SORT_STEP;
        Account account = new Account(name, currency, sortOrder);
        account.setArchived(Boolean.TRUE.equals(request.archived()));
        return AccountResponse.from(accounts.save(account), 0);
    }

    @Transactional
    public AccountResponse update(long id, AccountRequest request) {
        Account account = find(id);
        String name = Text.normalizeName(request.name());
        if (accounts.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw duplicateName(name);
        }
        account.setName(name);
        if (request.defaultCurrency() != null) {
            account.setDefaultCurrency(request.defaultCurrency());
        }
        if (request.sortOrder() != null) {
            account.setSortOrder(request.sortOrder());
        }
        if (request.archived() != null) {
            account.setArchived(request.archived());
        }
        return AccountResponse.from(account, expenses.countByAccountId(id));
    }

    @Transactional
    public void delete(long id) {
        Account account = find(id);
        long used = expenses.countByAccountId(id);
        if (used > 0) {
            throw new ConflictException("Contul „%s” este folosit de %s. Arhivați-l în loc să îl ștergeți."
                    .formatted(account.getName(), Text.countLabel(used, "cheltuială", "cheltuieli")));
        }
        accounts.delete(account);
    }

    public Account find(long id) {
        return accounts.findById(id)
                .orElseThrow(() -> new NotFoundException("Contul %d nu există.".formatted(id)));
    }

    private static ConflictException duplicateName(String name) {
        return new ConflictException("Există deja un cont cu numele „%s”.".formatted(name));
    }
}
