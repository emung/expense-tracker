package dev.emung.expensetracker.category;

import dev.emung.expensetracker.category.dto.CategoryRequest;
import dev.emung.expensetracker.category.dto.CategoryResponse;
import dev.emung.expensetracker.common.error.ConflictException;
import dev.emung.expensetracker.common.error.NotFoundException;
import dev.emung.expensetracker.common.persistence.IdCount;
import dev.emung.expensetracker.common.text.Text;
import dev.emung.expensetracker.expense.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private static final int SORT_STEP = 10;

    private final CategoryRepository categories;
    private final ExpenseRepository expenses;

    public CategoryService(CategoryRepository categories, ExpenseRepository expenses) {
        this.categories = categories;
        this.expenses = expenses;
    }

    public List<CategoryResponse> list(boolean includeArchived) {
        List<Category> result = includeArchived
                ? categories.findAllByOrderBySortOrderAscNameAsc()
                : categories.findByArchivedFalseOrderBySortOrderAscNameAsc();
        Map<Long, Long> counts = expenses.countPerCategory().stream()
                .collect(Collectors.toMap(IdCount::getId, IdCount::getTotal));
        return result.stream()
                .map(category -> CategoryResponse.from(category, counts.getOrDefault(category.getId(), 0L)))
                .toList();
    }

    public CategoryResponse get(long id) {
        return CategoryResponse.from(find(id), expenses.countByCategoryId(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = Text.normalizeName(request.name());
        if (categories.existsByNameIgnoreCase(name)) {
            throw duplicateName(name);
        }
        int sortOrder = request.sortOrder() != null ? request.sortOrder() : categories.maxSortOrder() + SORT_STEP;
        Category category = new Category(name, sortOrder);
        category.setArchived(Boolean.TRUE.equals(request.archived()));
        return CategoryResponse.from(categories.save(category), 0);
    }

    @Transactional
    public CategoryResponse update(long id, CategoryRequest request) {
        Category category = find(id);
        String name = Text.normalizeName(request.name());
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw duplicateName(name);
        }
        category.setName(name);
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        if (request.archived() != null) {
            category.setArchived(request.archived());
        }
        return CategoryResponse.from(category, expenses.countByCategoryId(id));
    }

    @Transactional
    public void delete(long id) {
        Category category = find(id);
        long used = expenses.countByCategoryId(id);
        if (used > 0) {
            throw new ConflictException("Categoria „%s” este folosită de %s. Arhivați-o în loc să o ștergeți."
                    .formatted(category.getName(), Text.countLabel(used, "cheltuială", "cheltuieli")));
        }
        categories.delete(category);
    }

    public Category find(long id) {
        return categories.findById(id)
                .orElseThrow(() -> new NotFoundException("Categoria %d nu există.".formatted(id)));
    }

    private static ConflictException duplicateName(String name) {
        return new ConflictException("Există deja o categorie cu numele „%s”.".formatted(name));
    }
}
