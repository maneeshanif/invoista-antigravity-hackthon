-- Create extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    preferred_language VARCHAR(50) DEFAULT 'en',
    area VARCHAR(255),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROVIDERS Table
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    area VARCHAR(255),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    rating DOUBLE PRECISION DEFAULT 0.0,
    jobs_completed INT DEFAULT 0,
    price_range VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROVIDER_SLOTS Table
CREATE TABLE provider_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time VARCHAR(50) NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, slot_date, slot_time)
);

-- BOOKINGS Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    slot_id UUID NOT NULL REFERENCES provider_slots(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'pending',
    confirmation_code VARCHAR(100) UNIQUE,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SESSIONS Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_input TEXT NOT NULL,
    detected_language VARCHAR(50),
    status VARCHAR(50) DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- INTENT_RESULTS Table
CREATE TABLE intent_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    service_type VARCHAR(100),
    location_text VARCHAR(255),
    time_preference VARCHAR(100),
    urgency VARCHAR(50),
    extracted_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TRACE_LOGS Table
CREATE TABLE trace_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    step INT NOT NULL,
    agent_name VARCHAR(100),
    tool_used VARCHAR(100),
    input_payload JSONB,
    output_payload JSONB,
    output_summary TEXT,
    duration_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data for Demo Scenario (AC Technician in G-13 tomorrow morning)

-- 1. Demo User
INSERT INTO users (id, clerk_user_id, name, phone, role, preferred_language, area, lat, lng)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'demo_user_clerk_123',
    'Demo User',
    '+923000000000',
    'user',
    'en',
    'G-13, Islamabad',
    33.6491,
    72.9818
);

-- 2. Providers (AC Technicians in G-13)
INSERT INTO providers (id, name, category, area, lat, lng, rating, jobs_completed, price_range, is_active)
VALUES 
    (
        '22222222-2222-2222-2222-222222222221',
        'Ali AC Repairs',
        'AC Technician',
        'G-13, Islamabad',
        33.6500,
        72.9820,
        4.8,
        145,
        '$$',
        true
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Cool Tech Services',
        'AC Technician',
        'G-13, Islamabad',
        33.6480,
        72.9800,
        4.5,
        89,
        '$',
        true
    );

-- 3. Provider Slots (Tomorrow morning)
INSERT INTO provider_slots (id, provider_id, slot_date, slot_time, is_booked)
VALUES 
    (
        '33333333-3333-3333-3333-333333333331',
        '22222222-2222-2222-2222-222222222221',
        CURRENT_DATE + interval '1 day',
        '09:00 AM',
        false
    ),
    (
        '33333333-3333-3333-3333-333333333332',
        '22222222-2222-2222-2222-222222222221',
        CURRENT_DATE + interval '1 day',
        '10:30 AM',
        false
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        CURRENT_DATE + interval '1 day',
        '09:30 AM',
        false
    );
