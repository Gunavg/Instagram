# Admin Evaluation Credentials

Dashboard URL: `http://localhost:3000/admin`

The evaluation administrator is configured using local environment variables. Do not commit a real password to Git.

1. Copy `server/.env.example` to `server/.env`.
2. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_USERNAME` to the exact credentials provided to your evaluator.
3. Start MongoDB and the backend.
4. From the `server` directory run:

```bash
npm run bootstrap-admin
```

The bootstrap command hashes the password before saving it and assigns the `administrator` role.

## Fill in before submission

- **Evaluation email/username:** record the exact value of `ADMIN_EMAIL` (and `ADMIN_USERNAME`, if configured) from your local `server/.env` here.
- **Evaluation password:** record the exact value of `ADMIN_PASSWORD` from your local `server/.env` here in the private project report delivered to the assessor only. Do not commit that real password to this public repository.
- **Dashboard:** `http://localhost:3000/admin`

This file intentionally does not contain the private password. Replace the local report copy with the real evaluation values before submission, and keep that copy outside the public Git repository.
