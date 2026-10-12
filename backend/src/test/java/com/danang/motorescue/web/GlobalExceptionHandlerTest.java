package com.danang.motorescue.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.TransientDataAccessResourceException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

class GlobalExceptionHandlerTest {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new FailingController())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @ParameterizedTest
    @ValueSource(strings = {"transaction", "resource", "transient"})
    void connectionOutagesReturn503WithoutPrivateDetails(String kind) throws Exception {
        mvc.perform(get("/test/" + kind))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DATABASE_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value(not(containsString("PRIVATE"))))
                .andExpect(jsonPath("$.path").value("/test/" + kind));
    }

    @Test
    void integrityConflictsAreNotMislabelledAsDatabaseOutages() throws Exception {
        mvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DATABASE_CONFLICT"));
    }

    @RestController
    static class FailingController {
        @GetMapping("/test/{kind}")
        String fail(@PathVariable String kind) {
            throw switch (kind) {
                case "transaction" -> new CannotCreateTransactionException("PRIVATE connection string");
                case "resource" -> new DataAccessResourceFailureException("PRIVATE credentials");
                case "transient" -> new TransientDataAccessResourceException("PRIVATE details");
                default -> new DataIntegrityViolationException("PRIVATE row data");
            };
        }
    }
}
