# Mandatory Deployment Actions

Before you start the refactored server in your production environment, you **must** execute the following two scripts. If you do not run these, the application will either crash or run extremely slowly.

### 1. Optimize Database Indexes (Fixes Performance)
This script adds critical speed indexes to your MySQL database to prevent the dashboard from lagging when dealing with large amounts of data.

**Run this command in the terminal:**
```bash
cd backend
node optimize_db_indexes.js
```

### 2. Create System Settings Table (Fixes Crash)
This script creates the new `system_settings` table in your database and populates it with the default values for `CURRENT_THRESHOLD` and `IDEAL_CYCLE_TIME`. If this table is missing, the backend will crash on startup.

**Run this command in the terminal:**
```bash
cd backend
node migrations/add_settings_table.js
```

---

### Verification
After running both scripts successfully, you can start the backend and frontend as usual. The new Settings page will be accessible in the frontend sidebar for managers.
