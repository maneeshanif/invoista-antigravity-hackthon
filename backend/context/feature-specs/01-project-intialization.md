# Feature 01 – Initialize Project

Initial setup of the FastAPI backend with the recommended folder structure, basic configuration, and environment variable management.

## Design

Follow the modular structure defined in `architecture-context.md`. Ensure strict separation between the `app` logic and the `mcp_server` tools.

- Use **snake_case** for all filenames and directories.
- Maintain a clean `app/` directory for the main FastAPI logic.
- Place all agent tools under `mcp_server/`.
- Use a single source of truth for configuration in `app/core/config.py`.

## Implementation

Initialize the project with a robust foundation:

1. **Folder Structure**: Create the following skeleton:
   - `app/core/` (config, constants)
   - `app/db/` (models, schemas, session)
   - `app/agents/` (orchestrator, agent definitions)
   - `app/api/routes/` (endpoint definitions)
   - `app/workers/` (background tasks)
   - `mcp_server/tools/` (independent tool logic)

2. **Core Config**: Implement `app/core/config.py` using `pydantic-settings` to load:
   - `PROJECT_NAME`, `DEBUG` mode
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
   - `REDIS_URL` (local and production toggles)

3. **Entry Point**: Create `app/main.py` with:
   - FastAPI app initialization
   - Global CORS configuration
   - A `/health` endpoint returning `{"status": "ok", "version": "0.1.0"}`
   - Inclusion of the initial router from `app/api/routes/`

4. **Environment**: Provide a `.env.example` with placeholders for all required keys.

## Dependencies

Initialize the project using `uv init` and install core backend packages with `uv add`:
- `fastapi`
- `uvicorn[standard]`
- `pydantic-settings`
- `python-dotenv`
- `httpx` (for internal service calls)

## Check When Done

- [ ] Directory structure exactly matches `architecture-context.md`
- [ ] `uv run uvicorn app.main:app --reload` starts without errors
- [ ] `GET /health` returns a successful response
- [ ] `.env.example` exists and contains all keys mentioned in `app/core/config.py`
- [ ] `pyproject.toml` and `uv.lock` are used for dependency management instead of `requirements.txt`
