CREATE DATABASE IF NOT EXISTS ticketing;
USE ticketing;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','organiser','customer') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0)
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  venue_id INT NOT NULL,
  organiser_id INT NOT NULL,
  event_date DATETIME NOT NULL,
  ticket_price DECIMAL(8,2) NOT NULL CHECK (ticket_price >= 0),
  total_tickets INT NOT NULL CHECK (total_tickets > 0),
  available_tickets INT NOT NULL CHECK (available_tickets >= 0),
  status ENUM('draft','published','cancelled') NOT NULL DEFAULT 'published',
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (organiser_id) REFERENCES users(id),
  INDEX idx_events_date (event_date)
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  INDEX idx_bookings_user (user_id)
);
