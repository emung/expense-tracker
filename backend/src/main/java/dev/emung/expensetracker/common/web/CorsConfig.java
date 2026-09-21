package dev.emung.expensetracker.common.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cross-origin access to {@code /api}, for browser clients served from somewhere other
 * than this app's own nginx - currently the SmartBill bill-scanning PWA.
 *
 * <p>The app's own frontend does not need this: nginx proxies {@code /api} so those calls
 * are same-origin. Anything else is blocked by the browser until its origin is listed in
 * {@code app.cors.allowed-origins} (env {@code APP_CORS_ALLOWED_ORIGINS}), which is empty
 * by default, so CORS stays off unless it is deliberately switched on.
 *
 * <p>Credentials are not allowed: the API has no auth and no cookies, so there is nothing
 * to send, and disallowing them keeps a listed origin from being able to ride a session.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public CorsConfig(@Value("${app.cors.allowed-origins:}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins.length == 0) {
            return;
        }
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
