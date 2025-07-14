# 🌐 TransitPulse Access Guide

## ✅ Servers Running Successfully!

Both TransitPulse servers are now running:

- **🎨 Frontend (React + Vite)**: Port 3000  
- **🔧 Backend (FastAPI)**: Port 9001

## 🔗 How to Access the Application

### Option 1: GitHub Codespaces Port Forwarding (Recommended)

1. **Open the Ports tab** in VS Code:
   - Click on the **"PORTS"** tab at the bottom of VS Code (next to Terminal)
   - You should see ports 3000 and 9001 listed

2. **Make ports public** (if needed):
   - Right-click on port 3000 → **"Port Visibility"** → **"Public"**
   - Right-click on port 9001 → **"Port Visibility"** → **"Public"**

3. **Get the forwarded URLs**:
   - Click the **🌐 globe icon** next to port 3000 to open the frontend
   - The URL will look like: `https://[random-name]-3000.app.github.dev`

### Option 2: Manual Port Check

If the Ports tab is not visible, you can:

1. **Open Command Palette**: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. **Type**: "Forward a Port"
3. **Add ports**: 3000 and 9001
4. **Set visibility**: Public
5. **Access via browser**: Click the provided URLs

### Option 3: Direct URLs (for public Codespaces)

Your TransitPulse application should be accessible at:
- Frontend: `https://[your-codespace-name]-3000.app.github.dev`
- Backend API: `https://[your-codespace-name]-9001.app.github.dev`

## 🚀 Quick Start Commands

### Start Servers
```bash
bash /workspaces/transitpulse/start_servers.sh
```

### Check Server Status
```bash
ps aux | grep -E "(vite|fastapi_port_9001)"
```

### Stop Servers
```bash
pkill -f "python.*fastapi_port_9001.py"
pkill -f "vite.*3000"
```

## 🔧 Troubleshooting

### Port Access Issues
- Ensure ports are set to **"Public"** in the Ports tab
- Try refreshing the forwarded URL
- Check if the servers are still running with the status command above

### Module Export Errors (Fixed)
- ✅ RouteLadder component export issue has been resolved
- ✅ All status field mismatches have been fixed
- ✅ Real API data integration is working

## 📱 What You Should See

When you access the frontend URL, you should see:
- **No console errors** about "status unknown"
- **RouteLadder component** showing multiple real routes (not just 2)
- **Real vehicle data** with proper status displays
- **Auto-refreshing data** every 30 seconds

## 🎯 Testing the Fixes

1. **Open browser console** (F12) and check for errors
2. **Navigate to Route Ladder** section in the app
3. **Verify multiple routes** are displayed in the dropdown
4. **Check vehicle statuses** show proper names (on-time, layover, approaching, etc.)
5. **Confirm data refreshes** automatically

---

**Need help?** The servers are configured to auto-restart and should be accessible via the GitHub Codespaces port forwarding system.
