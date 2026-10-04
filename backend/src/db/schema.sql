-- PostgreSQL Schema for Society Management & Building Maintenance System
-- Phase 1 MVP Schema (Idempotent)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Societies
CREATE TABLE IF NOT EXISTS societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    upi_id VARCHAR(100),
    upi_qr_image_url TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    late_fee_type VARCHAR(20) DEFAULT 'PERCENTAGE', -- 'FLAT', 'PERCENTAGE'
    late_fee_value INTEGER DEFAULT 500, -- 500 paise or 500 bps (5%)
    grace_period_days INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hierarchy: Buildings, Wings, Floors, Flats
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_buildings_society ON buildings(society_id);

CREATE TABLE IF NOT EXISTS wings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wings_building ON wings(building_id);

CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    wing_id UUID NOT NULL REFERENCES wings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_floors_wing ON floors(wing_id);

CREATE TABLE IF NOT EXISTS flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
    wing_id UUID REFERENCES wings(id) ON DELETE CASCADE,
    flat_number VARCHAR(50) NOT NULL,
    carpet_area_sqft NUMERIC(8, 2),
    occupancy_status VARCHAR(20) DEFAULT 'OCCUPIED', -- 'OCCUPIED', 'VACANT'
    tenant_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(society_id, flat_number)
);
CREATE INDEX IF NOT EXISTS idx_flats_society ON flats(society_id);

-- 3. Users, Auth & Sessions
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES flats(id) ON DELETE SET NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'OWNER', -- 'CHAIRMAN', 'OWNER'
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255), -- for Chairman
    pin_hash VARCHAR(255),      -- for Member 4-digit PIN
    is_active BOOLEAN DEFAULT TRUE,
    invite_code VARCHAR(10),
    invite_code_expires_at TIMESTAMPTZ,
    expo_push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(society_id, mobile)
);
CREATE INDEX IF NOT EXISTS idx_users_society_mobile ON users(society_id, mobile);
CREATE INDEX IF NOT EXISTS idx_users_flat ON users(flat_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Billing & Invoices (Integer Paise)
CREATE TABLE IF NOT EXISTS bill_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    base_amount_paise BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bill_number VARCHAR(50) NOT NULL,
    billing_period_month INTEGER NOT NULL, -- 1 to 12
    billing_period_year INTEGER NOT NULL,  -- e.g. 2026
    base_amount_paise BIGINT NOT NULL,
    additional_charges_paise BIGINT DEFAULT 0,
    late_fee_paise BIGINT DEFAULT 0,
    discount_paise BIGINT DEFAULT 0,
    total_amount_paise BIGINT NOT NULL,
    paid_amount_paise BIGINT DEFAULT 0,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    -- 'DRAFT', 'PENDING', 'VERIFICATION_PENDING', 'PARTIALLY_PAID', 'PAID', 'REJECTED', 'OVERDUE', 'CANCELLED'
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id, bill_number)
);
CREATE INDEX IF NOT EXISTS idx_bills_flat ON maintenance_bills(flat_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON maintenance_bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON maintenance_bills(due_date);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES maintenance_bills(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount_paise BIGINT NOT NULL
);

-- 5. Payments, Verification & Receipts
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES maintenance_bills(id) ON DELETE RESTRICT,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_method VARCHAR(20) NOT NULL, -- 'UPI', 'CASH'
    amount_paise BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    utr VARCHAR(100),
    screenshot_url TEXT,
    remarks TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING', 'AWAITING_CONFIRMATION', 'APPROVED', 'REJECTED'
    rejection_reason TEXT,
    cash_otp VARCHAR(6),
    cash_otp_expires_at TIMESTAMPTZ,
    cash_otp_attempts INTEGER DEFAULT 0,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Conditionally add unique constraint on (society_id, utr) where utr is not null
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_society_utr'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT uq_society_utr UNIQUE (society_id, utr);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    bill_id UUID NOT NULL REFERENCES maintenance_bills(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS member_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id, user_id, flat_id)
);

-- 6. Complaints & Discussion Thread
CREATE TABLE IF NOT EXISTS complaint_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id, name)
);

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES complaint_tags(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED', 'REOPENED'
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaints_society_status ON complaints(society_id, status);

CREATE TABLE IF NOT EXISTS complaint_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaint_messages ON complaint_messages(complaint_id);

CREATE TABLE IF NOT EXISTS complaint_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    message_id UUID REFERENCES complaint_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Expenses & Financial Transparency
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount_paise BIGINT NOT NULL,
    expense_date DATE NOT NULL,
    vendor_name VARCHAR(255),
    invoice_number VARCHAR(100),
    payment_method VARCHAR(50),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_society_date ON expenses(society_id, expense_date);

CREATE TABLE IF NOT EXISTS expense_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_transparency_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    visibility_level VARCHAR(20) NOT NULL DEFAULT 'SUMMARY', -- 'PRIVATE', 'SUMMARY', 'DETAILED'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id)
);

-- 8. Announcements & Notifications
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'IMPORTANT', 'EMERGENCY'
    image_url TEXT,
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_society ON announcements(society_id);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- 9. Audit Logging (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_society_entity ON audit_logs(society_id, entity, entity_id);
