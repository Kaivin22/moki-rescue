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
        Boolean covered = jdbc.queryForObject("""
                SELECT EXISTS(
                  SELECT 1 FROM public.service_zones zone
                  WHERE zone.is_active
                    AND extensions.ST_Covers(
                      zone.boundary,
                      extensions.ST_SetSRID(extensions.ST_MakePoint(?, ?), 4326)::extensions.geography
                    )
                )
                """, Boolean.class, longitude, latitude);
        return Boolean.TRUE.equals(covered);
    }
}
