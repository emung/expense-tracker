package dev.emung.expensetracker.merchant;

import dev.emung.expensetracker.common.error.BusinessRuleException;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.merchant.dto.MerchantRuleResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@WebMvcTest(MerchantRuleController.class)
class MerchantRuleControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private MerchantRuleService service;

    @Test
    void listForwardsTheSearchTerm() {
        when(service.list("lid")).thenReturn(List.of(
                new MerchantRuleResponse(7L, "Lidl", 3L, "Mancare", false, 1L, "SaltBank", 42, true)));

        MvcTestResult result = mvc.get().uri("/api/merchant-rules?q=lid").exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().extractingPath("$[0].merchantKey").isEqualTo("Lidl");
        assertThat(result).bodyJson().extractingPath("$[0].categoryName").isEqualTo("Mancare");
        assertThat(result).bodyJson().extractingPath("$[0].hitCount").isEqualTo(42);
        assertThat(result).bodyJson().extractingPath("$[0].pinned").isEqualTo(true);
    }

    @Test
    void listWithoutSearchTermPassesNull() {
        when(service.list(null)).thenReturn(List.of());

        assertThat(mvc.get().uri("/api/merchant-rules").exchange()).hasStatusOk();
        verify(service).list(null);
    }

    @Test
    void createReturns201WithLocation() {
        when(service.create(any())).thenReturn(
                new MerchantRuleResponse(7L, "Lidl", 3L, "Mancare", false, null, null, 0, true));

        MvcTestResult result = mvc.post().uri("/api/merchant-rules")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchantKey\":\"Lidl\",\"categoryId\":3}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(result).headers().hasValue("Location", "http://localhost/api/merchant-rules/7");
        assertThat(result).bodyJson().extractingPath("$.accountId").isEqualTo(null);
    }

    @Test
    void createRejectsAMissingCategoryWithFieldErrors() {
        MvcTestResult result = mvc.post().uri("/api/merchant-rules")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchantKey\":\"Lidl\"}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST).hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("categoryId");
        assertThat(result).bodyJson().extractingPath("$.errors[0].message").isEqualTo("Categoria este obligatorie.");
        verifyNoInteractions(service);
    }

    @Test
    void createRejectsABlankMerchantWithFieldErrors() {
        MvcTestResult result = mvc.post().uri("/api/merchant-rules")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchantKey\":\"  \",\"categoryId\":3}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("merchantKey");
        verifyNoInteractions(service);
    }

    @Test
    void archivedCategoryIs400WithTheOffendingField() {
        when(service.create(any())).thenThrow(new BusinessRuleException("categoryId", "Categoria „Cadouri” este arhivată."));

        MvcTestResult result = mvc.post().uri("/api/merchant-rules")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchantKey\":\"Lidl\",\"categoryId\":3}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST).hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("categoryId");
    }

    @Test
    void duplicateRuleIs409() {
        when(service.create(any())).thenThrow(new ConflictException("Există deja o regulă pentru „Lidl”."));

        MvcTestResult result = mvc.post().uri("/api/merchant-rules")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchantKey\":\"Lidl\",\"categoryId\":3}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.CONFLICT).hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("Există deja o regulă pentru „Lidl”.");
    }

    @Test
    void unknownRuleIs404() {
        when(service.update(anyLong(), any())).thenThrow(new NotFoundException("Regula 99 nu există."));

        MvcTestResult result = mvc.put().uri("/api/merchant-rules/99")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"merchantKey\":\"Lidl\",\"categoryId\":3}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.NOT_FOUND).hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void deleteReturns204() {
        MvcTestResult result = mvc.delete().uri("/api/merchant-rules/7").exchange();

        assertThat(result).hasStatus(HttpStatus.NO_CONTENT);
        verify(service).delete(7L);
    }

    @Test
    void deleteOfUnknownRuleIs404() {
        doThrow(new NotFoundException("Regula 99 nu există.")).when(service).delete(99L);

        assertThat(mvc.delete().uri("/api/merchant-rules/99").exchange()).hasStatus(HttpStatus.NOT_FOUND);
    }
}
