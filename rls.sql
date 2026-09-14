-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE refuelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour users
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (current_setting('app.current_role', true) = 'Administrateur');

CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (current_setting('app.current_user_id', true)::int = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (current_setting('app.current_user_id', true)::int = id);

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (current_setting('app.current_role', true) = 'Administrateur');

-- Politiques pour refuelings
CREATE POLICY "Drivers can insert refuelings" ON refuelings
  FOR INSERT WITH CHECK (
    current_setting('app.current_role', true) IN ('Conducteur', 'DAF', 'Administrateur')
  );

CREATE POLICY "All users can view own refuelings" ON refuelings
  FOR SELECT USING (
    current_setting('app.current_user_id', true)::int = driver_id OR
    current_setting('app.current_role', true) = 'Administrateur'
  );

-- Politiques pour vehicles
CREATE POLICY "Admins can manage vehicles" ON vehicles
  FOR ALL USING (current_setting('app.current_role', true) = 'Administrateur');

CREATE POLICY "Drivers can view vehicles" ON vehicles
  FOR SELECT USING (true);

-- Ajoutez des politiques similaires pour engines, drivers, audit_logs selon vos besoins.
