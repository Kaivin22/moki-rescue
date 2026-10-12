package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.danang.motorescue.service.WorkingHoursService.Day;
import com.danang.motorescue.service.WorkingHoursService.Update;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.web.ApiException;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class WorkingHoursServiceTest {
    @Test void acceptsAnEmptyClosedScheduleAndExplicit247() {
        assertThatCode(() -> WorkingHoursService.validate(input(List.of()))).doesNotThrowAnyException();
        assertThatCode(() -> WorkingHoursService.validate(input(
                IntStream.rangeClosed(1, 7).mapToObj(day -> new Day(day, 0, 1440)).toList())))
                .doesNotThrowAnyException();
    }

    @Test void acceptsNightShiftsAndTouchingBoundariesIncludingWeekWrap() {
        assertThatCode(() -> WorkingHoursService.validate(input(List.of(
                new Day(7, 1320, 360), new Day(1, 360, 600), new Day(2, 420, 1260)))))
                .doesNotThrowAnyException();
    }

    @Test void rejectsOverlapIntoNextDayOrNextWeek() {
        invalid(List.of(new Day(1, 1320, 360), new Day(2, 300, 600)));
        invalid(List.of(new Day(7, 1320, 360), new Day(1, 300, 600)));
        invalid(List.of(new Day(1, 420, 1260), new Day(1, 0, 360)));
    }

    @Test void rejectsEqualHoursBadWeekdaysAndOutOfRangeTimes() {
        for (Day day : List.of(new Day(1, 420, 420), new Day(1, 0, 0), new Day(0, 420, 600),
                new Day(8, 420, 600), new Day(1, -1, 600), new Day(1, 1440, 600), new Day(1, 420, 1441))) {
            invalid(List.of(day));
        }
    }

    @Test void rejectsIncompleteInputEvenWhenCalledOutsideHttpValidation() {
        for (Update input : List.of(new Update(null, 0, List.of()), new Update(false, -1, List.of()),
                new Update(false, 0, null))) {
            assertThatThrownBy(() -> WorkingHoursService.validate(input)).isInstanceOf(ApiException.class);
        }
        assertThatThrownBy(() -> WorkingHoursService.validate(null)).isInstanceOf(ApiException.class);
    }

    @Test void rejectsNonAdminEditsBeforeAnyDatabaseAccess() {
        var service = new WorkingHoursService(null, null, null);
        for (String role : List.of("customer", "provider")) {
            var actor = new Actor(UUID.randomUUID(), "Test", role, "vi");
            assertThatThrownBy(() -> service.save(actor, UUID.randomUUID(), input(List.of())))
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("ACCESS_DENIED"));
            assertThatThrownBy(() -> service.forAdmin(actor, UUID.randomUUID())).isInstanceOf(ApiException.class);
        }
    }

    private Update input(List<Day> days) { return new Update(false, 0, days); }
    private void invalid(List<Day> days) {
        assertThatThrownBy(() -> WorkingHoursService.validate(input(days)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("INVALID_WORKING_HOURS"));
    }
}
