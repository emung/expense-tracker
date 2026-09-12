package dev.emung.expensetracker.report;

import dev.emung.expensetracker.report.dto.CategoryTotal;
import dev.emung.expensetracker.report.dto.MonthlyCategoryReport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@WebMvcTest(ReportController.class)
class ReportControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ReportService service;

    @Test
    void returnsReportForMonth() {
        when(service.monthlyByCategory(YearMonth.of(2026, 8))).thenReturn(new MonthlyCategoryReport(
                YearMonth.of(2026, 8), new BigDecimal("100.00"), new BigDecimal("10.00"), new BigDecimal("90.00"),
                List.of(new CategoryTotal(10L, "Masina", false, new BigDecimal("100.00"), new BigDecimal("10.00"),
                        new BigDecimal("90.00"), new BigDecimal("100.00")))));

        MvcTestResult result = mvc.get().uri("/api/reports/monthly-by-category?month=2026-08").exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().extractingPath("$.month").isEqualTo("2026-08");
        assertThat(result).bodyJson().extractingPath("$.netTotalRon").isEqualTo(90.00);
        assertThat(result).bodyJson().extractingPath("$.categories[0].name").isEqualTo("Masina");
    }

    @Test
    void monthIsRequired() {
        MvcTestResult result = mvc.get().uri("/api/reports/monthly-by-category").exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("month");
        verifyNoInteractions(service);
    }

    @Test
    void malformedMonthIs400() {
        assertThat(mvc.get().uri("/api/reports/monthly-by-category?month=august")).hasStatus(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(service);
    }
}
