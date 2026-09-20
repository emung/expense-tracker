package dev.emung.expensetracker.common.error;

import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;
import java.util.Map;

/** Renders every API error as RFC 9457 ProblemDetail with Romanian, user-facing messages. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /** Last-line defence when a race slips past service-level checks: constraint name -> message. */
    private static final Map<String, String> CONSTRAINT_MESSAGES = Map.of(
            "ux_category_name", "Există deja o categorie cu acest nume.",
            "ux_account_name", "Există deja un cont cu acest nume.",
            "fk_expense_category", "Categoria este folosită de cheltuieli. Arhivați-o în loc să o ștergeți.",
            "fk_expense_account", "Contul este folosit de cheltuieli. Arhivați-l în loc să îl ștergeți.",
            "ux_merchant_rule_key", "Există deja o regulă pentru acest magazin.");

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "Resursă inexistentă", ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException ex) {
        return problem(HttpStatus.CONFLICT, "Conflict", ex.getMessage());
    }

    @ExceptionHandler(BusinessRuleException.class)
    ProblemDetail handleBusinessRule(BusinessRuleException ex) {
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Cerere invalidă", ex.getMessage());
        if (ex.getField() != null) {
            body.setProperty("errors", List.of(new FieldViolation(ex.getField(), ex.getMessage())));
        }
        return body;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        String cause = String.valueOf(ex.getMostSpecificCause().getMessage());
        String detail = CONSTRAINT_MESSAGES.entrySet().stream()
                .filter(entry -> cause.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("Operația încalcă o regulă de integritate a datelor.");
        return problem(HttpStatus.CONFLICT, "Conflict", detail);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        List<FieldViolation> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldViolation(error.getField(), error.getDefaultMessage()))
                .toList();
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Date invalide", "Verificați câmpurile marcate.");
        body.setProperty("errors", errors);
        return handleExceptionInternal(ex, body, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Parametru invalid",
                "Valoarea „%s” nu este validă pentru „%s”.".formatted(ex.getValue(), ex.getPropertyName()));
        return handleExceptionInternal(ex, body, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(MissingServletRequestParameterException ex, HttpHeaders headers,
                                                                          HttpStatusCode status, WebRequest request) {
        String detail = "Parametrul „%s” este obligatoriu.".formatted(ex.getParameterName());
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Parametru lipsă", detail);
        body.setProperty("errors", List.of(new FieldViolation(ex.getParameterName(), detail)));
        return handleExceptionInternal(ex, body, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Cerere invalidă", "Conținutul cererii nu poate fi interpretat.");
        return handleExceptionInternal(ex, body, headers, status, request);
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setTitle(title);
        return body;
    }
}
