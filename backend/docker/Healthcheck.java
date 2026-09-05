import java.net.HttpURLConnection;
import java.net.URI;

/** Dependency-free readiness probe; the runtime image does not need curl or a shell. */
public final class Healthcheck {
    public static void main(String[] args) {
        try {
            String port = System.getenv().getOrDefault("PORT", "8080");
            HttpURLConnection connection = (HttpURLConnection) URI.create(
                    "http://127.0.0.1:" + port + "/api/health/ready").toURL().openConnection();
            connection.setConnectTimeout(2000);
            connection.setReadTimeout(2000);
            int status = connection.getResponseCode();
            connection.disconnect();
            System.exit(status == 200 ? 0 : 1);
        } catch (Exception error) {
            System.exit(1);
        }
    }
}
