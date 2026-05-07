# Fitness Tracker - Local Testing Guide

This repository contains:

- `app/` + `lib/`: Next.js frontend
- `backend/`: Spring Boot backend API
- Postgres database (via Docker Compose)

For testing, you need all three running: frontend, backend, and database.

## Prerequisites

- Node.js 20+
- npm
- Java 17
- Maven
- Docker Desktop

## 1) Clone and install frontend dependencies

```bash
git clone <your-repo-url>
cd fitness-tracker
npm install
```

## 2) Create frontend environment file

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Without this variable, the frontend cannot call the backend API.

## 3) Start Postgres

From the project root:

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with default credentials already matching backend defaults.

## 4) Start backend

In a new terminal:

```bash
cd backend
mvn spring-boot:run
```

Backend runs on `http://localhost:8080`.

Health endpoint:

```text
http://localhost:8080/actuator/health/readiness
```

## 5) Start frontend

In another terminal at the project root:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`.

## 6) Quick test flow

1. Open `http://localhost:3000`
2. Register a user
3. Login
4. Go to Start Workout
5. Save a workout
6. Confirm it appears in History and Calendar

## Common issues

- `NEXT_PUBLIC_API_BASE_URL is not configured`
  - Add `.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- Login/register fails immediately
  - Check backend is running on port `8080`
- Backend fails to start with DB connection errors
  - Ensure `docker compose up -d` is running and Postgres container is healthy

## Optional: production-style local run

Frontend in production mode:

```bash
npm run build
npm run start
```
