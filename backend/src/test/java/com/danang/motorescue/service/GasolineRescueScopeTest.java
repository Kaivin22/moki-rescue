package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.danang.motorescue.model.ApiModels.CreateRequest;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class GasolineRescueScopeTest {
    private final Actor customer = new Actor(UUID.randomUUID(), "Customer", "customer", "vi");
    private final Actor admin = new Actor(UUID.randomUUID(), "Admin", "admin", "vi");
    // No DB, OSRM or transaction dependencies: rejection must happen before any of them is used.
    private final RescueCreationService creation = new RescueCreationService(
            null, null, null, null, null, null, new RescueRequestAccess(null));

    @Test void rejectsElectricAndUnidentifiedVehiclesForEveryCurrentService() {
        for (String vehicle : List.of("electric", "unknown")) {
            for (String service : List.of("flat_tire", "dead_battery", "out_of_fuel", "minor_repair", "motorbike_transport")) {
                assertThatThrownBy(() -> creation.create(customer, UUID.randomUUID(), input(service, vehicle, false)))
                        .isInstanceOfSatisfying(ApiException.class,
                                error -> assertThat(error.code()).isEqualTo("VEHICLE_OUTSIDE_SCOPE"));
            }
        }
    }

    @Test void rejectsRetiredBatteryServiceEvenIfClientClaimsGasoline() {
        assertThatThrownBy(() -> creation.create(customer, UUID.randomUUID(), input("electric_battery", "gasoline", false)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("VEHICLE_OUTSIDE_SCOPE"));
    }

    @Test void emergencyHandoffStillTakesPriorityOverProductScope() {
        assertThatThrownBy(() -> creation.create(customer, UUID.randomUUID(), input("electric_battery", "electric", true)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("EMERGENCY_HANDOFF_REQUIRED"));
    }

    @Test void adminCannotReactivateRetiredServiceOrGrantItsCapability() {
        var operator = new OperatorService(null, null, null, null, null);
        assertThatThrownBy(() -> operator.updateServiceType(admin, "electric_battery", null))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("SERVICE_NOT_AVAILABLE"));
        assertThatThrownBy(() -> operator.setTeamCapabilities(admin, UUID.randomUUID(), List.of("electric_battery")))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("INVALID_CAPABILITIES"));
    }

    private CreateRequest input(String service, String vehicle, boolean injury) {
        return new CreateRequest(service, vehicle, "Test motorcycle", "Test pickup", null,
                16.0544, 108.2022, "manual", null, null, null, null, null, injury, false, true);
    }
}
