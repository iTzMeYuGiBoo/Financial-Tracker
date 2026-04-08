FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
# Download dependencies first (cached layer — only re-runs when pom.xml changes)
COPY pom.xml .
RUN mvn -q dependency:go-offline -B
# Build the app (re-runs when source changes)
COPY src ./src
RUN mvn -q -e -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
