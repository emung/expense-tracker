package dev.emung.expensetracker.common.web;

import dev.emung.expensetracker.expense.ExpenseController;
import dev.emung.expensetracker.expense.ExpenseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

@WebMvcTest(ExpenseController.class)
@Import(CorsConfig.class)
@TestPropertySource(properties = "app.cors.allowed-origins=https://smartbill.local:5173")
class CorsConfigTest {

    private static final String ALLOWED = "https://smartbill.local:5173";

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ExpenseService service;

    @Test
    void preflightFromAnAllowedOriginIsAccepted() {
        assertThat(mvc.options().uri("/api/expenses")
                .header(HttpHeaders.ORIGIN, ALLOWED)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name()))
                .hasStatusOk()
                .hasHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ALLOWED);
    }

    @Test
    void preflightFromAnUnknownOriginIsRejected() {
        assertThat(mvc.options().uri("/api/expenses")
                .header(HttpHeaders.ORIGIN, "https://evil.example")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name()))
                .hasStatus(org.springframework.http.HttpStatus.FORBIDDEN);
    }

    /** No credentials: a listed origin must not be able to ride a session cookie. */
    @Test
    void credentialsAreNotAllowed() {
        assertThat(mvc.options().uri("/api/expenses")
                .header(HttpHeaders.ORIGIN, ALLOWED)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name()))
                .doesNotContainHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS);
    }
}
