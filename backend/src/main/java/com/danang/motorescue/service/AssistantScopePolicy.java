package com.danang.motorescue.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class AssistantScopePolicy {
    public enum Disposition { EMERGENCY, GREETING, DIAGNOSIS, SENSITIVE_DATA, IN_SCOPE, OUT_OF_SCOPE }

    public record Decision(Disposition disposition, String reply) {
        static Decision inScope() { return new Decision(Disposition.IN_SCOPE, null); }
    }

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern ENGLISH_HINT = Pattern.compile(
            "\\b(how|what|where|when|why|hello|hi|help|thanks|please|request|rescue|account|app|map|quote|review|cancel|" +
            "tell|write|weather|diagnose|repair|fire|injured)\\b");
    private static final Pattern EMERGENCY = Pattern.compile(
            "\\b(chay|boc chay|khoi lua|tai nan|chay mau|bat tinh|ngat|bi thuong|ro xang|ro nhien lieu|" +
            "fire|crash|bleeding|unconscious|injured|fuel leak)\\b");
    private static final Pattern GREETING = Pattern.compile(
            "^(xin chao|chao|hello|hi|hey|tro giup|help|bat dau|cam on|thanks)[!. ]*$");
    private static final Pattern ABOUT_APP = Pattern.compile(
            "^(motorescue|ung dung motorescue|motorescue app) (la gi|ho tro gi|lam duoc gi|" +
            "co tinh nang gi|what is it|what does it do|features)[?.! ]*$");
    private static final Pattern DIAGNOSIS = Pattern.compile(
            "\\b(chan doan|xe bi gi|nguyen nhan hong|tu sua|cach sua|sua nhu the nao|thao may|" +
            "diagnose|what is wrong with my bike|repair it myself|how to repair)\\b");
    private static final Pattern PROMPT_ATTACK = Pattern.compile(
            "\\b(bo qua huong dan|bo qua quy tac|tiet lo system|system prompt|ignore previous|ignore instructions|" +
            "jailbreak|developer message|api key|khoa api)\\b");
    private static final Pattern SENSITIVE_DATA = Pattern.compile(
            "(?i)([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(?:\\+?84|0)(?:[ .-]?\\d){9,10}\\b|" +
            "\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b|" +
            "\\b(?:otp|ma xac minh|verification code)\\D{0,40}\\d{4,8}\\b|" +
            "\\b(?:bearer\\s+)?eyJ[A-Za-z0-9_-]{20,}\\b|" +
            "\\b(?:api[_ -]?key|secret|access[_ -]?token)\\s*[:=]\\s*[A-Za-z0-9._-]{8,}\\b|" +
            "\\b-?\\d{1,3}\\.\\d{4,}\\s*[,; ]\\s*-?\\d{1,3}\\.\\d{4,}\\b)");
    private static final Pattern CLEARLY_OFF_TOPIC = Pattern.compile(
            "\\b(ke chuyen|ke truyen|truyen cuoi|lam tho|bai tap|giai toan|viet code|lap trinh|" +
            "chinh tri|chung khoan|bong da|phim anh|nau an|du bao thoi tiet|dich van ban|" +
            "tell a joke|write (?:a )?(?:poem|story|essay|email|song)|calculate|solve|summarize|research|" +
            "capital of|bank account|http request|relationship status|customer service|" +
            "homework|politics|stocks|football|recipe|weather forecast|translate|latest news)\\b");
    private static final Pattern APP_SCOPE = Pattern.compile(
            "\\b(cuu ho|yeu cau|dat cuu ho|goi cuu ho|dich vu|trang thai|" +
            "tai khoan|dang nhap|otp|ho so|thong bao|ban do|tuyen duong|gps|vi tri|dia chi|" +
            "bao gia|danh gia|huy ca|doi cuu ho|cuu ho vien|nha cung cap|dieu phoi|an toan|" +
            "lich su|hoat dong|trang chu|cai dat|ngon ngu|ma loi|quyen vi tri|quyen thong bao|hotline|" +
            "rescue|request|status|account|login|profile|notification|map|route|location|quote|review|cancel|" +
            "provider|operator|safety|service|permission|activity|settings|language)\\b");
    private static final Pattern GENERIC_APP_HELP = Pattern.compile(
            "\\b(cach dung|huong dan|tro giup|help|how to use|use|using)\\b.{0,40}\\b(ung dung|app|motorescue)\\b|" +
            "\\b(ung dung|app|motorescue)\\b.{0,40}\\b(cach dung|huong dan|tro giup|help|how|use|using)\\b");

    public Decision classify(String input) {
        String normalized = normalize(input);
        boolean english = ENGLISH_HINT.matcher(normalized).find();
        if (EMERGENCY.matcher(normalized).find()) {
            return new Decision(Disposition.EMERGENCY,
                    english
                            ? "If someone is injured or there is fire or a fuel leak, move away from danger and call the appropriate 113/114/115 service first. MotoRescue does not replace emergency services."
                            : "Nếu có người bị thương, cháy hoặc rò nhiên liệu, hãy rời khỏi vị trí nguy hiểm và gọi 113/114/115 phù hợp trước. MotoRescue không thay thế dịch vụ khẩn cấp.");
        }
        if (GREETING.matcher(normalized).matches()) {
            return new Decision(Disposition.GREETING,
                    english
                            ? "I can help with rescue requests, status tracking, quotes, maps, accounts and other MotoRescue features."
                            : "Tôi có thể hướng dẫn bạn tạo yêu cầu cứu hộ, theo dõi trạng thái, báo giá, bản đồ, tài khoản và các tính năng của MotoRescue.");
        }
        if (ABOUT_APP.matcher(normalized).matches()) {
            return new Decision(Disposition.GREETING,
                    english
                            ? "MotoRescue coordinates verified motorcycle rescue teams. You can create and track a technical rescue request, review a quote, follow a real road route when available, and confirm arrival or completion in the app."
                            : "MotoRescue điều phối các đội cứu hộ xe máy đã xác minh. Bạn có thể tạo và theo dõi yêu cầu hỗ trợ kỹ thuật, xem báo giá, theo dõi tuyến đường thực tế khi khả dụng và xác nhận cứu hộ viên đã đến hoặc hoàn tất trong ứng dụng.");
        }
        if (PROMPT_ATTACK.matcher(normalized).find()) {
            return outOfScope(english);
        }
        if (SENSITIVE_DATA.matcher(normalized).find()) {
            return new Decision(Disposition.SENSITIVE_DATA,
                    english
                            ? "Please remove phone numbers, OTP codes, email addresses, account IDs and exact coordinates before asking."
                            : "Hãy xóa số điện thoại, mã OTP, email, mã tài khoản và tọa độ chính xác trước khi đặt câu hỏi.");
        }
        if (DIAGNOSIS.matcher(normalized).find()) {
            return new Decision(Disposition.DIAGNOSIS,
                    english
                            ? "I cannot diagnose a vehicle or guide self-repair. Create a MotoRescue request, describe only what you observe, and wait for a rescuer to inspect it safely."
                            : "Tôi không chẩn đoán hoặc hướng dẫn tự sửa xe. Bạn có thể tạo yêu cầu MotoRescue, mô tả dấu hiệu quan sát được và chờ cứu hộ viên kiểm tra an toàn.");
        }
        if (CLEARLY_OFF_TOPIC.matcher(normalized).find()) {
            return outOfScope(english);
        }
        return APP_SCOPE.matcher(normalized).find() || GENERIC_APP_HELP.matcher(normalized).find()
                ? Decision.inScope()
                : outOfScope(english);
    }

    public boolean allowsGeneratedReply(String reply) {
        String normalized = normalize(reply);
        if (normalized.isBlank()
                || PROMPT_ATTACK.matcher(normalized).find()
                || SENSITIVE_DATA.matcher(normalized).find()
                || CLEARLY_OFF_TOPIC.matcher(normalized).find()
                || DIAGNOSIS.matcher(normalized).find()) {
            return false;
        }
        return APP_SCOPE.matcher(normalized).find() || GENERIC_APP_HELP.matcher(normalized).find();
    }

    public String outOfScopeReply(String input) {
        return outOfScope(ENGLISH_HINT.matcher(normalize(input)).find()).reply();
    }

    private static Decision outOfScope(boolean english) {
        return new Decision(Disposition.OUT_OF_SCOPE,
                english
                        ? "I only answer questions about the MotoRescue app and its in-app rescue process."
                        : "Tôi chỉ hỗ trợ các câu hỏi về ứng dụng MotoRescue và quy trình cứu hộ trong ứng dụng.");
    }

    private static String normalize(String value) {
        String source = value == null ? "" : value.strip().toLowerCase(Locale.ROOT).replace('đ', 'd');
        return DIACRITICS.matcher(Normalizer.normalize(source, Normalizer.Form.NFD))
                .replaceAll("")
                .replaceAll("\\s+", " ");
    }
}
