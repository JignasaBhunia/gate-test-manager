This folder is intended to hold user-specific data snapshots and exports.

- `tests_seed.csv` is a copy of the original seed CSV used to initialize the app.
- `user_data.json` is intended for storing user-provided or synced data snapshots (managed by the app or via manual import/export).

Note: The web app runs client-side and cannot directly modify files in this repository at runtime. To persist data to these files automatically you would need a backend service or a GitHub API integration (recommended approach is to use Firebase for multi-user sync and a server-side process to update repository files).
