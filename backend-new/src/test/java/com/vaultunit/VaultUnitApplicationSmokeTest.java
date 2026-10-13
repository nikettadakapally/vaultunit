package com.vaultunit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:vaultunit-smoke-test;DB_CLOSE_DELAY=-1",
                "spring.jpa.hibernate.ddl-auto=create-drop"
        })
class VaultUnitApplicationSmokeTest {

    @Autowired
    private TestRestTemplate http;

    @Test
    void startsHttpServerAndServesCsrfInitialization() {
        ResponseEntity<Map> response = http.getForEntity("/api/auth/csrf", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
                .containsEntry("headerName", "X-XSRF-TOKEN")
                .containsKey("token");
    }

    @Test
    void allowsCredentialedCorsFromProductionVercelOrigin() {
        assertCredentialedCorsOrigin("https://vaultunit-1f390ai5s-ace-dc38.vercel.app");
    }

    @Test
    void allowsCredentialedCorsFromVaultUnitThreeVercelOrigin() {
        assertCredentialedCorsOrigin("https://vaultunit-three.vercel.app");
    }

    private void assertCredentialedCorsOrigin(String origin) {
        HttpHeaders headers = new HttpHeaders();
        headers.setOrigin(origin);
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        ResponseEntity<String> response = http.exchange(
                "/api/auth/register",
                HttpMethod.OPTIONS,
                new HttpEntity<>(headers),
                String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(origin);
        assertThat(response.getHeaders().getAccessControlAllowCredentials()).isTrue();
    }
}
