package dev.emung.expensetracker.report;

import dev.emung.expensetracker.report.dto.MonthlyCategoryReport;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/monthly-by-category")
    public MonthlyCategoryReport monthlyByCategory(@RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return service.monthlyByCategory(month);
    }
}
