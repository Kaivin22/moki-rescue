package com.danang.motorescue.controller;

import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.ReviewFeedService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
public class ReviewFeedController {
    private final ActorService actors;
    private final ReviewFeedService reviews;
    public ReviewFeedController(ActorService actors, ReviewFeedService reviews) { this.actors=actors; this.reviews=reviews; }
    @GetMapping
    ReviewFeedService.Page list(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue="0") int offset) {
        return reviews.list(actors.require(jwt), offset);
    }
}
