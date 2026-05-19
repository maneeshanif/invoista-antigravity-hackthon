# Notification Agent Workflow

## Overview
This specification details the addition of a **Notification Agent** to the existing agentic orchestration pipeline. The Notification Agent will execute as the final step in the workflow, right after a successful booking confirmation. Its primary responsibility is to notify both the user and the provider about the scheduled service via email.

## Objectives
1. **Notify Provider:** Send an email to the service provider informing them of a newly booked appointment, including the date and time they need to serve the client.
2. **Notify User:** Send a confirmation email to the user with the details of their scheduled appointment, including the provider's information and the scheduled date/time.
3. **Database Updates:** Update the Supabase schema to include `email` fields for both users and providers.

## Workflow Integration
1. After the **Booking Agent** successfully confirms an appointment (and any Human-in-the-Loop approval is completed), the workflow orchestrator will trigger the **Notification Agent**.
2. The orchestrator will pass the `booking_id`, `user_id`, and `provider_id` to the Notification Agent.
3. The Notification Agent will fetch the user and provider details (including their newly added `email` addresses) and the booked slot details from the database.
4. The Agent will use Gmail's SMTP setup (via SSL/TLS using a Gmail App Password) to dispatch the emails.

## Email Content Specs

### Provider Email
* **Subject:** New Service Booking Received
* **Body:** You got a new client. Please be ready to serve them on `[Slot Date]` at `[Slot Time]`.

### User Email
* **Subject:** Booking Confirmation
* **Body:** Your appointment with `[Provider Name]` for the requested service is scheduled on `[Slot Date]` at `[Slot Time]`. Please be ready for that.

## Database Alterations
To support email notifications, the following columns must be added to the Supabase database:

- **`users` table:** `email VARCHAR(255)`
- **`providers` table:** `email VARCHAR(255)`

## Implementation Steps
1. Execute the SQL alteration to add email fields to the database schema.
2. Update the backend orchestration pipeline to include the Notification Agent at the end of a successful booking flow.
3. Implement the Notification Agent's core logic to fetch details and trigger the email dispatch.
4. Set up the environment variables for Gmail SMTP (SMTP host, port, sender email, and Gmail App Password).

## Definition of Success
The feature is considered successfully implemented when:
1. **Database Schema Updated**: The `users` and `providers` tables contain the `email` column, and email data is populated.
2. **SMTP Integration Verification**: The backend can establish a secure connection to Gmail's SMTP servers and authenticate successfully using configured environment variables.
3. **End-to-End Workflow Execution**:
   - A booking is finalized (and approved, if HITL is active).
   - The Notification Agent automatically triggers without blocking the main booking API response (e.g., run as a background task).
   - The provider receives an email with the correct date, time, and client notification.
   - The user receives an email with the correct provider name, date, time, and confirmation details.
4. **Log Tracing**: Trace logs in the database (`trace_logs` table) show the successful execution of the Notification Agent.

