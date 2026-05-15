# AI Service Marketplace

## Overview

This project is a multi-agent AI service marketplace that helps users book local services such as AC technicians, plumbers, electricians, tutors, and cleaners.

Users can enter requests in English, Urdu, or Roman Urdu. The system extracts intent, finds matching providers, ranks them, simulates booking, schedules follow-ups, and stores full trace logs for transparency.

## Core Idea

User request
  → Intent extraction
  → Provider discovery
  → Provider ranking
  → Booking simulation
  → Follow-up scheduling
  → Trace log visibility

## Sprint Goal

Build a balanced hackathon MVP with:

- Strong agent backend
- MCP-based tool architecture
- Clean trace logs
- Working booking simulation
- Simple admin trace dashboard
- Stable demo flow

Main priority:
Agent trace visibility > booking logic > optional extras

Do not overbuild maps, payments, chat, or real provider integrations in MVP.

## Main Demo Scenario

User input:
"Mujhe kal subah G-13 mein AC technician chahiye"

Expected result:
- Intent Agent extracts AC Technician, G-13, tomorrow morning
- Discovery Agent finds nearby AC technicians
- Ranking Agent selects best provider
- Booking Agent creates simulated booking
- Follow-up Agent schedules reminder
- Admin can inspect trace logs
