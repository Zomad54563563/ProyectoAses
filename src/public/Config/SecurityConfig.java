package com.asisweb.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityConfig {

    // Configura qué rutas necesitan autenticación o no
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // desactiva CSRF si usas API REST
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/register-alumno",
                    "/api/register-profesor",
                    "/api/login-alumno",
                    "/api/login-profesor",
                    "/css/**",
                    "/js/**",
                    "/images/**"
                ).permitAll()  // rutas públicas
                .anyRequest().authenticated() // todo lo demás requiere login
            )
            .formLogin(form -> form.disable()) // no queremos login con formulario HTML
            .httpBasic(basic -> basic.disable()); // ni autenticación básica

        return http.build();
    }

    // Bean para cifrar contraseñas con BCrypt
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
