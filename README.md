## TimeBoss Prototype

This directory contains a working prototype of the **TimeBoss** application described in the project specification.  It is still not a complete production system, but it demonstrates many of the core concepts of a full‑stack web application with separate front‑end and back‑end components.  Over several iterations the prototype has evolved to include authentication, role‑based access control, persistent storage, rate limiting, crew and job management, a lightweight client CRM, notifications via SMS/email, billing and subscription flows, AI‑driven schedule optimisation, geolocation mapping and even crew punch‑in/punch‑out.  While still a prototype, it provides a near end‑to‑end workflow for running a field service business.

### Structure

```
timeboss/
├─ backend/    # Express server (API endpoints for crews and jobs)
└─ frontend/   # Next.js app with Tailwind CSS and sample pages
```

### How to use this prototype

1. **Backend** (Node.js/Express)
   - Navigate to `timeboss/backend`.
   - Run `npm install` to install dependencies.
   - Start the server with `node index.js`.  The API will run on port 4000.
   - API endpoints include:
     - `GET /crews` – list all crews.
     - `POST /crews` – add a new crew.  You can specify `name`, `skills`, `zone` and optional `lat`/`lng` coordinates for the crew’s home base.
     - `GET /jobs` – list all jobs.
     - `POST /jobs` – add a new job.  Fields include `description`, `address`, optional `requiredSkills`, `zone`, `date`, `crewId` and optional `lat`/`lng` coordinates for the job location.
     - `POST /jobs/:id/assign` – assign a job to the most suitable crew based on zone, required skills, current workload and distance.  The auto‑assignment algorithm uses the crew’s location and the job’s location to calculate a Haversine distance and chooses the crew with the fewest existing jobs and the shortest distance.

   - The backend persists crews, jobs and users to JSON files in the `backend/data` folder, so your data is saved between restarts.  This is a simple form of persistence; a production application should use a proper database.
   - The server reads configuration from environment variables.  You can supply these variables directly or define them in a `.env` file (see `.env.example`).  Configuration options include API keys and credentials for Stripe, Twilio, Postmark and OpenAI, as well as the port and front‑end URL used for callbacks.

   - **Authentication**: Users can sign up and log in via `/auth/signup` and `/auth/login`.  Passwords are securely hashed using **bcrypt** (`bcryptjs`), and a bearer token is returned on successful login.  Include this token in the `Authorization` header on subsequent API calls.
   - **Role Management**: The first user to sign up is assigned the `admin` role automatically; subsequent sign‑ups default to `crew`.  Admins can create additional users and assign roles (`admin`, `foreman`, `crew`) via the `/users` endpoints.
   - **Password Reset**: Endpoints `/auth/reset-request` and `/auth/reset-password` provide a rudimentary password reset flow.  A reset token is generated and returned in the response (for demonstration—it should be emailed in a real implementation).  The token expires after one hour.
   - **Rate Limiting**: A simple in‑memory rate limiter is applied to all requests, limiting each IP address to 100 requests per 15‑minute window.  Exceeding this limit returns a `429` error.
   - **Clients & Notifications**: The backend now supports a lightweight client CRM (`/clients` endpoints) storing name, email and phone.  Jobs can reference a `clientId`, and crews can include contact info.  When a job is auto‑assigned or its status changes, the server attempts to send SMS and email notifications to the assigned crew and associated client using Twilio and Postmark.  If the required environment variables are not configured the messages are logged to the console.
   - **Contact Form Endpoint**: A public `/contact` endpoint accepts unauthenticated form submissions from the marketing page.  Incoming messages include a visitor’s name, email and message and are sent to a configurable `ADMIN_EMAIL` or logged to the server if no email is configured.
  - **Crew Punch‑In/Punch‑Out**: Crew users can check in and check out of jobs assigned to them via `/jobs/:id/check-in` and `/jobs/:id/check-out` endpoints.  Checking in transitions the job status from **Scheduled** to **On‑Site** and records a timestamp and location.  Checking out transitions the job to **Complete** and records completion time and location.  The front‑end shows **Check In** and **Check Out** buttons only to the crew assigned to the job.
  - **User‑to‑Crew Assignment**: Admins can assign specific crews to crew‑role users when creating or updating users.  The `/users` endpoints accept a `crewId` field, and the admin interface includes dropdowns to set and change this association.  When a crew user logs in, their associated `crewId` is stored in the session so that the app can determine which jobs belong to them.
   - **Billing & Payments**: A `/billing/create-checkout-session` endpoint integrates with Stripe to create subscription checkout sessions for three plans (Starter, Pro and Premium).  Users are assigned a Stripe customer ID and their selected plan is stored in the user record.  A stub `/billing/webhook` endpoint is provided to handle Stripe webhook events.  To enable payments, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM` and `FRONTEND_URL` environment variables.
   - **AI Schedule Optimisation**: Added a `/jobs/optimize` endpoint that, if an OpenAI API key is provided (`OPENAI_API_KEY`), calls ChatGPT (GPT‑4o) to generate crew assignment suggestions based on current unassigned jobs and crews.  If OpenAI is not configured, a heuristic similar to the auto‑assign algorithm returns suggestions.

   - **Optional PostgreSQL Storage**: The prototype can now connect to a PostgreSQL database when the `DATABASE_URL` environment variable is set.  On startup the server creates tables for crews, jobs, clients and users, and the `/crews` and `/jobs` endpoints will read from and write to the database instead of the JSON files.  If no database URL is provided the prototype falls back to its existing JSON file storage.

  - **Invoicing & Reporting**: A `/jobs/:id/invoice` endpoint generates a simple invoice for completed jobs, including hours worked, rate and total.  The front‑end displays invoices on the Jobs page.  There’s also a `/reports/daily-summary` endpoint for daily job statistics, with a corresponding Reports page.

2. **Frontend** (Next.js/Tailwind)
   - Navigate to `timeboss/frontend`.
   - Run `npm install` to install dependencies.
   - Start the development server with `npm run dev`.  The app will run on port 3000.
   - The UI includes:
     - A **public marketing landing page** at `/` that introduces TimeBoss, highlights key features, outlines simple pricing tiers and provides clear calls‑to‑action.  Visitors can explore the product without logging in and are invited to sign up.
     - Once authenticated, a **Dashboard** (at `/dashboard`) replaces the landing page, summarising your crews and jobs.
     - A **Crew Manager** page to list crews and add new ones, including optional latitude/longitude coordinates.  You can also supply phone and email contacts for crews to enable notification functionality.
     - A **Jobs** page to list jobs, create new jobs with optional location, update their status (Scheduled/On‑Site/Complete/Flagged), and auto‑assign or AI‑optimise unassigned jobs.  Crew users see **Check In** and **Check Out** buttons on their assigned jobs to record when they start and finish work.  When jobs are completed, admins and foremen can view simple invoices.
     - A **Map** page that visualises crews and jobs on an interactive Leaflet map.  It reads the latitude/longitude values you enter for crews and jobs and displays them as markers.  This page is loaded client‑side only and requires network access to fetch OpenStreetMap tiles.
     - A **Clients** page where you can manage your clients (name, email and phone).  Jobs can be associated with a client during creation.
     - A **Users** page (visible only to admins) for managing user accounts and roles.  When creating or editing a crew user, you can select which crew they belong to.  Role changes and crew assignments are sent immediately to the backend.
     - A **Reports** page (for admins and foremen) showing daily job summaries and statistics.
     - A **Billing** page where users can select a subscription plan (Starter, Pro or Premium).  The page calls the backend to create a Stripe Checkout session and redirects the user to Stripe’s hosted payment flow.  Success and cancellation pages handle the return from Stripe.  Users’ plan choices and subscription statuses are stored in their profile.
     - The public marketing page includes a **Contact** section allowing visitors to send their name, email and message.  Submissions are delivered via the new `/contact` endpoint to the configured `ADMIN_EMAIL` or logged to the console if email is not set.

   - **Mobile & PWA Support**: The front‑end includes a web app manifest (`/public/manifest.json`) and meta tags so that the application can be installed on mobile devices as a Progressive Web App.  Icons are provided in 192×192 and 512×512 sizes.  The layout and navigation have been made responsive to ensure a clean, minimal experience on phones and tablets.
     - A **login/sign‑up** page; unauthenticated users are redirected here when attempting to access protected routes.  After logging in, the session token and user role are stored in `localStorage` and included on subsequent API calls.
   - All pages are styled using Tailwind CSS and use the same `Layout` component for navigation.

### Disclaimer

This prototype is for demonstration purposes only.  It includes a number of foundational features—authentication, role‑based access control, persistent storage to JSON files, rate limiting, password reset and a basic distance‑based auto‑assignment—but it is **not a production‑ready SaaS**.  Critical pieces such as real database storage, secure session management, third‑party integrations (Twilio, Stripe, Google Maps), advanced AI scheduling logic and deployment hardening still need to be implemented.  Use this as a learning tool and a starting point for further development.

### Docker Deployment

To make it easier to run both the back‑end and front‑end together, this repository includes `Dockerfile`s for each component and a `docker-compose.yml` file.  To run the full stack with Docker:

1. Install [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).
2. Copy `.env.example` to `.env` at the root of the `timeboss` directory and provide the necessary environment variables (Stripe, Twilio, Postmark, etc.).  These variables are used by the back‑end service.
3. From within the `timeboss` directory, run:

   ```sh
   docker-compose up --build
   ```

Docker Compose will build and start two services:

- **backend** on port `4000` – the Express API with persistent data stored in `backend/data`.
- **frontend** on port `3000` – the Next.js app configured to talk to the back‑end service.

By default the front‑end uses `NEXT_PUBLIC_API_URL=http://backend:4000` when running inside Docker.  Modify the `docker-compose.yml` file or set environment variables as needed for your deployment environment.