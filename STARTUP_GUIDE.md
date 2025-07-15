# TransitPulse Startup Guide 🚀

## 📋 Quick Reference

### 🆕 First Time Setup
```bash
./fix_requirements.sh     # Fix all dependencies and configuration
./setup_and_start.sh      # Complete setup and start all services
```

### ⚡ Daily Development
```bash
./dev_start.sh           # Quick start (after initial setup)
./status.sh              # Check service status
```

## 🔧 Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `fix_requirements.sh` | Fixes dependencies, ports, database, config | When you have startup errors |
| `setup_and_start.sh` | Complete setup and startup with all checks | First time or major issues |
| `dev_start.sh` | Quick daily startup | Regular development |
| `status.sh` | Check service status | Troubleshooting |

## 🌐 Service URLs

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:9002  
- **API Docs**: http://localhost:9002/docs
- **Database**: PostgreSQL on localhost:5432

## 🚨 Common Issues & Solutions

### Issue: "Requirements missing"
```bash
./fix_requirements.sh  # Reinstalls all dependencies
```

### Issue: "Port already in use"
```bash
./fix_requirements.sh  # Kills existing processes
```

### Issue: "Database connection failed"
```bash
./fix_requirements.sh  # Restarts database with proper config
```

### Issue: "API not responding"
```bash
./status.sh            # Check what's running
./dev_start.sh         # Restart services
```

## 📂 File Structure
```
transitpulse/
├── fix_requirements.sh      # Dependency fixer
├── setup_and_start.sh       # Complete setup
├── dev_start.sh            # Quick startup  
├── status.sh               # Status checker
├── docker-compose.yml      # Database config
├── transitpulse-backend/
│   ├── .env               # Backend environment
│   ├── venv/              # Python virtual environment
│   └── requirements.txt   # Python dependencies
└── transitpulse-frontend/
    ├── package.json       # Node.js dependencies
    └── node_modules/      # Node.js packages
```

## 🔍 Troubleshooting Steps

1. **Check Status**: `./status.sh`
2. **Fix Issues**: `./fix_requirements.sh`
3. **Restart**: `./dev_start.sh`
4. **Verify**: Open http://localhost:3002

## 📝 Log Files

- **Setup Log**: `/tmp/transitpulse_setup.log`
- **Backend Log**: `backend.log`
- **Frontend Log**: `frontend.log`

## 🎯 Development Workflow

1. **Start Development**: `./dev_start.sh`
2. **Make Changes**: Edit code in your IDE
3. **Check Status**: `./status.sh` (if needed)
4. **Stop Services**: Ctrl+C in terminal

---

✅ **All startup issues have been resolved!**  
The scripts automatically handle dependency installation, port conflicts, database setup, and configuration.
