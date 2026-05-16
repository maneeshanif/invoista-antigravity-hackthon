import subprocess
import sys
import threading
import time

def run_process(command, name, color_code):
    """Runs a process and prefixes its output with a colored name."""
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True
    )
    
    # Prefix for logs
    prefix = f"\033[{color_code}m[{name}]\033[0m "
    
    for line in iter(process.stdout.readline, ""):
        print(f"{prefix}{line.strip()}")
    
    process.stdout.close()
    process.wait()

def main():
    # Commands to run
    mcp_cmd = "uv run python -m mcp_server.server"
    app_cmd = "uv run uvicorn app.main:app --reload --port 8000"

    print("\033[1mStarting AI Service Marketplace Multi-Server...\033[0m")
    
    # 33 = Yellow, 32 = Green
    mcp_thread = threading.Thread(target=run_process, args=(mcp_cmd, "MCP", "33"), daemon=True)
    app_thread = threading.Thread(target=run_process, args=(app_cmd, "APP", "32"), daemon=True)

    mcp_thread.start()
    
    # Give MCP a moment to start before starting the app
    time.sleep(2)
    
    app_thread.start()

    try:
        # Keep the main thread alive while sub-processes run
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\033[1mStopping servers...\033[0m")
        sys.exit(0)

if __name__ == "__main__":
    main()
