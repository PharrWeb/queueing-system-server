# queueing-system-server

runs on port 5002

## Commands

```bash
# while server is running

# Reset to A00 and FLUSH active data
Invoke-RestMethod -Uri "http://localhost:5002/dev/reset" -Method POST -ContentType "application/json" -Body "{}"

# Reset to A00 but KEEP history (complete any active tickets)
Invoke-RestMethod -Uri "http://localhost:5002/dev/reset" -Method POST -ContentType "application/json" -Body '{"mode":"complete"}'

# Seed 5 tickets
Invoke-RestMethod -Uri "http://localhost:5002/dev/seed" -Method POST -ContentType "application/json" -Body '{"n":5}'

```