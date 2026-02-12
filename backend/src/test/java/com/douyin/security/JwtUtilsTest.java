package com.douyin.security;

import com.douyin.service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilsTest {

    private JwtUtils jwtUtils;
    private static final String TEST_SECRET = "test-secret-key-must-be-at-least-256-bits-long-for-HS256-algorithm";
    private static final long TEST_EXPIRATION = 3600000L; // 1小时

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils(TEST_SECRET, TEST_EXPIRATION);
    }

    @Test
    void testGenerateToken() {
        Long userId = 1L;
        String username = "testuser";

        String token = jwtUtils.generateToken(userId, username);

        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertEquals(3, token.split("\\.").length); // JWT格式：header.payload.signature
    }

    @Test
    void testGetUsernameFromToken() {
        Long userId = 1L;
        String username = "testuser";
        String token = jwtUtils.generateToken(userId, username);

        String extractedUsername = jwtUtils.getUsernameFromToken(token);

        assertEquals(username, extractedUsername);
    }

    @Test
    void testGetUserIdFromToken() {
        Long userId = 123L;
        String username = "testuser";
        String token = jwtUtils.generateToken(userId, username);

        Long extractedUserId = jwtUtils.getUserIdFromToken(token);

        assertEquals(userId, extractedUserId);
    }

    @Test
    void testValidateToken() {
        Long userId = 1L;
        String username = "testuser";
        String token = jwtUtils.generateToken(userId, username);

        boolean isValid = jwtUtils.validateToken(token);

        assertTrue(isValid);
    }

    @Test
    void testValidateInvalidToken() {
        String invalidToken = "invalid.token.here";

        boolean isValid = jwtUtils.validateToken(invalidToken);

        assertFalse(isValid);
    }

    @Test
    void testIsTokenNotExpired() {
        Long userId = 1L;
        String username = "testuser";
        String token = jwtUtils.generateToken(userId, username);

        boolean isExpired = jwtUtils.isTokenExpired(token);

        assertFalse(isExpired);
    }

    @Test
    void testIsTokenExpiredWithInvalidToken() {
        String invalidToken = "invalid.token.here";

        boolean isExpired = jwtUtils.isTokenExpired(invalidToken);

        assertTrue(isExpired);
    }

    @Test
    void testGetExpiration() {
        long expiration = jwtUtils.getExpiration();

        assertEquals(TEST_EXPIRATION, expiration);
    }

    @Test
    void testTokenWithDifferentUsers() {
        String token1 = jwtUtils.generateToken(1L, "user1");
        String token2 = jwtUtils.generateToken(2L, "user2");

        assertNotEquals(token1, token2);
        assertEquals("user1", jwtUtils.getUsernameFromToken(token1));
        assertEquals("user2", jwtUtils.getUsernameFromToken(token2));
        assertEquals(1L, jwtUtils.getUserIdFromToken(token1));
        assertEquals(2L, jwtUtils.getUserIdFromToken(token2));
    }
}

