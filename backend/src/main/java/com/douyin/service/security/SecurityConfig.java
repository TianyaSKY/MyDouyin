package com.douyin.service.security;

import com.douyin.common.Result;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.List;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF - stateless JWT doesn't need it
            .csrf(AbstractHttpConfigurer::disable)

            // Enable CORS for browser clients (frontend domain)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless session
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // CORS preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/videos", "/api/videos/{id}", "/api/videos/{id}/like", "/api/videos/*/like").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/feed").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/videos/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/covers/**").permitAll()
                
                // Swagger UI and OpenAPI docs
                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/swagger-resources/**",
                    "/webjars/**"
                ).permitAll()

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            // Custom 401/403 handler
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "未登录或 Token 已过期"))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    writeErrorResponse(response, HttpServletResponse.SC_FORBIDDEN, "权限不足"))
            )

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(Result.fail(status, message)));
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
