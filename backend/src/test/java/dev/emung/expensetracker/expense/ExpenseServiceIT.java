package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.TestcontainersConfiguration;
import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.expense.dto.ExpenseListResponse;
import dev.emung.expensetracker.expense.dto.ExpenseRequest;
import dev.emung.expensetracker.expense.dto.ExpenseResponse;
import dev.emung.expensetracker.expense.dto.MerchantSuggestion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, ExpenseService.class, ExpenseTotalsRepository.class, MerchantQueryRepository.class})
class ExpenseServiceIT {

    private static final LocalDate AUG_1 = LocalDate.of(2026, 8, 1);

    @Autowired
    private ExpenseService service;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void createConvertsEurAndNormalizesText() {
        ExpenseResponse created = service.create(new ExpenseRequest(LocalDate.of(2026, 8, 25), "  Carme ",
                categoryId("Chirie & Utilitati"), accountId("SaltBank"), EntryType.EXPENSE, new BigDecimal("300"),
                CurrencyCode.EUR, new BigDecimal("5.227133"), "300*5,227133", "   "));

        assertThat(created.merchant()).isEqualTo("Carme");
        assertThat(created.amountRon()).isEqualByComparingTo("1568.14");
        assertThat(created.signedAmountRon()).isEqualByComparingTo("-1568.14");
        assertThat(created.fxRate()).isEqualByComparingTo("5.227133");
        assertThat(created.categoryName()).isEqualTo("Chirie & Utilitati");
        assertThat(created.amountExpression()).isEqualTo("300*5,227133");
        assertThat(created.details()).isNull();
    }

    @Test
    void refundIsPositiveWhenSigned() {
        ExpenseResponse refund = service.create(ron(AUG_1, "SaltBank", "Masina", EntryType.REFUND, "10"));

        assertThat(refund.signedAmountRon()).isEqualByComparingTo("10");
    }

