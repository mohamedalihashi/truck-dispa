# TruckDispatch API Blueprint

This prototype runs with local mock data, but the UI is organized around these production resources.

## Roles

- `admin`
- `dispatcher`
- `customer`
- `driver`
- `owner`

## Core Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/cargo-requests`
- `GET /api/cargo-requests?status=&page=`
- `PATCH /api/cargo-requests/:id/assign`
- `GET /api/trips`
- `PATCH /api/trips/:id/status`
- `POST /api/trips/:id/proof`
- `GET /api/trucks`
- `POST /api/trucks`
- `PATCH /api/trucks/:id`
- `GET /api/reports/revenue`
- `GET /api/reports/performance`
- `GET /api/notifications`

## Database Collections

`users`, `trucks`, `cargoRequests`, `trips`, `notifications`, `payments`, `settings`, `auditLogs`.

## Realtime Events

- `order.created`
- `driver.assigned`
- `driver.accepted`
- `trip.status.updated`
- `location.updated`
- `cargo.delivered`

## Local Health Check

```bash
curl http://127.0.0.1:4000/api/health
```
