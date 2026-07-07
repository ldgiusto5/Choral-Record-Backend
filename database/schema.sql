CREATE DATABASE IF NOT EXISTS choral_Record;
USE choral_Record;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS choirs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    image_file VARCHAR(255) NULL,
    place VARCHAR(255) NULL,
    country VARCHAR(255) NULL,
    created_by INT NULL,
    creator_name VARCHAR(150) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS choir_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    choir_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'member', -- 'admin', 'member'
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (choir_id) REFERENCES choirs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_choir_user (choir_id, user_id)
);

CREATE TABLE IF NOT EXISTS pieces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    choir_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    partitura_file VARCHAR(255) NULL,
    voz_coral_file VARCHAR(255) NULL,
    voz_soprano_file VARCHAR(255) NULL,
    voz_contralto_file VARCHAR(255) NULL,
    voz_tenor_file VARCHAR(255) NULL,
    voz_bajo_file VARCHAR(255) NULL,
    base_instrumental_file VARCHAR(255) NULL,
    info_adicional_file VARCHAR(255) NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    has_lyrics BOOLEAN DEFAULT FALSE,
    lyrics TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (choir_id) REFERENCES choirs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    type ENUM('password_reset', 'email_verification') NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    choir_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_file VARCHAR(255) NULL,
    event_date DATETIME NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    info_file VARCHAR(255) NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (choir_id) REFERENCES choirs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