    @Test
    void createRejectsRateForRon() {
        var request = new ExpenseRequest(AUG_1, "Penny", categoryId("Consumabile"), accountId("SaltBank"), EntryType.EXPENSE,
                BigDecimal.TEN, CurrencyCode.RON, new BigDecimal("5"), null, null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("fxRate");
    }

    @Test
    void createRejectsArchivedCategoryAndUnknownAccount() {
        jdbc.update("UPDATE category SET archived = true WHERE name = 'Cadouri'");

        assertThatThrownBy(() -> service.create(ron(AUG_1, "Cadou", "Cadouri", EntryType.EXPENSE, "50")))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("categoryId");

        var unknownAccount = new ExpenseRequest(AUG_1, "Penny", categoryId("Consumabile"), 999_999L, EntryType.EXPENSE,
                BigDecimal.TEN, CurrencyCode.RON, null, null, null);
        assertThatThrownBy(() -> service.create(unknownAccount))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("accountId");
    }

    @Test
    void updateMayKeepAnAlreadyArchivedCategoryButNotSwitchToOne() {
        long id = service.create(ron(AUG_1, "Cadou", "Cadouri", EntryType.EXPENSE, "50")).id();
        jdbc.update("UPDATE category SET archived = true WHERE name IN ('Cadouri', 'Scoala')");

        ExpenseResponse updated = service.update(id, ron(AUG_1, "Cadou Sara", "Cadouri", EntryType.EXPENSE, "55"));
        assertThat(updated.amountRon()).isEqualByComparingTo("55");
        assertThat(updated.merchant()).isEqualTo("Cadou Sara");

        assertThatThrownBy(() -> service.update(id, ron(AUG_1, "Cadou Sara", "Scoala", EntryType.EXPENSE, "55")))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("categoryId");
    }

    @Test
    void monthFilterIncludesFirstAndLastDayOnly() {
        service.create(ron(LocalDate.of(2026, 7, 31), "Iulie", "Consumabile", EntryType.EXPENSE, "1"));
        service.create(ron(LocalDate.of(2026, 8, 1), "Inceput", "Consumabile", EntryType.EXPENSE, "1"));
        service.create(ron(LocalDate.of(2026, 8, 31), "Sfarsit", "Consumabile", EntryType.EXPENSE, "1"));
        service.create(ron(LocalDate.of(2026, 9, 1), "Septembrie", "Consumabile", EntryType.EXPENSE, "1"));

        ExpenseListResponse august = list(ExpenseFilter.of(YearMonth.of(2026, 8), null, null, null, null, null, null));

        assertThat(august.content()).extracting(ExpenseResponse::merchant).containsExactly("Sfarsit", "Inceput");
        assertThat(august.totalElements()).isEqualTo(2);
    }

    @Test
    void totalsSplitExpensesAndRefundsAcrossAllPages() {
        service.create(ron(AUG_1, "RomPetrol", "Masina", EntryType.EXPENSE, "524.10"));
        service.create(ron(AUG_1, "Penny", "Consumabile", EntryType.EXPENSE, "43.95"));
        service.create(ron(AUG_1, "SaltBank", "Masina", EntryType.REFUND, "10"));
        service.create(ron(LocalDate.of(2026, 9, 2), "Lidl", "Consumabile", EntryType.EXPENSE, "100"));

        ExpenseListResponse august = service.list(ExpenseFilter.of(YearMonth.of(2026, 8), null, null, null, null, null, null),
                ExpensePaging.pageRequest(0, 1, "expenseDate,desc"));

        assertThat(august.content()).hasSize(1);
        assertThat(august.totalPages()).isEqualTo(3);
        assertThat(august.totalExpenseRon()).isEqualByComparingTo("568.05");
        assertThat(august.totalRefundRon()).isEqualByComparingTo("10.00");
        assertThat(august.netRon()).isEqualByComparingTo("558.05");
    }

    @Test
    void totalsAreZeroWhenNothingMatches() {
        ExpenseListResponse empty = list(ExpenseFilter.of(YearMonth.of(2020, 1), null, null, null, null, null, null));

        assertThat(empty.totalExpenseRon()).isEqualByComparingTo("0");
        assertThat(empty.netRon()).isEqualByComparingTo("0");
    }

    @Test
    void filtersByCategoryAccountAndType() {
        service.create(ron(AUG_1, "RomPetrol", "Masina", EntryType.EXPENSE, "200"));
        service.create(ron(AUG_1, "SaltBank", "Masina", EntryType.REFUND, "10"));
        service.create(ron(AUG_1, "YouTube", "Abonamente", EntryType.EXPENSE, "55", "Revolut"));

        assertThat(list(ExpenseFilter.of(null, null, null, categoryId("Masina"), null, EntryType.REFUND, null)).content())
                .extracting(ExpenseResponse::merchant).containsExactly("SaltBank");
        assertThat(list(ExpenseFilter.of(null, null, null, null, accountId("Revolut"), null, null)).content())
                .extracting(ExpenseResponse::merchant).containsExactly("YouTube");
    }

    @Test
    void searchMatchesMerchantOrDetailsIgnoringCaseAndTreatsWildcardsLiterally() {
        service.create(ron(AUG_1, "Penny", "Consumabile", EntryType.EXPENSE, "10"));
        service.create(new ExpenseRequest(AUG_1, "Lidl", categoryId("Consumabile"), accountId("SaltBank"), EntryType.EXPENSE,
                new BigDecimal("49.75"), CurrencyCode.RON, null, "-88,74+38.99", "38,99 Discuri FLEX"));
        service.create(ron(AUG_1, "100% Natural", "Consumabile", EntryType.EXPENSE, "5"));

        assertThat(search("flex")).extracting(ExpenseResponse::merchant).containsExactly("Lidl");
        assertThat(search("PEN")).extracting(ExpenseResponse::merchant).containsExactly("Penny");
        assertThat(search("%")).extracting(ExpenseResponse::merchant).containsExactly("100% Natural");
    }

    @Test
    void merchantSuggestionsGroupCaseInsensitivelyPreferPrefixAndCarryLastCategory() {
        for (int day = 1; day <= 5; day++) {
            service.create(ron(AUG_1.plusDays(day), "Spenders", "Altele", EntryType.EXPENSE, "1"));
        }
        service.create(ron(AUG_1, "Penny", "Consumabile", EntryType.EXPENSE, "1"));
        service.create(ron(AUG_1.plusDays(1), "penny", "Consumabile", EntryType.EXPENSE, "1"));
        service.create(ron(AUG_1.plusDays(2), "Penny", "Restaurant", EntryType.EXPENSE, "1", "Revolut"));

        var suggestions = service.suggestMerchants("pen", 10);

        assertThat(suggestions).extracting(MerchantSuggestion::merchant).containsExactly("Penny", "Spenders");
        assertThat(suggestions.getFirst().uses()).isEqualTo(3);
        assertThat(suggestions.getFirst().lastCategoryId()).isEqualTo(categoryId("Restaurant"));
        assertThat(suggestions.getFirst().lastAccountId()).isEqualTo(accountId("Revolut"));
        assertThat(service.suggestMerchants("", 1)).extracting(MerchantSuggestion::merchant).containsExactly("Spenders");
    }

    @Test
    void deleteRemovesExpense() {
        long id = service.create(ron(AUG_1, "Penny", "Consumabile", EntryType.EXPENSE, "10")).id();

        service.delete(id);

        assertThatThrownBy(() -> service.get(id)).isInstanceOf(NotFoundException.class);
    }

    private ExpenseListResponse list(ExpenseFilter filter) {
        return service.list(filter, ExpensePaging.pageRequest(0, 50, "expenseDate,desc"));
    }

    private java.util.List<ExpenseResponse> search(String query) {
        return list(ExpenseFilter.of(null, null, null, null, null, null, query)).content();
    }

    private ExpenseRequest ron(LocalDate date, String merchant, String category, EntryType type, String amount) {
        return ron(date, merchant, category, type, amount, "SaltBank");
    }

    private ExpenseRequest ron(LocalDate date, String merchant, String category, EntryType type, String amount, String account) {
        return new ExpenseRequest(date, merchant, categoryId(category), accountId(account), type, new BigDecimal(amount),
                CurrencyCode.RON, null, null, null);
    }

    private long categoryId(String name) {
        return jdbc.queryForObject("SELECT id FROM category WHERE name = ?", Long.class, name);
    }

    private long accountId(String name) {
        return jdbc.queryForObject("SELECT id FROM account WHERE name = ?", Long.class, name);
    }
}
