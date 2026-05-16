# Makefile for the AI Service Marketplace Backend

.PHONY: mcp app dev help test

help:
	@echo "Available commands:"
	@echo "  make mcp      - Start the MCP server (HTTP mode on port 8001)"
	@echo "  make app      - Start the FastAPI application"
	@echo "  make dev      - Start both (Note: best run in two separate terminals)"
	@echo "  make test     - Send a test request to the orchestrator"

mcp:
	uv run python -m mcp_server.server

app:
	uv run uvicorn app.main:app --reload --port 8000

dev:
	uv run python scripts/dev_server.py

test:
	powershell -Command "Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/api/v1/requests' -ContentType 'application/json' -Body '{\"user_request\": \"I need a plumber in G-13 tomorrow morning for a leaky pipe\"}'"
