# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
# wget (busybox) is present in the alpine base and is used by the Compose health check.
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=build /build/target/gateway.jar app.jar
ENV PORT=8080 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
USER app
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:$PORT/ready || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
