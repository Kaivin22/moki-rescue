package com.danang.motorescue.controller;

import com.danang.motorescue.model.ApiModels.ProfileResponse;
import com.danang.motorescue.model.ApiModels.PushDeviceDeleteRequest;
import com.danang.motorescue.model.ApiModels.PushDeviceRequest;
import com.danang.motorescue.model.ApiModels.ServiceTypeResponse;
import com.danang.motorescue.service.ActorService;
import com.danang.motorescue.service.CatalogService;
import com.danang.motorescue.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AccountController {
    private final ActorService actors;
    private final CatalogService catalog;
    private final AccountService accounts;

    public AccountController(ActorService actors, CatalogService catalog, AccountService accounts) {
        this.actors = actors;
        this.catalog = catalog;
        this.accounts = accounts;
    }

    @GetMapping("/me")
    ProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        return actors.profile(jwt);
    }

    @GetMapping("/catalog/service-types")
    List<ServiceTypeResponse> serviceTypes(@AuthenticationPrincipal Jwt jwt) {
        ActorService.Actor actor = actors.require(jwt);
        return catalog.activeServices(actor.locale());
    }

    @PostMapping("/me/deletion-request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void requestDeletion(@AuthenticationPrincipal Jwt jwt) {
        accounts.requestDeletion(actors.require(jwt));
    }

    @PutMapping("/me/push-device")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void registerPushDevice(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PushDeviceRequest input) {
        accounts.registerPushDevice(actors.require(jwt), input);
    }

    @DeleteMapping("/me/push-device")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unregisterPushDevice(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PushDeviceDeleteRequest input) {
        accounts.unregisterPushDevice(actors.require(jwt), input.token(), input.installationId());
    }
}
