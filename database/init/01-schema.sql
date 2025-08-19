-- Esquema de base de datos para GausControl IoT
-- Sistema de monitoreo de velocidad en tiempo real

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de vehículos
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'car',
    registration_number VARCHAR(20),
    owner_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Tabla de registros de velocidad
CREATE TABLE speed_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(20) NOT NULL,
    speed DECIMAL(5,2) NOT NULL,
    speed_limit DECIMAL(5,2) DEFAULT 60.00,
    location JSONB, -- {latitude: float, longitude: float}
    metadata JSONB, -- Información adicional
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de alertas
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id VARCHAR(20) NOT NULL,
    type VARCHAR(20) DEFAULT 'SPEED_VIOLATION',
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    speed DECIMAL(5,2) NOT NULL,
    speed_limit DECIMAL(5,2) NOT NULL,
    exceed_amount DECIMAL(5,2) NOT NULL,
    exceed_percentage DECIMAL(5,2) NOT NULL,
    is_consecutive BOOLEAN DEFAULT false,
    consecutive_count INTEGER DEFAULT 1,
    location JSONB,
    vehicle_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'DISMISSED')),
    priority VARCHAR(10) DEFAULT 'NORMAL',
    recommended_action TEXT,
    description TEXT,
    additional_data JSONB,
    violation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de estadísticas de vehículos (agregadas)
CREATE TABLE vehicle_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    total_records INTEGER DEFAULT 0,
    total_violations INTEGER DEFAULT 0,
    avg_speed DECIMAL(5,2) DEFAULT 0,
    max_speed DECIMAL(5,2) DEFAULT 0,
    violation_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_id, date)
);

-- Índices para optimización
CREATE INDEX idx_speed_records_vehicle_id ON speed_records(vehicle_id);
CREATE INDEX idx_speed_records_timestamp ON speed_records(timestamp);
CREATE INDEX idx_speed_records_received_at ON speed_records(received_at);
CREATE INDEX idx_speed_records_vehicle_timestamp ON speed_records(vehicle_id, timestamp);

CREATE INDEX idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_vehicle_created ON alerts(vehicle_id, created_at);

CREATE INDEX idx_vehicles_vehicle_id ON vehicles(vehicle_id);
CREATE INDEX idx_vehicles_active ON vehicles(is_active);

CREATE INDEX idx_vehicle_stats_vehicle_date ON vehicle_stats(vehicle_id, date);
CREATE INDEX idx_vehicle_stats_date ON vehicle_stats(date);

-- Función para actualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_stats_updated_at 
    BEFORE UPDATE ON vehicle_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para generar estadísticas diarias
CREATE OR REPLACE FUNCTION generate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
BEGIN
    -- Insertar o actualizar estadísticas del día
    INSERT INTO vehicle_stats (
        vehicle_id, 
        date, 
        total_records, 
        total_violations, 
        avg_speed, 
        max_speed, 
        violation_rate
    )
    SELECT 
        sr.vehicle_id,
        target_date,
        COUNT(*) as total_records,
        COUNT(CASE WHEN sr.speed > sr.speed_limit THEN 1 END) as total_violations,
        ROUND(AVG(sr.speed), 2) as avg_speed,
        ROUND(MAX(sr.speed), 2) as max_speed,
        ROUND(
            (COUNT(CASE WHEN sr.speed > sr.speed_limit THEN 1 END) * 100.0 / COUNT(*)), 
            2
        ) as violation_rate
    FROM speed_records sr
    WHERE DATE(sr.timestamp) = target_date
    GROUP BY sr.vehicle_id
    ON CONFLICT (vehicle_id, date) 
    DO UPDATE SET
        total_records = EXCLUDED.total_records,
        total_violations = EXCLUDED.total_violations,
        avg_speed = EXCLUDED.avg_speed,
        max_speed = EXCLUDED.max_speed,
        violation_rate = EXCLUDED.violation_rate,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Insertar algunos datos de ejemplo para desarrollo
INSERT INTO vehicles (vehicle_id, vehicle_type, registration_number) VALUES
('VEH001', 'car', 'ABC-123'),
('VEH002', 'truck', 'XYZ-456'),
('VEH003', 'bus', 'BUS-789');

-- Comentarios para documentación
COMMENT ON TABLE vehicles IS 'Información de vehículos registrados en el sistema';
COMMENT ON TABLE speed_records IS 'Registros de velocidad en tiempo real';
COMMENT ON TABLE alerts IS 'Alertas generadas por violaciones de velocidad';
COMMENT ON TABLE vehicle_stats IS 'Estadísticas agregadas diarias por vehículo';

COMMENT ON FUNCTION generate_daily_stats IS 'Genera estadísticas diarias agregadas para análisis';
COMMENT ON FUNCTION update_updated_at_column IS 'Actualiza automáticamente el campo updated_at';

-- Permisos para el usuario de la aplicación
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gaus_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gaus_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gaus_user;
