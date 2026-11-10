package com.danang.motorescue.service;

import static com.danang.motorescue.service.CommunicationSupport.requireAdmin;
import static com.danang.motorescue.service.CommunicationSupport.clean;
import com.danang.motorescue.service.ActorService.Actor;
import com.danang.motorescue.model.ApiModels.*;
import com.danang.motorescue.web.ApiException;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AdminCatalogService {
    public record TeamEdit(@NotBlank @Size(min=2,max=120) String name,
            @NotBlank @Pattern(regexp="^\\+[1-9][0-9]{7,14}$") String hotline) {}
    public record ProviderEdit(@NotBlank @Size(min=2,max=80) String displayName,
            @NotBlank @Pattern(regexp="^\\+[1-9][0-9]{7,14}$") String contactPhone,
            @Size(max=80) String rescueVehicleLabel) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AuditService audit;
    public AdminCatalogService(JdbcTemplate jdbc,TransactionTemplate transactions,AuditService audit) {
        this.jdbc=jdbc;this.transactions=transactions;this.audit=audit;
    }
    public void team(Actor actor,UUID id,TeamEdit input) {
        requireAdmin(actor);
        String name = clean(input.name(), 2, 120);
        transactions.executeWithoutResult(tx -> {
            int count=jdbc.update("UPDATE public.rescue_teams SET name=?,hotline=? WHERE id=?",name,input.hotline(),id);
            if(count==0) throw missing();
            audit.record(actor.id(),"team.details_updated","rescue_team",id);
        });
    }
    public TeamEdit teamDetails(Actor actor, UUID id) {
        requireAdmin(actor);
        var rows=jdbc.query("SELECT name,hotline FROM public.rescue_teams WHERE id=?",(rs,n)->new TeamEdit(rs.getString("name"),rs.getString("hotline")),id);
        if(rows.isEmpty())throw missing();
        return rows.get(0);
    }
    public void provider(Actor actor,UUID teamId,UUID userId,ProviderEdit input) {
        requireAdmin(actor);
        String name = clean(input.displayName(), 2, 80);
        transactions.executeWithoutResult(tx -> {
            int count=jdbc.update("UPDATE public.provider_members SET display_name=?,contact_phone_e164=?,rescue_vehicle_label=? WHERE user_id=? AND team_id=?",
                    name,input.contactPhone(),input.rescueVehicleLabel()==null?null:input.rescueVehicleLabel().trim(),userId,teamId);
            if(count==0) throw missing();
            audit.record(actor.id(),"provider.details_updated","provider",userId);
        });
    }
    public void createService(Actor actor,String code,UpdateServiceTypeRequest input) {
        requireAdmin(actor);
        if(code==null || !code.matches("^[a-z][a-z0-9_]{2,39}$") || code.equals("electric_battery") || code.equals("new"))
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_SERVICE_CODE","Mã dịch vụ không hợp lệ.");
        if(!List.of("construct-outline","battery-dead-outline","flash-outline","water-outline","build-outline","trail-sign-outline").contains(input.iconName())
                || (input.requiresDestination() && !input.requiresQuote()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_SERVICE_OPTIONS","Dịch vụ vận chuyển cần báo giá; kiểm tra biểu tượng.");
        transactions.executeWithoutResult(tx -> {
            // Start disabled. Matching columns use database defaults; no team is
            // granted a new capability merely because the service was created.
            int created=jdbc.update("""
                INSERT INTO public.service_types(code,label_vi,description_vi,label_en,description_en,icon_name,
                  requires_quote,requires_destination,sort_order,is_active)
                VALUES (?,?,?,?,?,?,?,?,?,FALSE) ON CONFLICT (code) DO NOTHING
                """,code,input.labelVi().trim(),input.descriptionVi().trim(),input.labelEn().trim(),input.descriptionEn().trim(),
                    input.iconName(),input.requiresQuote(),input.requiresDestination(),input.sortOrder());
            if(created==0) throw new ApiException(HttpStatus.CONFLICT,"SERVICE_EXISTS","Mã dịch vụ đã tồn tại.");
            audit.record(actor.id(),"service_type.created","service_type",code);
        });
    }
    private ApiException missing() { return new ApiException(HttpStatus.NOT_FOUND,"RECORD_NOT_FOUND","Không tìm thấy bản ghi."); }
}
