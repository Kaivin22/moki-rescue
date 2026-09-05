# syntax=docker/dockerfile:1
FROM maven:3.9.11-eclipse-temurin-21@sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237 AS build
WORKDIR /build
COPY pom.xml ./
COPY src/main ./src/main
COPY docker/Healthcheck.java ./docker/Healthcheck.java
# CI/full local tests run separately with Docker. No Docker socket inside this build.
RUN --mount=type=cache,target=/root/.m2 mvn --batch-mode --no-transfer-progress -Dmaven.test.skip=true package
RUN javac -d /build/healthcheck docker/Healthcheck.java

FROM eclipse-temurin:21-jre-jammy@sha256:eebd356ad7358b7094758e5787a6726f332917cfd56feab6457c56dab895cdbf AS runtime
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/moki-rescue-0.0.1-SNAPSHOT.jar /app/app.jar
COPY --from=build --chown=10001:10001 /build/healthcheck /app/healthcheck
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["java", "-cp", "/app/healthcheck", "Healthcheck"]
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
