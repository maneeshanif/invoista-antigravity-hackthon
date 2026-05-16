# dev.ps1 — Start both MCP and FastAPI in new windows

Write-Host "Starting AI Service Marketplace Development Environment..." -ForegroundColor Cyan

# Start MCP Server in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- MCP SERVER ---' -ForegroundColor Yellow; uv run python -m mcp_server.server" -Title "MCP Server"

# Start FastAPI App in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- FASTAPI APP ---' -ForegroundColor Green; uv run uvicorn app.main:app --reload --port 8000" -Title "FastAPI Backend"

Write-Host "Both servers are starting in separate windows." -ForegroundColor Gray
Write-Host "MCP: http://localhost:8001/mcp"
Write-Host "API: http://localhost:8000/api/v1/health"
