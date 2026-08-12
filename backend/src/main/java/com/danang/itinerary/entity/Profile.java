package com.danang.itinerary.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Data
public class Profile {

    @Id
    private UUID id;

    private String displayName;
    private String avatarUrl;
    private String bio;

    private String role;
    private String vipStatus;
    private ZonedDateTime vipStartedAt;
    private ZonedDateTime vipExpiresAt;

    private String homeCity;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> travelStyle;

    private String preferredTransport;
    private String travelWith;

    private Integer aiMsgCount;
    private LocalDate aiMsgResetDate;
    private String termsVersion;
    private ZonedDateTime termsAcceptedAt;
    private Boolean isBanned;

    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
