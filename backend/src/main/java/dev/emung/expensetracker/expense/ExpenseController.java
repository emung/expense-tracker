package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.expense.dto.ExpenseListResponse;
import dev.emung.expensetracker.expense.dto.ExpenseRequest;
import dev.emung.expensetracker.expense.dto.ExpenseResponse;
import dev.emung.expensetracker.expense.dto.MerchantSuggestion;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService service;

    public ExpenseController(ExpenseService service) {
        this.service = service;
    }

    /**
     * Filter by {@code month=YYYY-MM} or by an inclusive {@code from}/{@code to} range; {@code q} searches
     * merchant and details. {@code sort} accepts expenseDate, amountRon, merchant or createdAt with an optional direction.
     */
    @GetMapping
    public ExpenseListResponse list(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) EntryType type,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "expenseDate,desc") String sort) {
        ExpenseFilter filter = ExpenseFilter.of(month, from, to, categoryId, accountId, type, q);
        return service.list(filter, ExpensePaging.pageRequest(page, size, sort));
    }

    @GetMapping("/merchants")
    public List<MerchantSuggestion> merchants(@RequestParam(defaultValue = "") String q,
                                              @RequestParam(defaultValue = "10") int limit) {
        return service.suggestMerchants(q, limit);
    }

    @GetMapping("/{id}")
    public ExpenseResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(@Valid @RequestBody ExpenseRequest request) {
        ExpenseResponse created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ExpenseResponse update(@PathVariable long id, @Valid @RequestBody ExpenseRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
