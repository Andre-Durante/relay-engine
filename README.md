# Relay Engine

Relay Engine is a small REST API.

It lets you:

- upload drivers from a CSV or tab-separated file
- record delivery events for packages
- ask for delivery statistics by driver, region, metric, and date range

The app has no UI. You test it with HTTP requests, for example with `curl` or Postman.

## Tech Stack

- TypeScript
- Fastify
- PostgreSQL
- Prisma 7
- Docker Compose
- Zod validation
- Vitest

## Requirements

Install these before running the project:

- Node.js 20 or newer
- npm
- Docker
- Docker Compose

## Quick Start

From the project folder, create your local environment file:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Install dependencies:

```bash
npm install
```

Apply the database migration:

```bash
npm run db:deploy
```

Start the API:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

Keep this terminal open while testing.

## Start Fresh

Use this when you want to delete all local data and test again from an empty database.

Make sure PostgreSQL is running:

```bash
docker compose up -d postgres
```

Reset the database:

```bash
npx prisma migrate reset --force
```

After this, the database is empty.

## Manual Test Guide

Open two terminals:

- Terminal 1: run the API with `npm run dev`
- Terminal 2: run the `curl` commands below

### 1. Check The API

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Upload Drivers

The upload endpoint accepts comma-separated files and tab-separated files.

Your file can look like this:

```text
driver_id	name	phone_number	email	region
1	Dwayne Jhonson	+35312341234	jhonson@gmail.com	North
2	The Rock	+353213213213	rock@gmail.com	South
3	Pikachu	+353312312312	pikachu@gmail.com	south
4	I wanna retire	+353412412412	retire@gmail.com	west
5	Please	+353512351235	please@gmail.com	east
```

Regions are case-insensitive on upload, so `North` becomes `north`.

Upload a file (Downloads was used as example):

```bash
curl -X POST http://localhost:3000/drivers/upload \
  -F "file=@$HOME/Downloads/csvFile.csv"
```

Replace `csvFile.csv` with your real filename.

Expected response for the sample file above:

```json
{"imported":5}
```

Uploading the same driver ID again updates that driver.

### 3. Add Delivery Events

Add one delivered package for driver `1`:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-1001",
    "driverId": "1",
    "status": "delivered",
    "timestamp": "2026-05-15T10:00:00.000Z"
  }'
```

Add one failed package for driver `1`:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-1002",
    "driverId": "1",
    "status": "failed",
    "timestamp": "2026-05-15T11:00:00.000Z"
  }'
```

Add a package that changes status. This tests that statistics use the latest status for a package:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-1003",
    "driverId": "1",
    "status": "picked_up",
    "timestamp": "2026-05-15T09:30:00.000Z"
  }'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-1003",
    "driverId": "1",
    "status": "delivered",
    "timestamp": "2026-05-15T12:00:00.000Z"
  }'
```

Add an in-transit package and a returned package:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-1004",
    "driverId": "1",
    "status": "in_transit",
    "timestamp": "2026-05-15T13:00:00.000Z"
  }'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-1005",
    "driverId": "1",
    "status": "returned",
    "timestamp": "2026-05-15T14:00:00.000Z"
  }'
```

Each event should return:

```text
id, packageId, driverId, status, timestamp, createdAt
```

### 4. Query Driver 1 Statistics

Query delivery rate for driver `1` in the `north` region:

```bash
curl "http://localhost:3000/delivery-statistics?metric=delivery_rate&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected important fields:

```json
{
  "metric": "delivery_rate",
  "value": 0.4,
  "counts": {
    "totalPackages": 5,
    "deliveredPackages": 2,
    "failedPackages": 1
  }
}
```

Why `0.4`?

Driver `1` has 5 packages:

- `PKG-1001`: delivered
- `PKG-1002`: failed
- `PKG-1003`: delivered, because the latest status is delivered
- `PKG-1004`: in_transit
- `PKG-1005`: returned

So the delivery rate is:

```text
2 delivered / 5 total = 0.4
```

Query total packages:

```bash
curl "http://localhost:3000/delivery-statistics?metric=total_packages&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
5
```

Query failure rate:

```bash
curl "http://localhost:3000/delivery-statistics?metric=failure_rate&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
0.2
```

Query average deliveries per day:

```bash
curl "http://localhost:3000/delivery-statistics?metric=average_deliveries_per_day&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
2
```

## Larger Manual Dataset

If you want to test several drivers and regions, run these after uploading the sample 5-driver file.

These commands repeat the same endpoint on purpose so they are easy to copy and run one by one.

South region events:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-2001","driverId":"2","status":"delivered","timestamp":"2026-05-15T10:15:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-2002","driverId":"2","status":"failed","timestamp":"2026-05-15T15:45:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-3001","driverId":"3","status":"delivered","timestamp":"2026-05-15T16:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-3002","driverId":"3","status":"failed","timestamp":"2026-05-15T17:00:00.000Z"}'
```

