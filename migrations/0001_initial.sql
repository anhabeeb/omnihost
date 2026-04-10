CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  guesthouse_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  currency TEXT NOT NULL,
  quote_prefix TEXT NOT NULL,
  invoice_prefix TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floor TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  rate REAL NOT NULL,
  status TEXT NOT NULL,
  color TEXT NOT NULL,
  amenities_json TEXT NOT NULL DEFAULT '[]',
  package_options_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  room_id TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER NOT NULL,
  nightly_rate REAL NOT NULL,
  cleaning_fee REAL NOT NULL,
  tax_amount REAL NOT NULL,
  discount_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  selected_packages_json TEXT NOT NULL DEFAULT '[]',
  special_requests TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  document_number TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  currency TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  line_items_json TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL,
  tax_amount REAL NOT NULL,
  discount_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  document_id TEXT,
  kind TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider_message_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  error_message TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings (room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON bookings (updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON documents (booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_updated_at ON email_logs (updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (token_hash);

INSERT OR IGNORE INTO rooms (
  id,
  name,
  floor,
  capacity,
  rate,
  status,
  color,
  amenities_json,
  package_options_json,
  created_at,
  updated_at
) VALUES
  ('room-coral-1', 'Coral Courtyard', 'Garden Level', 2, 128, 'ready', '#d26749', '["Patio breakfast", "Rain shower", "Courtyard access"]', '[{"id":"pkg-full-board","name":"Full Board","description":"Breakfast, lunch, and dinner daily.","pricingMode":"perNight","price":48},{"id":"pkg-half-board","name":"Half Board","description":"Breakfast and dinner daily.","pricingMode":"perNight","price":26},{"id":"pkg-airport","name":"Airport pickup","description":"Private arrival transfer.","pricingMode":"perStay","price":34}]', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z'),
  ('room-tide-2', 'Tide Studio', 'Second Floor', 2, 146, 'ready', '#2d6a8e', '["Sea-view balcony", "Streaming TV", "Express laundry"]', '[{"id":"pkg-full-board","name":"Full Board","description":"Breakfast, lunch, and dinner daily.","pricingMode":"perNight","price":52},{"id":"pkg-half-board","name":"Half Board","description":"Breakfast and dinner daily.","pricingMode":"perNight","price":28},{"id":"pkg-romance","name":"Romance setup","description":"Flowers and sparkling welcome.","pricingMode":"perStay","price":45}]', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z'),
  ('room-palm-3', 'Palm Loft', 'Second Floor', 3, 164, 'ready', '#4f8c6b', '["Kitchenette", "Work nook", "Late check-out"]', '[{"id":"pkg-full-board","name":"Full Board","description":"Breakfast, lunch, and dinner daily.","pricingMode":"perNight","price":58},{"id":"pkg-half-board","name":"Half Board","description":"Breakfast and dinner daily.","pricingMode":"perNight","price":34},{"id":"pkg-workcation","name":"Workcation desk kit","description":"Monitor, ergonomic chair, and coffee refills.","pricingMode":"perStay","price":39}]', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z'),
  ('room-sun-4', 'Sunline Family Suite', 'Third Floor', 4, 210, 'ready', '#f2a64d', '["Two bedrooms", "Family dining", "Airport pickup"]', '[{"id":"pkg-full-board","name":"Full Board","description":"Breakfast, lunch, and dinner daily.","pricingMode":"perNight","price":68},{"id":"pkg-half-board","name":"Half Board","description":"Breakfast and dinner daily.","pricingMode":"perNight","price":38},{"id":"pkg-kids-club","name":"Kids explorer pack","description":"Craft kits, snacks, and child amenities.","pricingMode":"perStay","price":49}]', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z'),
  ('room-harbor-5', 'Harbor View Suite', 'Top Floor', 2, 235, 'ready', '#0f3557', '["Panoramic view", "Private lounge", "Signature minibar"]', '[{"id":"pkg-full-board","name":"Full Board","description":"Breakfast, lunch, and dinner daily.","pricingMode":"perNight","price":74},{"id":"pkg-half-board","name":"Half Board","description":"Breakfast and dinner daily.","pricingMode":"perNight","price":44},{"id":"pkg-chef-table","name":"Private chef tasting","description":"In-suite dinner for two.","pricingMode":"custom","price":160}]', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');
