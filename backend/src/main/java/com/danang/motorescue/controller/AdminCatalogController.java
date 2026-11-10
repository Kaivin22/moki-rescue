package com.danang.motorescue.controller;
import com.danang.motorescue.service.*;
import com.danang.motorescue.service.AdminCatalogService.*;
import com.danang.motorescue.model.ApiModels.UpdateServiceTypeRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/operator")
public class AdminCatalogController {
    private final ActorService actors; private final AdminCatalogService catalog;
    public AdminCatalogController(ActorService actors,AdminCatalogService catalog) {this.actors=actors;this.catalog=catalog;}
    @GetMapping("/teams/{id}/details")
    public TeamEdit details(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id) {return catalog.teamDetails(actors.requireRole(jwt,"admin"),id);}
    @PutMapping("/teams/{id}/details") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void team(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody TeamEdit input) {catalog.team(actors.requireRole(jwt,"admin"),id,input);}
    @PutMapping("/teams/{teamId}/providers/{userId}/details") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void provider(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID teamId,@PathVariable UUID userId,@Valid @RequestBody ProviderEdit input) {catalog.provider(actors.requireRole(jwt,"admin"),teamId,userId,input);}
    @PostMapping("/service-types/{code}") @ResponseStatus(HttpStatus.CREATED)
    public void service(@AuthenticationPrincipal Jwt jwt,@PathVariable String code,@Valid @RequestBody UpdateServiceTypeRequest input) {catalog.createService(actors.requireRole(jwt,"admin"),code,input);}
}
