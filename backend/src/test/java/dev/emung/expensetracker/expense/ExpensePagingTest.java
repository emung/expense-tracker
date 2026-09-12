package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.common.error.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExpensePagingTest {

    @Test
    void sortsByRequestedFieldWithNewestIdTiebreak() {
        Pageable pageable = ExpensePaging.pageRequest(2, 25, "amountRon,asc");

        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(25);
        assertThat(pageable.getSort()).containsExactly(Sort.Order.asc("amountRon"), Sort.Order.desc("id"));
    }

    @Test
    void directionDefaultsToAscendingAndMerchantIgnoresCase() {
        assertThat(ExpensePaging.pageRequest(0, 50, "merchant").getSort())
                .containsExactly(Sort.Order.asc("merchant").ignoreCase(), Sort.Order.desc("id"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"password", "expenseDate,sideways", "expenseDate,desc,extra", "category.name", ""})
    void rejectsUnknownSorts(String sort) {
        assertThatThrownBy(() -> ExpensePaging.pageRequest(0, 50, sort))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("field").isEqualTo("sort");
    }

    @Test
    void boundsPageAndSize() {
        assertThatThrownBy(() -> ExpensePaging.pageRequest(-1, 50, "expenseDate")).extracting("field").isEqualTo("page");
        assertThatThrownBy(() -> ExpensePaging.pageRequest(0, 0, "expenseDate")).extracting("field").isEqualTo("size");
        assertThatThrownBy(() -> ExpensePaging.pageRequest(0, 201, "expenseDate")).extracting("field").isEqualTo("size");
    }
}
