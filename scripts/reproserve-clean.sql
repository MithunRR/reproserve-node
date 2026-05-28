-- ============================================================
--  ReproServe — CLEAN database dump
--  Drops the broken tables and recreates them with ONE unique
--  index per column. Keeps your existing data (Peter, Alice,
--  Plumbing).
--
--  How to import via phpMyAdmin:
--    1. Open phpMyAdmin → select the `reproserve` database
--    2. Click the "Import" tab → choose this file → "Go"
--
--  Or via mysql CLI:
--    mysql -u root reproserve < scripts/reproserve-clean.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `open_house`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `service_types`;
SET FOREIGN_KEY_CHECKS = 1;


-- ------------------------------------------------------------
-- service_types
-- ------------------------------------------------------------
CREATE TABLE `service_types` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(150) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  `isActive`    TINYINT(1)   DEFAULT 1,
  `createdAt`   DATETIME     NOT NULL,
  `updatedAt`   DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_types_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `service_types` (`id`, `name`, `description`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'Plumbing', 'Plumbing repair and installation services', 1, '2026-05-16 05:26:08', '2026-05-16 05:26:08');


-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id`            INT(11)                                                        NOT NULL AUTO_INCREMENT,
  `role`          ENUM('user','service_provider','realtor')                      NOT NULL DEFAULT 'user',
  `firstName`     VARCHAR(100)                                                   NOT NULL,
  `lastName`      VARCHAR(100)                                                   NOT NULL,
  `email`         VARCHAR(150)                                                   NOT NULL,
  `phone`         VARCHAR(20)                                                    DEFAULT NULL,
  `password`      VARCHAR(255)                                                   NOT NULL,
  `streetAddress` VARCHAR(255)                                                   DEFAULT NULL,
  `city`          VARCHAR(100)                                                   DEFAULT NULL,
  `state`         VARCHAR(100)                                                   DEFAULT NULL,
  `zipCode`       VARCHAR(20)                                                    DEFAULT NULL,
  `businessName`  VARCHAR(150)                                                   DEFAULT NULL,
  `serviceTypeId` INT(11)                                                        DEFAULT NULL,
  `businessDesc`  TEXT                                                           DEFAULT NULL,
  `isActive`      TINYINT(1)                                                     DEFAULT 1,
  `createdAt`     DATETIME                                                       NOT NULL,
  `updatedAt`     DATETIME                                                       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_serviceTypeId_fk` (`serviceTypeId`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`serviceTypeId`) REFERENCES `service_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci AUTO_INCREMENT=3;

INSERT INTO `users` (`id`, `role`, `firstName`, `lastName`, `email`, `phone`, `password`, `streetAddress`, `city`, `state`, `zipCode`, `businessName`, `serviceTypeId`, `businessDesc`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'service_provider', 'Peter', 'Parker', 'peter.parker@bestrealty.com', '8555555555', '$2a$10$QJB8igqhbNXqnawMs2508eh3kPj117NDwho49p9UuK2X/rNM055S.', '120 Main St, Suite 4', 'Austin', 'TX', '78701', 'A. B. C', NULL, 'asdf asdf asdf asdf asdf asdf asdf asdf asdf', 1, '2026-05-16 06:09:36', '2026-05-18 15:01:18'),
(2, 'service_provider', 'Alice',  'Carter', 'carter@bestrealty.com',        '8555555555', '$2a$10$DlQWpuQpWCNE5sF7pFSPSurjjoS3w28r/TlPqqDn53rFa8NbvsLtS', '120 Main St, Suite 4', 'Austin', 'TX', '78701', 'A. B. C', NULL, 'asdf asdf asdf asdf asdf asdf asdf asdf asdf', 1, '2026-05-16 06:13:22', '2026-05-16 06:13:22');


-- ------------------------------------------------------------
-- open_house
-- ------------------------------------------------------------
CREATE TABLE `open_house` (
  `id`              INT(11)                                       NOT NULL AUTO_INCREMENT,
  `userId`          INT(11)                                       NOT NULL,
  `role`            ENUM('user','service_provider','realtor')     DEFAULT 'user',
  `propertyType`    VARCHAR(100)                                  NOT NULL,
  `title`           VARCHAR(100)                                  NOT NULL,
  `description`     VARCHAR(500)                                  NOT NULL,
  `specs`           LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specs`)),
  `location`        VARCHAR(255)                                  NOT NULL,
  `price`           DECIMAL(10,2)                                 NOT NULL,
  `squareFootage`   INT(11)                                       DEFAULT NULL,
  `fromDateAndTime` DATETIME                                      NOT NULL,
  `toDateAndTime`   DATETIME                                      DEFAULT NULL,
  `photos`          LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`photos`)),
  `video`           TEXT                                          DEFAULT NULL,
  `isActive`        TINYINT(1)                                    DEFAULT 1,
  `createdAt`       DATETIME                                      NOT NULL,
  `updatedAt`       DATETIME                                      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `open_house_userId_fk` (`userId`),
  CONSTRAINT `open_house_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
