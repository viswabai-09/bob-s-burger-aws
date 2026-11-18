-- Bob's Burger database schema - Version 1.0 (Day 5)
-- Run once, as the RDS master user:
--   mysql -h YOUR-RDS-ENDPOINT -u YOUR-MASTER-USER -p < schema.sql
--
-- Three tables:
--   customers    one row per order (who ordered, where to deliver)
--   orders       one row per order (money and status); order_id is the number the customer sees
--   order_items  one row per burger line in an order
-- Money is stored as whole rupees (INR), the same as the website and the backend.

CREATE DATABASE IF NOT EXISTS bobsburger CHARACTER SET utf8mb4;
USE bobsburger;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(60)  NOT NULL,
  phone       VARCHAR(16)  NOT NULL,
  address     VARCHAR(250) NOT NULL,
  email       VARCHAR(100) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  order_id    CHAR(11)     NOT NULL,            -- "BB-" plus 8 hex characters
  customer_id INT UNSIGNED NOT NULL,
  subtotal    INT UNSIGNED NOT NULL,
  discount    INT UNSIGNED NOT NULL,
  total       INT UNSIGNED NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY idx_orders_customer (customer_id),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  order_id      CHAR(11)         NOT NULL,
  item_id       VARCHAR(10)      NOT NULL,      -- for example TH01
  item_name     VARCHAR(60)      NOT NULL,
  quantity      TINYINT UNSIGNED NOT NULL,
  unit_price    INT UNSIGNED     NOT NULL,
  PRIMARY KEY (order_item_id),
  KEY idx_items_order (order_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (order_id)
) ENGINE=InnoDB;
