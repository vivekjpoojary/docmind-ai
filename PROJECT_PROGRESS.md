# Build Progress — DocMind AI

*(Formerly "AI Document Intelligence Platform" — renamed by request.)*


This project is being built in parts, each fully implemented (no placeholders).
This file tracks what's done and what's next so the build can resume cleanly.

## ✅ Part 1 — Backend Foundation (delivered, verified working by user)

- Clean architecture folder structure (`api / models / schemas / services / repositories / core / rag / database / middleware / tests`)
- `app/core/config.py` — typed Pydantic settings, `.env`-driven
- `app/core/logging.py` — Loguru console + rotating file logs
- `app/core/security.py` — bcrypt hashing, JWT access + refresh tokens
- `app/database/session.py` — async SQLAlchemy engine/session (auto-creates SQLite data dir)
- ORM models: `User`, `Document`, `DocumentChunk`, `Conversation`, `Message`
- Auth: `UserRepository`, `AuthService`, `/register /login /refresh /me /logout`
- Middleware: rate limiting (slowapi), CORS, global exception handlers
- `app/main.py` — FastAPI app wired up, health check endpoint
- Tests: `conftest.py` (in-memory async test DB) + `test_auth.py` (5 tests, all passing)
- `Dockerfile` for backend, root `.gitignore`

**Bugs found & fixed during real-world setup** (documented here since they're
useful for anyone re-running this project fresh):
- `ALLOWED_EXTENSIONS`/`CORS_ORIGINS` are plain comma-separated strings, not
  `List[str]`, because pydantic-settings tries to JSON-decode `List[...]`
  fields from `.env` and breaks on `"pdf,docx,txt"`. Exposed as `.allowed_extensions`
  / `.cors_origins` computed properties instead.
- `app/models/__init__.py` must import every model class, or SQLAlchemy's
  mapper can't resolve string-based `relationship()` references like `"Document"`.
- `greenlet` must be installed explicitly for async SQLAlchemy on some platforms.
- `bcrypt` 4.1+ breaks with `passlib` 1.7.4's self-test; pin `bcrypt==4.0.1` if hit.
- `requirements.txt` uses `>=` instead of `==` pins, since exact versions
  from the original spec weren't all available for newer Python/platform combos.

## ✅ Part 2 — Document Processing + RAG Pipeline (this delivery)

- `rag/embeddings/provider.py` — Sentence-Transformers (default, local, free) +
  optional OpenAI embeddings, behind one interface
- `rag/vector_store/faiss_store.py` — per-user FAISS index (`IndexIDMap2` on
  `IndexFlatIP`, cosine similarity), persisted to disk, supports add/search/delete
- `rag/loaders.py` — PDF (PyMuPDF, true page numbers), DOCX (python-docx,
  single logical page — noted as an approximation), TXT
- `rag/chunking.py` — recursive character splitting, page number preserved per chunk
- `rag/llm_provider.py` — Ollama (default, local) + optional OpenAI, one interface
- `rag/prompts/qa_prompt.py` — strict context-only system prompt; explicit
  "I couldn't find relevant information..." fallback as the hallucination guard
- `services/document_service.py` — upload validation (size/type/duplicate),
  storage, and the full process pipeline (extract → chunk → embed → FAISS → SQLite)
- `services/rag_service.py` — the `/ask` pipeline: embed question → retrieve →
  confidence-threshold filter → build citations → generate answer → score
  confidence → persist to conversation history
- New endpoints: `POST /upload`, `GET /documents`, `GET /document/{id}`,
  `DELETE /document/{id}`, `POST /ask`
- Tests: `test_documents.py` — upload/list/delete, duplicate/type rejection,
  grounded-answer-with-citation, and "no relevant docs" fallback — all using
  fake embedding/LLM providers (`tests/fakes.py`) so the suite runs fully
  offline and fast, without downloading real models or needing Ollama running.

**Known limitations / honest caveats:**
- Processing runs synchronously inside the upload request. Fine for demo/small
  files; for large PDFs or production use, this should move to a background
  task queue (Celery/RQ) with the document staying in `PROCESSING` status
  until a worker picks it up. Flagged here rather than silently ignored.
- DOCX page numbers are approximate (Word doesn't expose true pagination via
  python-docx) — the whole document is treated as one logical page.
- To actually use `/ask` locally with the default `LLM_PROVIDER=ollama`, you need
  Ollama installed and running (`ollama serve`) with the model pulled
  (`ollama pull llama3.1`) — otherwise you'll get a clear error message
  telling you exactly that, not a silent failure.

## ✅ Part 3 — History, Search, Analytics, Admin (this delivery)

- `schemas/history.py`, `schemas/search.py`, `schemas/analytics.py`
- Repository additions: `ConversationRepository` (counts, delete-all-for-owner),
  `DocumentRepository` (keyword search via `ilike`, owner storage stats,
  document-count-by-owner, platform-wide stats)
- `services/history_service.py` — list/detail/delete conversations
- `services/search_service.py` — semantic (FAISS), keyword (SQL `ilike`), and
  hybrid (merges both, boosts chunks found by both methods) search, with
  optional `document_ids` and upload-date-range filtering
- `services/analytics_service.py` — per-user dashboard stats + platform-wide
  admin stats
- `services/admin_service.py` — list all users, delete a user (properly
  cleans up their FAISS vectors + files via `DocumentService.delete()` first,
  rather than a raw cascade delete that would leave orphaned vectors/files),
  delete any user's document (moderation), admin can't delete their own
  account through this endpoint
- New endpoints: `GET/DELETE /history`, `GET/DELETE /history/{id}`,
  `GET /analytics`, `POST /search`, `GET /admin/users`,
  `DELETE /admin/users/{id}`, `DELETE /admin/documents/{id}`,
  `GET /admin/analytics`
- Tests: `test_history.py`, `test_search.py`, `test_admin.py` — 19 new tests
  covering history creation/detail/delete/clear-all, all 3 search modes +
  document-id filtering, and admin access control (including the
  first-user-becomes-admin behavior and the can't-delete-self guard)

**Bug caught before shipping:** `MessageRead.sources` initially wouldn't have
populated at all — the ORM field is `sources_json` but the Pydantic field was
named `sources`, and with `from_attributes=True` Pydantic looks for an
attribute with the *exact same name*, so it would've silently returned `None`
for every message's citations forever. Fixed with `validation_alias="sources_json"`.

## ⏭ Part 4 — Frontend (React + Vite + TS + Tailwind + shadcn)

- Auth pages, dashboard, upload UI, chat UI with citations/confidence, dark/light mode

## ⏭ Part 5 — Docker Compose, Nginx, CI/CD, Full Docs

- `docker-compose.yml` (backend, frontend, nginx), GitHub Actions, README, architecture/sequence diagrams

---
**Say "continue" or "part 4"** and I'll proceed into the React frontend.
