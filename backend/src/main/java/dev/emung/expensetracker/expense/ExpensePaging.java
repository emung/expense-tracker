package dev.emung.expensetracker.expense;

import dev.emung.expensetracker.common.error.BusinessRuleException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

/** Builds a safe {@link Pageable} from raw request parameters (whitelisted sort fields, bounded page size). */
final class ExpensePaging {

    static final int MAX_PAGE_SIZE = 200;
    private static final Set<String> SORTABLE_FIELDS = Set.of("expenseDate", "amountRon", "merchant", "createdAt");

    private ExpensePaging() {
    }

    /** @param sort {@code field} or {@code field,asc|desc}; ties are always broken by newest id first */
    static Pageable pageRequest(int page, int size, String sort) {
        if (page < 0) {
            throw new BusinessRuleException("page", "Numărul paginii nu poate fi negativ.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BusinessRuleException("size", "Mărimea paginii trebuie să fie între 1 și %d.".formatted(MAX_PAGE_SIZE));
        }
        String[] parts = sort.split(",", -1);
        String field = parts[0].strip();
        if (parts.length > 2 || !SORTABLE_FIELDS.contains(field)) {
            throw unknownSort(sort);
        }
        Sort.Direction direction = parts.length == 2
                ? Sort.Direction.fromOptionalString(parts[1].strip()).orElseThrow(() -> unknownSort(sort))
                : Sort.Direction.ASC;
        Sort.Order order = new Sort.Order(direction, field);
        if (field.equals("merchant")) {
            order = order.ignoreCase();
        }
        return PageRequest.of(page, size, Sort.by(order, Sort.Order.desc("id")));
    }

    private static BusinessRuleException unknownSort(String sort) {
        return new BusinessRuleException("sort", "Criteriu de sortare necunoscut: „%s”.".formatted(sort));
    }
}
