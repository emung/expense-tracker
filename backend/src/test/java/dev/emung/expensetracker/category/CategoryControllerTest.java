package dev.emung.expensetracker.category;

import dev.emung.expensetracker.category.dto.CategoryResponse;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@WebMvcTest(CategoryController.class)
class CategoryControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private CategoryService service;

    @Test
    void listForwardsIncludeArchivedFlag() {
        when(service.list(true)).thenReturn(List.of(new CategoryResponse(10L, "Masina", 100, true, 15)));

        MvcTestResult result = mvc.get().uri("/api/categories?includeArchived=true").exchange();

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().extractingPath("$[0].name").isEqualTo("Masina");
        assertThat(result).bodyJson().extractingPath("$[0].expenseCount").isEqualTo(15);
    }

    @Test
    void createReturns201WithLocation() {
        when(service.create(any())).thenReturn(new CategoryResponse(14L, "Vacanta", 140, false, 0));

        MvcTestResult result = mvc.post().uri("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Vacanta\"}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(result).headers().hasValue("Location", "http://localhost/api/categories/14");
        assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(14);
    }

    @Test
    void createRejectsBlankNameWithFieldErrors() {
        MvcTestResult result = mvc.post().uri("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"   \"}")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST).hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
        assertThat(result).bodyJson().extractingPath("$.errors[0].message").isEqualTo("Numele este obligatoriu.");
        verifyNoInteractions(service);
    }

    @Test
    void malformedJsonIs400() {
        MvcTestResult result = mvc.post().uri("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{")
                .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Cerere invalidă");
    }

    @Test
    void nonNumericIdIs400() {
        assertThat(mvc.get().uri("/api/categories/abc")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void unknownCategoryIs404ProblemDetail() {
        when(service.get(99L)).thenThrow(new NotFoundException("Categoria 99 nu există."));

        MvcTestResult result = mvc.get().uri("/api/categories/99").exchange();

        assertThat(result).hasStatus(HttpStatus.NOT_FOUND).hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.detail").isEqualTo("Categoria 99 nu există.");
    }

    @Test
    void deletingCategoryInUseIs409() {
        doThrow(new ConflictException("Categoria „Masina” este folosită de 15 cheltuieli."))
                .when(service).delete(10L);

        MvcTestResult result = mvc.delete().uri("/api/categories/10").exchange();

        assertThat(result).hasStatus(HttpStatus.CONFLICT);
        assertThat(result).bodyJson().extractingPath("$.detail").asString().contains("15 cheltuieli");
    }

    @Test
    void deleteReturns204() {
        assertThat(mvc.delete().uri("/api/categories/10")).hasStatus(HttpStatus.NO_CONTENT);
    }
}
