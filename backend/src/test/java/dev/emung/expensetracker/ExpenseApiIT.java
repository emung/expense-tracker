package dev.emung.expensetracker;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

/** Full application against a real database: create entries over HTTP, then read them back through the report. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ExpenseApiIT {

    /** A month no other test uses, since this context commits its data. */
    private static final String MONTH = "2031-01";

    @Autowired
    private MockMvcTester mvc;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void eurRentAndFuelRefundFlowIntoTheMonthlyReport() {
        long rent = categoryId("Chirie & Utilitati");
        long car = categoryId("Masina");
        long saltBank = jdbc.queryForObject("SELECT id FROM account WHERE name = 'SaltBank'", Long.class);

        post("""
                {"expenseDate":"%s-25","merchant":"Carme","categoryId":%d,"accountId":%d,"type":"EXPENSE",
                 "originalAmount":300,"originalCurrency":"EUR","fxRate":5.227133}
                """.formatted(MONTH, rent, saltBank));
        post("""
                {"expenseDate":"%s-01","merchant":"RomPetrol","categoryId":%d,"accountId":%d,"type":"EXPENSE",
                 "originalAmount":524.10,"originalCurrency":"RON","amountExpression":"524,10"}
                """.formatted(MONTH, car, saltBank));
        post("""
                {"expenseDate":"%s-04","merchant":"SaltBank","categoryId":%d,"accountId":%d,"type":"REFUND",
                 "originalAmount":10,"originalCurrency":"RON","details":"Cashback motorina"}
                """.formatted(MONTH, car, saltBank));

        MvcTestResult report = mvc.get().uri("/api/reports/monthly-by-category?month=" + MONTH).exchange();

        assertThat(report).hasStatusOk();
        assertThat(report).bodyJson().extractingPath("$.totalExpenseRon").isEqualTo(2092.24);
        assertThat(report).bodyJson().extractingPath("$.totalRefundRon").isEqualTo(10.00);
        assertThat(report).bodyJson().extractingPath("$.netTotalRon").isEqualTo(2082.24);
        assertThat(report).bodyJson().extractingPath("$.categories[0].name").isEqualTo("Chirie & Utilitati");
        assertThat(report).bodyJson().extractingPath("$.categories[0].percentage").isEqualTo(75.31);
        assertThat(report).bodyJson().extractingPath("$.categories[1].name").isEqualTo("Masina");
        assertThat(report).bodyJson().extractingPath("$.categories[1].netRon").isEqualTo(514.10);
        assertThat(report).bodyJson().extractingPath("$.categories[1].percentage").isEqualTo(24.69);

        MvcTestResult list = mvc.get().uri("/api/expenses?month=" + MONTH + "&sort=amountRon,desc").exchange();
        assertThat(list).bodyJson().extractingPath("$.totalElements").isEqualTo(3);
        assertThat(list).bodyJson().extractingPath("$.netRon").isEqualTo(2082.24);
        assertThat(list).bodyJson().extractingPath("$.content[0].signedAmountRon").isEqualTo(-1568.14);
    }

    @Test
    void healthIsUpIncludingDatabaseReadiness() {
        assertThat(mvc.get().uri("/actuator/health/readiness")).hasStatusOk()
                .bodyJson().extractingPath("$.status").isEqualTo("UP");
    }

    private void post(String json) {
        assertThat(mvc.post().uri("/api/expenses").contentType(MediaType.APPLICATION_JSON).content(json))
                .hasStatus(HttpStatus.CREATED);
    }

    private long categoryId(String name) {
        return jdbc.queryForObject("SELECT id FROM category WHERE name = ?", Long.class, name);
    }
}
