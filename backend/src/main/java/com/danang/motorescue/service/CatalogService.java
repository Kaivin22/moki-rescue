package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.ServiceTypeResponse;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {
    private final JdbcTemplate jdbc;

    public CatalogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ServiceTypeResponse> activeServices(String locale) {
        return jdbc.query("""
                SELECT code,
                       CASE WHEN ? = 'en' THEN label_en ELSE label_vi END AS label,
                       CASE WHEN ? = 'en' THEN description_en ELSE description_vi END AS description,
                       icon_name, requires_quote
                FROM public.service_types WHERE is_active ORDER BY sort_order, code
                """, (rs, index) -> new ServiceTypeResponse(
                rs.getString("code"), rs.getString("label"), rs.getString("description"),
                rs.getString("icon_name"), rs.getBoolean("requires_quote")), locale, locale);
    }
}
