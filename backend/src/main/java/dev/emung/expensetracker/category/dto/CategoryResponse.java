package dev.emung.expensetracker.category.dto;

import dev.emung.expensetracker.category.Category;

/** @param expenseCount lets the UI offer "delete" only for unused categories */
public record CategoryResponse(Long id, String name, int sortOrder, boolean archived, long expenseCount) {

    public static CategoryResponse from(Category category, long expenseCount) {
        return new CategoryResponse(category.getId(), category.getName(), category.getSortOrder(), category.isArchived(), expenseCount);
    }
}
