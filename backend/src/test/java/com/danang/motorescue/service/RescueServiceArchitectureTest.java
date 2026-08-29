package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;

class RescueServiceArchitectureTest {
    private static final Set<Class<?>> RESCUE_COMPONENTS = Set.of(
            RescueService.class,
            RescueCreationService.class,
            RescueQueryService.class,
            RescueCancellationService.class,
            RescueLifecycleService.class,
            RescueQuoteService.class,
            RescueReviewService.class,
            RescueIncidentService.class,
            RescueRequestAccess.class,
            RescueNotificationService.class);

    @Test
    void rescueComponentsHaveNoConstructorDependencyCycle() {
        Map<Class<?>, Set<Class<?>>> graph = new HashMap<>();
        for (Class<?> component : RESCUE_COMPONENTS) {
            Set<Class<?>> dependencies = new HashSet<>();
            for (Class<?> parameter : constructor(component).getParameterTypes()) {
                if (RESCUE_COMPONENTS.contains(parameter)) dependencies.add(parameter);
            }
            graph.put(component, dependencies);
        }

        for (Class<?> component : RESCUE_COMPONENTS) {
            assertThat(hasCycle(component, graph, new HashSet<>(), new ArrayDeque<>()))
                    .as("constructor dependency cycle starting at %s", component.getSimpleName())
                    .isFalse();
        }
    }

    @Test
    void programmaticTransactionBoundariesStayAtMutatingUseCaseLevel() {
        Set<Class<?>> transactionOwners = Set.of(
                RescueCreationService.class,
                RescueCancellationService.class,
                RescueLifecycleService.class,
                RescueQuoteService.class,
                RescueReviewService.class,
                RescueIncidentService.class);

        for (Class<?> owner : transactionOwners) {
            assertThat(constructor(owner).getParameterTypes())
                    .as("%s transaction dependency", owner.getSimpleName())
                    .contains(TransactionTemplate.class);
        }
        assertThat(constructor(RescueService.class).getParameterTypes())
                .doesNotContain(TransactionTemplate.class);
        assertThat(constructor(RescueQueryService.class).getParameterTypes())
                .doesNotContain(TransactionTemplate.class);
    }

    private static Constructor<?> constructor(Class<?> type) {
        Constructor<?>[] constructors = type.getDeclaredConstructors();
        assertThat(constructors).as("single constructor for %s", type.getSimpleName()).hasSize(1);
        return constructors[0];
    }

    private static boolean hasCycle(
            Class<?> node,
            Map<Class<?>, Set<Class<?>>> graph,
            Set<Class<?>> complete,
            Deque<Class<?>> path) {
        if (path.contains(node)) return true;
        if (complete.contains(node)) return false;
        path.push(node);
        for (Class<?> dependency : graph.getOrDefault(node, Set.of())) {
            if (hasCycle(dependency, graph, complete, path)) return true;
        }
        path.pop();
        complete.add(node);
        return false;
    }
}
