# Relay Engine

Relay Engine is a small REST API.

It can:

- upload drivers from a CSV or tab-separated file
- record package delivery events
- query delivery statistics by driver, region, metric, and date range
- show API documentation with Swagger

The app has no product UI. You can test it with Swagger, `curl`, Postman, or any HTTP client.

## Tech Stack

- TypeScript
- Fastify
- PostgreSQL
- Prisma 7
- Zod validation
- Swagger / OpenAPI
- Vitest
- Docker Compose

## Requirements

- Node.js 20 or newer
- npm
- Docker
- Docker Compose

## Quick Start

Create your local environment file:

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

Apply the database migrations:

```bash
npm run db:deploy
```

Start the API:

```bash
npm run dev
```

Open:

- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/json`

## Start Fresh

Use this when you want to delete all local data and test again from an empty database.

```bash
docker compose up -d postgres
npx prisma migrate reset --force
```

`prisma migrate reset` drops the local database, recreates it, and applies the migrations again.

After this, the database is empty and ready for a fresh manual test.

## Test With Swagger

Start the API with `npm run dev`, then open:

```text
http://localhost:3000/docs
```

Use these endpoints in order:

1. `GET /health`
2. `POST /drivers/upload`
3. `POST /delivery-events`
4. `GET /delivery-statistics`

For `POST /drivers/upload`, click **Try it out**, choose your CSV file, and execute the request. Use the file picker; do not paste the CSV text into the field.

For `POST /delivery-events`, use this body:

```json
{
  "packageId": "PKG-1001",
  "driverId": "1",
  "status": "delivered",
  "timestamp": "2026-05-15T10:00:00.000Z"
}
```

For `GET /delivery-statistics`, try this after creating the delivery event above:

```text
metric=total_packages
driverIds=1
regions=north
from=2026-05-15
to=2026-05-15
```

Expected `value`: `1`.

## Test With Curl

Open two terminals:

- Terminal 1: `npm run dev`
- Terminal 2: run the commands below

### 1. Check The API

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Upload Drivers

The upload accepts comma-separated files and tab-separated files.

Example file content:

```text
driver_id,name,phone_number,email,region
1,Dwayne Jhonson,+35312341234,jhonson@gmail.com,North
2,The Rock,+353213213213,rock@gmail.com,South
3,Pikachu,+353312312312,pikachu@gmail.com,south
4,I wanna retire,+353412412412,retire@gmail.com,west
5,Please God,+353512351235,please@gmail.com,east
```

Upload your file from Downloads:

```bash
curl -X POST http://localhost:3000/drivers/upload \
  -F "file=@$HOME/Downloads/csvFile.csv"
```

Replace `csvFile.csv` with your real filename.

Expected response for the sample file:

```json
{"imported":5}
```

Uploading the same driver ID again updates that driver.

### 3. Add Delivery Events

Run these commands to create 5 packages for driver `1`.

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1001","driverId":"1","status":"delivered","timestamp":"2026-05-15T10:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1002","driverId":"1","status":"failed","timestamp":"2026-05-15T11:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1003","driverId":"1","status":"picked_up","timestamp":"2026-05-15T09:30:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1003","driverId":"1","status":"delivered","timestamp":"2026-05-15T12:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1004","driverId":"1","status":"in_transit","timestamp":"2026-05-15T13:00:00.000Z"}'
```

```bash
curl -X POST http://localhost:3000/delivery-events \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-1005","driverId":"1","status":"returned","timestamp":"2026-05-15T14:00:00.000Z"}'
```

Each event should return:

```text
id, packageId, driverId, status, timestamp, createdAt
```

### 4. Query Statistics

Delivery rate for driver `1` in the `north` region:

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

```text
2 delivered packages / 5 total packages = 0.4
```

Other useful checks:

```bash
curl "http://localhost:3000/delivery-statistics?metric=total_packages&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
5
```

```bash
curl "http://localhost:3000/delivery-statistics?metric=failure_rate&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
0.2
```

```bash
curl "http://localhost:3000/delivery-statistics?metric=average_deliveries_per_day&driverIds=1&regions=north&from=2026-05-15&to=2026-05-15"
```

Expected `value`:

```json
2
```

## API Summary

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

`phone_number` must be 7 to 20 characters and use normal phone characters: numbers, spaces, `+`, `.`, `-`, or parentheses.

Supported regions:

```text
north, south, east, west
```

Regions are case-insensitive on upload. For example, `North` is stored as `north`.

### `POST /delivery-events`

Records one delivery event.

Required JSON fields:

- `packageId`
- `driverId`
- `status`
- `timestamp`

Supported statuses:

```text
picked_up, in_transit, delivered, failed, returned
```

The driver must already exist.

### `GET /delivery-statistics`

Queries delivery statistics.

Query parameters:

| Name | Required | Example | Notes |
| --- | --- | --- | --- |
| `metric` | yes | `delivery_rate` | One of `total_packages`, `delivery_rate`, `failure_rate`, `average_deliveries_per_day` |
| `driverIds` | no | `1,2` | Omit for all drivers |
| `regions` | no | `north,east` | Omit for all regions |
| `from` | no | `2026-05-15` | Must be provided with `to` |
| `to` | no | `2026-05-15` | Inclusive date; must be provided with `from` |

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

## Errors

Validation and business errors use this shape:

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
  docs/
  modules/
    drivers/
    delivery-events/
    statistics/
```

Each feature module has routes, a controller, a schema, a service, and a repository.

The request flow is:

```text
HTTP request
  -> route/controller
  -> validation
  -> service
  -> repository
  -> PostgreSQL
```

The `docs/` folder contains reusable OpenAPI schemas for Swagger.

Prisma Client is generated into `src/generated/prisma/client`. That folder is ignored by git because it is generated code.

## Useful Commands

```bash
npm run dev              # start API in watch mode
npm run build            # compile TypeScript
npm start                # run compiled app
npm test                 # run unit tests
npm run test:integration # run API + database integration tests
npm run test:all         # run build, unit tests, and integration tests
npm run db:deploy        # apply existing migrations
npm run db:migrate       # create/apply local development migrations
npm run db:generate      # generate Prisma Client
npm run db:studio        # open Prisma Studio
docker compose down      # stop PostgreSQL
```

## Automated Checks

Run these before submitting:

```bash
npm run build
npm test
npm run test:integration
npm audit --audit-level=moderate
```

`npm run test:integration` needs PostgreSQL running because it tests the real API flow against the database.

The integration tests use `INT-*` driver and package IDs, and only clean up their own test data.
