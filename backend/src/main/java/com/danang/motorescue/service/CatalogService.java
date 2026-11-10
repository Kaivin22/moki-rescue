package com.danang.motorescue.service;

import com.danang.motorescue.model.ApiModels.ServiceTypeResponse;
import com.danang.motorescue.model.ApiModels.PartnerShopResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {
    private final JdbcTemplate jdbc;

    public CatalogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<PartnerShopResponse> partnerShops() {
        // A verified partner stays visible outside working hours, even with no available providers.
        return jdbc.query("""
                SELECT id, name, base_address, base_latitude, base_longitude
                FROM public.rescue_teams
                WHERE status = 'verified'
                  AND NULLIF(BTRIM(base_address), '') IS NOT NULL
                  AND base_latitude IS NOT NULL AND base_longitude IS NOT NULL
                  AND public.api_is_in_service_area(base_latitude, base_longitude)
                ORDER BY name, id
                """, (rs, index) -> new PartnerShopResponse(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("base_address"),
                rs.getDouble("base_latitude"), rs.getDouble("base_longitude")));
    }

    public List<ServiceTypeResponse> activeServices(String locale) {
        return jdbc.query("""
                SELECT code,
                       CASE WHEN ? = 'en' THEN label_en ELSE label_vi END AS label,
                       CASE WHEN ? = 'en' THEN description_en ELSE description_vi END AS description,
                       icon_name, requires_quote, requires_destination
                FROM public.service_types WHERE is_active AND code <> 'electric_battery'
                ORDER BY sort_order, code
                """, (rs, index) -> new ServiceTypeResponse(
                rs.getString("code"), rs.getString("label"), rs.getString("description"),
                rs.getString("icon_name"), rs.getBoolean("requires_quote"),
                rs.getBoolean("requires_destination")), locale, locale);
    }
}
