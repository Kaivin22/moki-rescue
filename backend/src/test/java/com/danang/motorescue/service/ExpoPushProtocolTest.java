package com.danang.motorescue.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExpoPushProtocolTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void preservesTicketOrderAndRecognizesInvalidDevices() throws Exception {
        List<ExpoPushProtocol.Ticket> tickets = ExpoPushProtocol.parseTickets(mapper.readTree("""
                {"data":[
                  {"status":"ok","id":"ticket-0001"},
                  {"status":"error","details":{"error":"DeviceNotRegistered"}}
                ]}
                """), 2);

        assertThat(tickets.get(0).accepted()).isTrue();
        assertThat(tickets.get(0).id()).isEqualTo("ticket-0001");
        assertThat(tickets.get(1).accepted()).isFalse();
        assertThat(ExpoPushProtocol.deviceNotRegistered(tickets.get(1).errorCode())).isTrue();
    }

    @Test
    void parsesReceiptMapWithoutPersistingProviderMessages() throws Exception {
        var receipts = ExpoPushProtocol.parseReceipts(mapper.readTree("""
                {"data":{
                  "ticket-0001":{"status":"ok"},
                  "ticket-0002":{"status":"error","message":"provider detail","details":{"error":"MessageRateExceeded"}}
                }}
                """));

        assertThat(receipts.get("ticket-0001").delivered()).isTrue();
        assertThat(receipts.get("ticket-0002").errorCode()).isEqualTo("MessageRateExceeded");
    }

    @Test
    void rejectsMisalignedTicketBatches() throws Exception {
        var response = mapper.readTree("{\"data\":[{\"status\":\"ok\",\"id\":\"ticket-0001\"}]}");

        assertThatThrownBy(() -> ExpoPushProtocol.parseTickets(response, 2))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
