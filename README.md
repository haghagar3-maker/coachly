# Coachly

Fitness coaching SaaS platform.

## Structure
- /backend → Node.js + Express (deploy to Railway)
- /frontend → React + Vite (deploy to Vercel)

## Setup
1. Run SQL schema in Supabase
2. Deploy backend to Railway, set env vars
3. Deploy frontend to Vercel, set VITE_API_URL
4. Create admin: POST /api/admin/create with x-admin-secret header
