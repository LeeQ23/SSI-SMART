# User Guide: SSI Smart Manufacturing OEE Monitor

Welcome to the **SSI Smart Manufacturing Monitoring System**. This application is designed to track real-time machine performance, production counts, and Overall Equipment Effectiveness (OEE) across the factory floor.

---

## 🚀 What is this System?
This system uses ESP32 sensors attached to machines to collect data on:
- **Production Count**: How many "Good" and "No Good" (NG) parts are made.
- **Machine State**: Whether the machine is Running, Idle, or Stopped.
- **Efficiency (OEE)**: A percentage score based on Availability, Performance, and Quality.

---

## 🛠️ How to Start the System
To run the monitoring system on your computer, follow these 3 simple steps:

### Step 1: Start the Database (XAMPP)
1.  Open the **XAMPP Control Panel**.
2.  Click **Start** next to **MySQL**. (The background should turn green).
3.  *Note: Ensure "Apache" is also started if requested by your administrator.*

### Step 2: Start the Backend (The "Brain")
1.  Open **VS Code** in the `SSI Smart Manufacturing` folder.
2.  Open a Terminal and type:
    ```bash
    cd backend
    npm start
    ```
3.  You should see: `Server running on port 5003`.

### Step 3: Start the Frontend (The "Dashboard")
1.  Open a **second** Terminal window in VS Code.
2.  Type:
    ```bash
    cd frontend
    npm run dev -- --host
    ```
3.  Follow the link shown in the terminal (usually `http://localhost:5173`) to open the dashboard in your browser.

---

## 📊 How to Use the Dashboard

### 1. Overview Grid
When you first log in, you will see a grid of all machines. 
- **Green** machines are running.
- **Red** machines are stopped/offline.
- Click on any machine card to see its **Detailed View**.

### 2. Detailed View (Dashboard)
Inside a machine's detailed view, you can see:
- **Real-time Counts**: Live updates of Good and NG parts.
- **Status Log**: A clock showing how long the machine has been running or down.
- **OEE Chart**: A visual representation of current shift efficiency.

### 3. Production History
Navigate to the **History** page to see past shifts.
- Use the **Machine Selector** at the top to filter results for a specific machine.
- You can add **Comments** to specific shifts to note downtime reasons (e.g., "Tooling Change").
- Click **Export CSV** to download the data for Excel reporting.

### 4. Setting Targets (Manager Only)
Managers can go to the **Targets** page to set production goals.
1.  Select the **Machine**.
2.  Enter the **Date** and **Order Number**.
3.  Set the **Target Quantity**.
4.  Click **Save**. The dashboard will now track progress against this goal.

---

## ❓ Troubleshooting
- **Dashboard is blank?** Ensure both Backend and Frontend terminals are running.
- **No data from machines?** Check if the ESP32 is powered on and connected to the factory Wi-Fi.
- **"Unauthorized Access" in terminal?** If using PowerShell, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
