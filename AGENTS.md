# AGENTS.md - Douyin Codebase Guidelines

This document provides essential guidelines for AI agents and developers working on the Douyin project. Strictly adhere to these rules to maintain code quality, consistency, and stability.

## 1. System Architecture & Infrastructure

### Core Stack
- **Backend:** Java Spring Boot (Business Logic)
- **Recommendation:** Python + FastAPI + PyTorch
- **Frontend:** React
- **Infrastructure:** Docker Compose

### Data & Messaging
- **MySQL (Primary DB):** Stores Users, Videos, Metadata.
- **Milvus (Vector DB):** Stores `video_embedding` for retrieval.
- **Redis (Cache):** Hot data, counters (video stats), session storage.
- **MinIO (Object Storage):** Stores video files and covers.
- **RabbitMQ (Message Queue):** Async processing (video upload events, stats aggregation).

## 2. Environment & Commands

### Backend (Java / Spring Boot)
Located in `backend/`.
- **Build:** `./mvnw clean install`
- **Run:** `./mvnw spring-boot:run`
- **Test:** `./mvnw test`

### Recommendation Service (Python / AI)
Located in `recommend/`.
- **Environment:** Conda (Env: `Douyin`)
- **Run:** `uvicorn main:app --reload`
- **Test:** `pytest`
- **Lint:** `ruff check .`

### Frontend (React)
Located in `frontend/`.
- **Build:** `pnpm build`
- **Dev:** `pnpm dev`

### Infrastructure (Docker)
- **Start All:** `docker-compose up -d`
- **Stop All:** `docker-compose down`
- **Logs:** `docker-compose logs -f`

## 3. Database Schemas

### MySQL (Critical Tables)
See `sql/schema.sql` for full definition.
- `video`: Basic info (title, url, status).
- `video_stats_daily`: Counters (likes, views).
- `user_profile`: User info.
- `user_event`: Behavioral logs for training.

### Milvus (Vector DB)
See `scripts/init_milvus.py`.
- **Collection:** `video_embedding`
- **Dimension:** 128 (default)
- **Index:** HNSW

## 4. Operational Rules

1. **Isolation:** Backend and Recommendation services communicate via HTTP REST. Events flow via RabbitMQ.
2. **Migrations:** Update `sql/schema.sql` for MySQL changes. Run `scripts/init_milvus.py` for Vector DB updates.
3. **Secrets:** Never commit secrets. Use environment variables.

## 5. Cursor/Copilot Rules

- **Context:** When working on Backend, remember to update the corresponding DTOs if the Python Recommendation API changes.
- **Docker:** If adding a new service, update `docker-compose.yml`.
