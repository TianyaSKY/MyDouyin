package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.entity.UserProfile;
import com.douyin.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    /**
     * GET /api/users/{id} - Get user by ID (requires auth)
     */
    @GetMapping("/{id}")
    public Result<UserProfile> getById(@PathVariable Long id) {
        UserProfile user = userProfileService.getById(id);
        return user != null ? Result.ok(user) : Result.fail(404, "User not found");
    }

    /**
     * GET /api/users/username/{username} - Get user by username (requires auth)
     */
    @GetMapping("/username/{username}")
    public Result<UserProfile> getByUsername(@PathVariable String username) {
        UserProfile user = userProfileService.getByUsername(username);
        return user != null ? Result.ok(user) : Result.fail(404, "User not found");
    }

    /**
     * GET /api/users - Get all users (requires auth)
     */
    @GetMapping
    public Result<List<UserProfile>> list() {
        return Result.ok(userProfileService.list());
    }

    /**
     * PUT /api/users/{id} - Update user (requires auth)
     */
    @PutMapping("/{id}")
    public Result<UserProfile> update(@PathVariable Long id, @Valid @RequestBody UserProfile user) {
        user.setUserId(id);
        // Prevent password overwrite through this endpoint
        user.setPassword(null);
        boolean updated = userProfileService.updateById(user);
        return updated ? Result.ok(user) : Result.fail(404, "User not found");
    }

    /**
     * DELETE /api/users/{id} - Delete user (requires auth)
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        boolean removed = userProfileService.removeById(id);
        return removed ? Result.ok() : Result.fail(404, "User not found");
    }
}
