# SSI Smart Manufacturing OEE Monitor
A modern, real-time OEE monitoring system for compacting machines.

## Prerequisites
- Node.js (v16+)
- XAMPP (MySQL) running on default port 3306

## Setup Instructions

### 1. Database Setup
1. Start **Apache** and **MySQL** in XAMPP.
2. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the seed script to create the database and default users:
   ```bash
   npm run seed
   ```

### 2. Backend Server
1. From the `backend` directory, start the server:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:5000`.

### 3. Frontend Application
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:3000` (or similar).

## Usage
- **Login**:
  - Manager: `admin` / `pass123`
  - Operator: `op1` / `pass123`
- **Dashboard**: View real-time OEE, production counts, and machine status.
- **Targets** (Manager only): Set daily production targets.
- **History** (Manager only): View past shift performance and export to CSV.
- **Users** (Manager only): Add new operators or managers.

## API Endpoints (for ESP32)
- **Current Value**: `POST /api/current`
  - Body: `{ "current": 1.2 }`
- **Production Count**: `POST /api/production`
  - Body: `{ "good": 150, "ng": 5 }`

## Tech Stack
- **Backend**: Node.js, Express, MySQL, Socket.io, JWT
- **Frontend**: React, Tailwind CSS, Recharts, Axios, Lucide React
# SSI-SMART
