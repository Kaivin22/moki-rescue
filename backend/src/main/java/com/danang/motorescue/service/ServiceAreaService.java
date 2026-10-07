package com.danang.motorescue.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ServiceAreaService {
    private final JdbcTemplate jdbc;

    public ServiceAreaService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean contains(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) return false;
        Boolean covered = jdbc.queryForObject("""
                SELECT public.api_is_in_service_area(?, ?)
                """, Boolean.class, latitude, longitude);
        return Boolean.TRUE.equals(covered);
    }
}
