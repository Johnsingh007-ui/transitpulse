## 🚀 Quick Launch (Recommended)

For a clean and working setup:

```bash
git clone https://github.com/Johnsingh007-ui/transitpulse.git
cd transitpulse
./start_complete.sh
If issues occur:

bash
Copy
Edit
./fix_requirements.sh      # Fix ports, dependencies, and env
./setup_and_start.sh       # Full setup + launch
Access:

Frontend: http://localhost:3002

Backend API: http://localhost:9002

API Docs: http://localhost:9002/docs

To show only active vehicles with real trips, use:

bash
Copy
Edit
GET /api/v1/vehicles/realtime
GET /api/v1/trips/vehicle/{vehicle_id}/details
For accurate real-time predictions, ensure:

GTFS has today's service_id

TripUpdates are synced with GTFS trips

Static feed was reloaded (gtfs_static_loader)

yaml
Copy
Edit

---

## ✅ Optionally

If you want a lighter public-facing version of the project (for GitHub visitors):
- Keep the full guide in `README-full.md`
- Use a trimmed `README.md` with just the top sections and a link:
  > _“See [README-full.md](README-full.md) for full setup, architecture, and GTFS integration steps.”_

---

Let me know if you'd like me to generate this dual README layout (`README.md` and `README-full.md`) for you directly.



You said:
iw an to shrink my read me


ChatGPT said:
Got it! Here's a shrunk and streamlined version of your README.md that keeps only the essential parts:

markdown
Copy
Edit
# 🚦 TransitPulse 🚌

> Real-time transit monitoring platform powered by live Golden Gate Transit data.

TransitPulse helps transit agencies monitor fleet activity, generate reports, and track on-time performance in real-time.

---

## 🚀 Quick Start

```bash
git clone https://github.com/Johnsingh007-ui/transitpulse.git
cd transitpulse
./start_complete.sh
🔧 If issues:

bash
Copy
Edit
./fix_requirements.sh
./setup_and_start.sh
🌐 Access
Frontend: http://localhost:3002

Backend API: http://localhost:9002

API Docs: http://localhost:9002/docs

🔧 Developer Setup (Manual)
bash
Copy
Edit
# Start PostgreSQL
docker-compose up -d

# Backend
cd transitpulse-backend
python init_db.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload &

# Frontend
cd ../transitpulse-frontend
npm install
npm run dev
✅ Real-time Data Sources (Golden Gate Transit)
GTFS Static: GTFSTransitData.zip

Vehicle Positions: VehiclePositions

Trip Updates: TripUpdates

🚌 Show Active Vehicles Only
Use the following endpoints:

GET /api/v1/vehicles/realtime — Active vehicles only

GET /api/v1/trips/vehicle/{vehicle_id}/details — Trip + predictions

🔄 To reload static data:

bash
Copy
Edit
cd transitpulse-backend
python -m data_ingestion.gtfs_static_loader --agency golden_gate
✨ Key Features
Real-time fleet monitoring with trip predictions

Route and direction filtering

Trip-level stop predictions with delays

Responsive dashboard with route color coding

Easy agency onboarding

📁 Structure
bash
Copy
Edit
transitpulse/
├── transitpulse-backend/      # FastAPI + GTFS ingestion
├── transitpulse-frontend/     # React + Vite UI
└── docker-compose.yml         # PostgreSQL setup
📝 License
MIT License

yaml
Copy
Edit

---

### ✅ What This Version Does:
- Removes **deep setup**, internal architecture, and troubleshooting sections
- Focuses only on:
  - How to run it quickly
  - What the key features are
  - Real-time GTFS API usage
  - Core folder layout
