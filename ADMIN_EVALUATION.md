# Admin Evaluation Credentials

Use the administrator account below for Task 5 evaluation.

- **Email:** value of `ADMIN_EMAIL` in `server/.env`
- **Password:** value of `ADMIN_PASSWORD` in `server/.env`
- **Dashboard:** `http://localhost:3000/admin`

## Create the evaluation administrator

1. Copy `server/.env.example` to `server/.env`.
2. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to the credentials that will be used during assessment.
3. Start MongoDB and the backend.
4. Run:

```bash
cd server
npm run bootstrap-admin
```

The bootstrap script hashes the password before storing it and assigns the `administrator` role. No plaintext password is committed to the repository.

For an assessment report, replace the two placeholders above with the actual credentials configured in the evaluator's `server/.env` before submitting the report.