West and east region events:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-4001","driverId":"4","status":"failed","timestamp":"2026-05-15T12:30:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-4002","driverId":"4","status":"returned","timestamp":"2026-05-15T18:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-5001","driverId":"5","status":"delivered","timestamp":"2026-05-15T19:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-5002","driverId":"5","status":"picked_up","timestamp":"2026-05-15T20:00:00.000Z"}'
```

Second-day events:

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1006","driverId":"1","status":"delivered","timestamp":"2026-05-16T09:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-2003","driverId":"2","status":"delivered","timestamp":"2026-05-16T10:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-3003","driverId":"3","status":"failed","timestamp":"2026-05-16T11:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-5003","driverId":"5","status":"delivered","timestamp":"2026-05-16T12:00:00.000Z"}'
```

Useful checks after loading the larger dataset:

```bash
curl "http://localhost:3000/delivery-statistics?metric=total_packages&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
13
```

```bash
curl "http://localhost:3000/delivery-statistics?metric=delivery_rate&regions=south&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
0.5
```

```bash
curl "http://localhost:3000/delivery-statistics?metric=average_deliveries_per_day&from=2026-05-15&to=2026-05-16"
```

Expected `value`:

```json
4
```

## API Reference

### `GET /health`

Checks that the API is running.

### `POST /drivers/upload`

Uploads drivers from a CSV or tab-separated file.

The multipart field must be named `file`.

Required columns:

- `driver_id`
- `name`
- `phone_number`
- `email`
- `region`

Regions:

```text
north, south, east, west
```

### `POST /delivery-events`

Records a delivery event.

Request body:

```json
{
  "packageId": "PKG-1001",
  "driverId": "1",
  "status": "delivered",
  "timestamp": "2026-05-15T10:00:00.000Z"
}
```

Statuses:

```text
picked_up, in_transit, delivered, failed, returned
```

### `GET /delivery-statistics`

Queries delivery statistics.

Query parameters:

| Name | Required | Example | Notes |
| --- | --- | --- | --- |
| `metric` | yes | `delivery_rate` | One of `total_packages`, `delivery_rate`, `failure_rate`, `average_deliveries_per_day` |
| `driverIds` | no | `1,2` | Omit for all drivers |
| `regions` | no | `north,east` | Omit for all regions |
| `from` | no | `2026-05-15` | Must be provided with `to` |
| `to` | no | `2026-05-16` | Inclusive date; must be provided with `from` |

If `from` and `to` are omitted, the API queries the current day.

Date ranges must be between one day and one month.

## Metric Rules

Statistics use the latest event per package inside the date range.

Example:

```text
PKG-1003: picked_up -> delivered
```

This counts as one delivered package, not two events.

Metric definitions:

- `total_packages`: number of distinct packages
- `delivery_rate`: delivered packages divided by total packages
- `failure_rate`: failed packages divided by total packages
- `average_deliveries_per_day`: delivered packages divided by number of days

`returned` is tracked, but it does not count as `failed`.

## Validation And Errors

Validation errors return:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {}
  }
}
```

Unexpected errors return:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Unexpected server error"
  }
}
```

## Project Structure

```text
src/
  app.ts
  server.ts
  common/
  config/
  db/
  modules/
    drivers/
    delivery-events/
    statistics/
```

Each feature module has:

- routes
- controller
- schema
- service
- repository

The request flow is:

```text
HTTP request
  -> route/controller
  -> validation
  -> service
  -> repository
  -> PostgreSQL
```

Prisma Client is generated into `src/generated/prisma/client`. That folder is ignored by git because it is generated code.

## Useful Commands

```bash
npm run dev          # start API in watch mode
npm run build        # compile TypeScript
npm start            # run compiled app
npm test             # run unit tests
npm run test:integration # run API + database integration tests
npm run test:all     # run build, unit tests, and integration tests
npm run db:deploy    # apply existing migrations
npm run db:migrate   # create/apply local development migrations
npm run db:generate  # generate Prisma Client
npm run db:studio    # open Prisma Studio
docker compose down  # stop PostgreSQL
```

## Automated Checks

Run these before submitting changes:

```bash
npm run build
npm test
npm run test:integration
npm audit --audit-level=moderate
```

`npm run test:integration` needs PostgreSQL running because it tests the real API flow against the database. The integration tests use `INT-*` driver and package IDs and only clean up their own test data.

GitHub Actions also runs these checks in `.github/workflows/ci.yml`.
