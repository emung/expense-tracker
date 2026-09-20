package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.money.CurrencyCode;
import dev.emung.expensetracker.expense.dto.ExpenseListResponse;
import dev.emung.expensetracker.expense.dto.ExpenseResponse;
import dev.emung.expensetracker.expense.dto.MerchantSuggestion;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@WebMvcTest(ExpenseController.class)
class ExpenseControllerTest {

    private static final String VALID_EUR_EXPENSE = """
            {"expenseDate":"2026-08-25","merchant":"Carme","categoryId":6,"accountId":1,"type":"EXPENSE",
             "originalAmount":300,"originalCurrency":"EUR","fxRate":5.227133,"amountExpression":"300*5,227133"}
            """;

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ExpenseService service;

    @Test
    void listBindsMonthFiltersPagingAndSort() {
        when(service.list(any(), any())).thenReturn(emptyList());

        MvcTestResult result = mvc.get()
                .uri("/api/expenses?month=2026-08&categoryId=3&accountId=1&type=REFUND&q=penny&page=1&size=20&sort=amountRon,asc")
                .exchange();

        assertThat(result).hasStatusOk();
        var filter = ArgumentCaptor.forClass(ExpenseFilter.class);
        var pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(service).list(filter.capture(), pageable.capture());
        assertThat(filter.getValue()).isEqualTo(new ExpenseFilter(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 9, 1), 3L, 1L, EntryType.REFUND, "penny"));
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort()).containsExactly(Sort.Order.asc("amountRon"), Sort.Order.desc("id"));
    }

    @Test
    void listDefaultsToNewestFirst() {
        when(service.list(any(), any())).thenReturn(emptyList());

        assertThat(mvc.get().uri("/api/expenses")).hasStatusOk();

        var pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(service).list(any(), pageable.capture());
        assertThat(pageable.getValue().getSort()).containsExactly(Sort.Order.desc("expenseDate"), Sort.Order.desc("id"));
        assertThat(pageable.getValue().getPageSize()).isEqualTo(50);
    }

    @Test
    void invalidMonthIs400() {
        MvcTestResult result = mvc.get().uri("/api/expenses?month=2026-13").exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Parametru invalid");
        verifyNoInteractions(service);
    }

    @Test
    void unknownSortIs400WithFieldError() {
        MvcTestResult result = mvc.get().uri("/api/expenses?sort=password").exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("sort");
    }

    @Test
    void monthAndDateRangeTogetherIs400() {
        assertThat(mvc.get().uri("/api/expenses?month=2026-08&from=2026-08-01")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createValidatesRequiredFieldsAndDecimals() {
        MvcTestResult result = mvc.post().uri("/api/expenses")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchant\":\" \",\"originalAmount\":10.555}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.errors[*].field").asArray()
                .contains("expenseDate", "merchant", "categoryId", "accountId", "type", "originalAmount", "originalCurrency");
        verifyNoInteractions(service);
    }

    @Test
    void createReturns201WithLocation() {
        when(service.create(any())).thenReturn(sampleResponse());

        MvcTestResult result = mvc.post().uri("/api/expenses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_EUR_EXPENSE)
                .exchange();

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(result).headers().hasValue("Location", "http://localhost/api/expenses/42");
        assertThat(result).bodyJson().extractingPath("$.amountRon").isEqualTo(1568.14);
        assertThat(result).bodyJson().extractingPath("$.expenseDate").isEqualTo("2026-08-25");
    }

    @Test
    void domainRuleViolationIs400WithField() {
        when(service.create(any())).thenThrow(new BusinessRuleException("fxRate", "Cursul de schimb este obligatoriu pentru EUR."));

        MvcTestResult result = mvc.post().uri("/api/expenses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_EUR_EXPENSE)
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("fxRate");
    }

    @Test
    void merchantSuggestions() {
        when(service.suggestMerchants("pen", 10))
                .thenReturn(List.of(new MerchantSuggestion("Penny", 16, 7L, 1L, new BigDecimal("43.95"), true)));

        MvcTestResult result = mvc.get().uri("/api/expenses/merchants?q=pen").exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().extractingPath("$[0].merchant").isEqualTo("Penny");
        assertThat(result).bodyJson().extractingPath("$[0].lastCategoryId").isEqualTo(7);
        assertThat(result).bodyJson().extractingPath("$[0].lastAmountRon").isEqualTo(43.95);
        assertThat(result).bodyJson().extractingPath("$[0].fromRule").isEqualTo(true);
    }

    private static ExpenseListResponse emptyList() {
        return new ExpenseListResponse(List.of(), 0, 50, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    private static ExpenseResponse sampleResponse() {
        return new ExpenseResponse(42L, LocalDate.of(2026, 8, 25), "Carme", 6L, "Chirie & Utilitati", 1L, "SaltBank",
                EntryType.EXPENSE, new BigDecimal("300.00"), CurrencyCode.EUR, new BigDecimal("5.227133"),
                new BigDecimal("1568.14"), new BigDecimal("-1568.14"), "300*5,227133", null, Instant.now(), Instant.now());
    }
}
