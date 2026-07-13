package com.example.chatbot;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ChatbotApplication {
    public static void main(String[] args) {
        // Load environment variables from .env file into System properties for Spring to resolve
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory("./")
                    .ignoreIfMalformed()
                    .ignoreIfMissing()
                    .load();
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
            });
        } catch (Exception e) {
            System.err.println("Warning: Could not load .env file: " + e.getMessage());
        }

        // Run schema migration prior to Hibernate context initialization
        runDatabaseMigration();

        SpringApplication.run(ChatbotApplication.class, args);
    }

    private static void runDatabaseMigration() {
        String dbUrl = "jdbc:mysql://localhost:3306/chatbot_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata";
        String dbUser = "root";
        String dbPass = "admin";

        try {
            // Check if overridden by System properties/env
            String envUrl = System.getenv("SPRING_DATASOURCE_URL");
            if (envUrl == null) envUrl = System.getProperty("spring.datasource.url");
            if (envUrl != null) dbUrl = envUrl;

            String envUser = System.getenv("SPRING_DATASOURCE_USERNAME");
            if (envUser == null) envUser = System.getProperty("spring.datasource.username");
            if (envUser != null) dbUser = envUser;

            String envPass = System.getenv("SPRING_DATASOURCE_PASSWORD");
            if (envPass == null) envPass = System.getProperty("spring.datasource.password");
            if (envPass != null) dbPass = envPass;

            logMigration("Connecting to database: " + dbUrl);

            Class.forName("com.mysql.cj.jdbc.Driver");
            try (java.sql.Connection conn = java.sql.DriverManager.getConnection(dbUrl, dbUser, dbPass)) {
                
                // Migrate users table
                migrateUsersTable(conn);
                
                // Migrate otp_verification table
                migrateOtpTable(conn);
                
                logMigration("Database schema migration completed successfully.");
            }
        } catch (Exception e) {
            System.err.println("Database migration failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void migrateUsersTable(java.sql.Connection conn) throws java.sql.SQLException {
        boolean usersTableExists = false;
        try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "users", null)) {
            if (rs.next()) {
                usersTableExists = true;
            }
        }

        if (!usersTableExists) {
            logMigration("Users table does not exist yet. Hibernate will create it on start.");
            return;
        }

        logMigration("Users table found. Checking schema columns...");

        // Detect columns
        boolean hasFullName = false;
        boolean hasName = false;
        boolean hasUpdatedAt = false;
        boolean hasCreatedAt = false;
        boolean hasPassword = false;
        boolean hasEmailVerified = false;
        boolean hasRole = false;
        boolean hasProvider = false;
        boolean hasStatus = false;

        try (java.sql.ResultSet rs = conn.getMetaData().getColumns(null, null, "users", null)) {
            while (rs.next()) {
                String colName = rs.getString("COLUMN_NAME");
                if ("full_name".equalsIgnoreCase(colName)) hasFullName = true;
                if ("name".equalsIgnoreCase(colName)) hasName = true;
                if ("updated_at".equalsIgnoreCase(colName)) hasUpdatedAt = true;
                if ("created_at".equalsIgnoreCase(colName)) hasCreatedAt = true;
                if ("password".equalsIgnoreCase(colName)) hasPassword = true;
                if ("email_verified".equalsIgnoreCase(colName)) hasEmailVerified = true;
                if ("role".equalsIgnoreCase(colName)) hasRole = true;
                if ("provider".equalsIgnoreCase(colName)) hasProvider = true;
                if ("status".equalsIgnoreCase(colName)) hasStatus = true;
            }
        }

        // Execute alters if missing
        try (java.sql.Statement stmt = conn.createStatement()) {
            if (!hasPassword) {
                logMigration("Adding 'password' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN password VARCHAR(255) DEFAULT NULL");
            }
            if (!hasEmailVerified) {
                logMigration("Adding 'email_verified' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0");
            }
            if (!hasRole) {
                logMigration("Adding 'role' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'USER'");
            }
            if (!hasProvider) {
                logMigration("Adding 'provider' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'EMAIL'");
            }
            if (!hasStatus) {
                logMigration("Adding 'status' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'PENDING'");
            }
            if (!hasCreatedAt) {
                logMigration("Adding 'created_at' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
            }
            if (!hasUpdatedAt) {
                logMigration("Adding 'updated_at' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            }
            if (!hasFullName) {
                logMigration("Adding 'full_name' column to users...");
                stmt.executeUpdate("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) DEFAULT NULL");
                
                // Migrate legacy 'name' column if it exists
                if (hasName) {
                    logMigration("Migrating data from 'name' to 'full_name'...");
                    stmt.executeUpdate("UPDATE users SET full_name = name WHERE full_name IS NULL");
                } else {
                    stmt.executeUpdate("UPDATE users SET full_name = SUBSTRING_INDEX(email, '@', 1) WHERE full_name IS NULL");
                }
            }
        }
    }

    private static void migrateOtpTable(java.sql.Connection conn) throws java.sql.SQLException {
        boolean tableExists = false;
        try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "otp_verification", null)) {
            if (rs.next()) {
                tableExists = true;
            }
        }

        if (!tableExists) {
            logMigration("otp_verification table does not exist yet. Hibernate will create it on start.");
            return;
        }

        logMigration("otp_verification table found. Checking schema columns...");

        boolean hasPurpose = false;
        boolean hasVerified = false;

        try (java.sql.ResultSet rs = conn.getMetaData().getColumns(null, null, "otp_verification", null)) {
            while (rs.next()) {
                String colName = rs.getString("COLUMN_NAME");
                if ("purpose".equalsIgnoreCase(colName)) hasPurpose = true;
                if ("verified".equalsIgnoreCase(colName)) hasVerified = true;
            }
        }

        try (java.sql.Statement stmt = conn.createStatement()) {
            if (!hasPurpose) {
                logMigration("Adding 'purpose' column to otp_verification...");
                stmt.executeUpdate("ALTER TABLE otp_verification ADD COLUMN purpose VARCHAR(50) DEFAULT 'SIGNUP'");
            }
            if (hasVerified) {
                logMigration("Dropping legacy 'verified' column from otp_verification...");
                stmt.executeUpdate("ALTER TABLE otp_verification DROP COLUMN verified");
            }
        }
    }

    private static void logMigration(String msg) {
        System.out.println("[DB-MIGRATION] " + msg);
    }
}
