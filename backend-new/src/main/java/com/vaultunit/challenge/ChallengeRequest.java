package com.vaultunit.challenge;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChallengeRequest(
        @NotBlank @Size(max = 80) String title,
        @NotBlank @Pattern(regexp = "(?i)ALL|Food|Travel|Shopping|Bills|Other|Salary") String category,
        @Min(3) @Max(30) int durationDays) {
}
