import uuid
import random
import os

services = ["AC Technician", "Plumber", "Electrician", "Tutor", "Cleaner"]
areas = ["G-13", "F-8", "I-8", "D-12", "E-11", "Bahria Town", "DHA", "Blue Area", "F-11", "G-11"]
base_lat = 33.6844
base_lng = 73.0479

sql = "-- 20 Mock Providers for Supabase SQL Editor\n\n"
sql += "INSERT INTO providers (id, name, category, area, lat, lng, rating, jobs_completed, price_range, is_active) VALUES\n"

providers = []
for i in range(20):
    pid = str(uuid.uuid4())
    # Generate realistic names
    service = random.choice(services)
    if service == "AC Technician":
        name = random.choice(["Cool Breeze AC", "Chilly Experts", "Islamabad AC Fix", "Frosty Repairs", "Climate Control Pros"])
    elif service == "Plumber":
        name = random.choice(["Pipe Masters", "Quick Leak Fix", "Capital Plumbers", "Flow Experts", "Pindi Plumbing"])
    elif service == "Electrician":
        name = random.choice(["Spark Techs", "Wire Wizards", "Volt Fixers", "Current Experts", "Bright Solutions"])
    elif service == "Tutor":
        name = random.choice(["A+ Academics", "Math Whiz", "Science Tutors", "Language Experts", "Smart Minds"])
    else:
        name = random.choice(["Sparkle Cleaners", "Dust Busters", "Fresh Home", "Tidy Team", "Gleam Services"])
    
    # Ensure uniqueness
    name = f"{name} {i+1}"
    
    area = random.choice(areas)
    lat = base_lat + random.uniform(-0.05, 0.05)
    lng = base_lng + random.uniform(-0.05, 0.05)
    rating = round(random.uniform(3.5, 5.0), 1)
    reviews = random.randint(5, 200)
    price = random.choice(["$", "$$", "$$$"])
    providers.append((pid, name, service, area, lat, lng, rating, reviews, price))

# Format the values for SQL
sql += ",\n".join([f"    ('{p[0]}', '{p[1]}', '{p[2]}', '{p[3]}', {p[4]:.4f}, {p[5]:.4f}, {p[6]}, {p[7]}, '{p[8]}', true)" for p in providers])
sql += ";\n\n"

sql += "-- Provider Slots (Tomorrow)\n"
sql += "INSERT INTO provider_slots (id, provider_id, slot_date, slot_time, is_booked) VALUES\n"
slots = []
for p in providers:
    pid = p[0]
    num_slots = random.randint(1, 3)
    times = random.sample(["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "04:00 PM"], num_slots)
    for t in times:
        sid = str(uuid.uuid4())
        slots.append((sid, pid, t))

sql += ",\n".join([f"    ('{s[0]}', '{s[1]}', CURRENT_DATE + interval '1 day', '{s[2]}', false)" for s in slots])
sql += ";\n"

os.makedirs("supabase", exist_ok=True)
with open("supabase/seed_20_providers.sql", "w") as f:
    f.write(sql)
print("SQL file created at supabase/seed_20_providers.sql")
