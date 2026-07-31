# 🧠 DocMind AI — Enterprise Document Intelligence & RAG Platform

DocMind AI is a full-stack, enterprise-grade **Retrieval-Augmented Generation (RAG)** platform designed to transform multi-format documents (PDFs, DOCX, TXT) into searchable vector passages and actionable AI insights.

Built with **FastAPI**, **Async SQLAlchemy**, **FAISS**, **Sentence-Transformers**, **Ollama**, and **React 18 + Vite + TypeScript + Tailwind CSS**, DocMind AI provides strict zero-hallucination page-level citations, hybrid semantic + keyword search, conversation history persistence, and role-based administration.

---

## ✨ Key Features

- 📑 **Multi-Format Document Ingestion**: Native text extraction and chunking for PDFs (via PyMuPDF with true page numbers), Microsoft Word (`.docx`), and plain text (`.txt`).
- ⚡ **Local Vector Store Indexing**: Per-user vector persistence using **FAISS** (`IndexIDMap2` over `IndexFlatIP`) with cosine similarity.
- 🎯 **Strict Citation & Hallucination Guard**: System prompts enforce context-only answers. Every answer includes page numbers, source filenames, matching snippets, and confidence scores.
- 🔍 **Hybrid Passage Search**: Search passages using Semantic Vector Search (FAISS), Exact Keyword Search (SQL `ILIKE`), or Hybrid Mode (combines both with passage boosting).
- 💬 **Interactive QA Chat Interface**: Multi-document filter scoping, persistent conversation history, and citation drawers.
- 🔐 **JWT Security & Auth**: Password hashing via `bcrypt`, access & refresh tokens, rate limiting, and owner isolation.
- 🛡️ **Admin Governance Console**: Role-based access control (first registered user becomes superadmin) with platform-wide analytics and cascading moderation deletion.
- 🐳 **Docker & Nginx Ready**: Multi-container docker-compose setup with Nginx reverse proxy and GitHub Actions CI workflow.

---

## 🏗️ System Architecture

```
                                +-----------------------------------+
                                |     React + Vite + TS Frontend    |
                                +-----------------------------------+
                                                  |
                                        HTTP / REST API (JWT)
                                                  v
                                +-----------------------------------+
                                |          FastAPI Backend          |
                                +-----------------------------------+
                                   /       |            \         \
                                  /        |             \         \
                                 v         v              v         v
                   +----------------+  +---------+  +----------+  +--------+
                   | Async Database |  |  FAISS  |  | Embeddings|  | LLM    |
                   | (SQLite/SQLAlchemy) | Vector|  | (Sentence- |  | Engine |
                   | Stores Users,   | | Store   |  | Transformers| | (Ollama|
                   | Metadata & QA   | | (Disk)  |  | / OpenAI)  |  |/OpenAI)|
                   +----------------+  +---------+  +----------+  +--------+
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, SlowAPI, Loguru |
| **Database & ORM** | SQLite, Async SQLAlchemy 2.0, Greenlet |
| **Vector Engine** | FAISS (`faiss-cpu`), Sentence-Transformers (`all-MiniLM-L6-v2`) |
| **LLM Provider** | Ollama (`llama3.1` / local) or OpenAI (`gpt-4o-mini`) |
| **DevOps & CI** | Docker, Docker Compose, Nginx, GitHub Actions |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- (Optional for Local LLM) [Ollama](https://ollama.ai/) with `ollama pull llama3.1`

---

### 2. Local Backend Setup

```bash
# Navigate to project root
cd docmind-ai

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install greenlet bcrypt==4.0.1
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env

# Run FastAPI backend server
cd backend
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```
*Backend API documentation is available at `http://localhost:8000/docs`.*

---

### 3. Local Frontend Setup

```bash
# Open a new terminal tab and navigate to frontend
cd docmind-ai/frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
*Access the Web UI at `http://localhost:3000`.*

---

### 4. Running with Docker Compose

```bash
# Build and run all services (Backend, Frontend, Nginx)
docker-compose up --build
```
*Access the production stack at `http://localhost`.*

---

## 🧪 Running Unit Tests

DocMind AI includes a comprehensive 31-test pytest suite covering Auth, Document Chunking/Indexing, RAG QA with Citation Scoring, Hybrid Search, and Admin Access Control:

```bash
cd backend
PYTHONPATH=. pytest app/tests -v
```

---

## 📌 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register new user account | ❌ |
| `POST` | `/api/v1/auth/login` | Login and get JWT access & refresh tokens | ❌ |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | ✅ |
| `POST` | `/api/v1/documents/upload` | Upload & vectorize PDF/DOCX/TXT file | ✅ |
| `GET` | `/api/v1/documents` | List user's indexed documents | ✅ |
| `DELETE` | `/api/v1/documents/{id}` | Delete document & purge vector embeddings | ✅ |
| `POST` | `/api/v1/ask` | Submit question to RAG pipeline with citations | ✅ |
| `POST` | `/api/v1/search` | Search passages via Semantic/Keyword/Hybrid mode | ✅ |
| `GET` | `/api/v1/history` | List user conversation history | ✅ |
| `GET` | `/api/v1/analytics` | Get user document & vector statistics | ✅ |
| `GET` | `/api/v1/admin/users` | List all platform users (Admin only) | 🛡️ Admin |
| `DELETE` | `/api/v1/admin/users/{id}` | Delete user & purge files/vectors (Admin only) | 🛡️ Admin |

---

## 📜 License

MIT License. Built for professional production standards.
