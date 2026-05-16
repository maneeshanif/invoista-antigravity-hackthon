# AI Service Marketplace — Project Overview

## Summary

This project is a multi-agent AI service marketplace that helps users book local services such as AC technicians, plumbers, electricians, tutors, and cleaners.

Users can enter requests in English, Urdu, or Roman Urdu. The system extracts intent, finds matching providers, ranks them, simulates booking, schedules follow-ups, and stores full trace logs for transparency.

Agents do not directly call backend functions. All agent tools are exposed through an MCP server, making the system modular, reusable, and agent-native.

## Core Idea

```txt
User request
  → Intent extraction
  → Provider discovery
  → Provider ranking
  → Booking simulation
  → Follow-up scheduling
  → Trace log visibility
```

## Main Demo Scenario

**User input:**
"Mujhe kal subah G-13 mein AC technician chahiye"

**Expected result:**
- **Intent Agent** extracts AC Technician, G-13, tomorrow morning.
- **Discovery Agent** finds nearby AC technicians.
- **Ranking Agent** selects best provider.
- **Booking Agent** creates simulated booking.
- **Follow-up Agent** schedules reminder.
- Admin can inspect trace logs.

## Sprint Goal

Build a balanced hackathon MVP with:
- Strong agent backend
- MCP-based tool architecture
- Clean trace logs
- Working booking simulation
- Attractive mobile UI
- Simple admin trace dashboard
- Stable demo flow
