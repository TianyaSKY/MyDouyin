package com.tianya.application.data.model;

public class UserStatsResponse {
    private Long totalLikes;
    private Long workCount;
    private Long followingCount;
    private Long followerCount;

    public Long getTotalLikes() { return totalLikes; }
    public void setTotalLikes(Long totalLikes) { this.totalLikes = totalLikes; }

    public Long getWorkCount() { return workCount; }
    public void setWorkCount(Long workCount) { this.workCount = workCount; }

    public Long getFollowingCount() { return followingCount; }
    public void setFollowingCount(Long followingCount) { this.followingCount = followingCount; }

    public Long getFollowerCount() { return followerCount; }
    public void setFollowerCount(Long followerCount) { this.followerCount = followerCount; }
}
