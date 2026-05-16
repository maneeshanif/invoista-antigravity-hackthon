"""
db.py — Supabase client initialization for the MCP server.

All MCP tools import `supabase_client` from this module to perform
database operations. Uses the service role key so that RLS is bypassed
for internal agent operations.
"""

import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
