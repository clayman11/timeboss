const express = require('express');
// Load environment variables from .env if present
require('dotenv').config();
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Stripe = require('stripe');
const { Configuration, OpenAIApi } = require('openai');

// Optional database integration.  If a DATABASE_URL is configured, the db module
// connects to PostgreSQL and exposes helper methods.  If not, it falls back to
// in-memory JSON storage.  See db.js for details.
const db = require('./db');
db.initDb().catch((err) => {
  console.error('Database initialization failed:', err);
});

// Configure CORS options.  If CORS_ORIGIN is set in the environment, only that
// origin will be allowed.  Otherwise all origins are permitted.
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
};

// Notification clients (Twilio and Postmark).  In a production system you would store
// your credentials in environment variables.  For this prototype, if the
// necessary environment variables are not set the notification functions will
// simply log to the console.
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.error('Failed to initialize Twilio client', err);
  }
}
let postmarkClient = null;
if (process.env.POSTMARK_API_TOKEN) {
  try {
    const { ServerClient } = require('postmark');
    postmarkClient = new ServerClient(process.env.POSTMARK_API_TOKEN);
  } catch (err) {
    console.error('Failed to initialize Postmark client', err);
  }
}

async function sendSMS(to, body) {
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER && to) {
    try {
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body,
      });
    } catch (err) {
      console.error('Error sending SMS:', err);
    }
  } else {
    console.log(`SMS to ${to}: ${body}`);
  }
}

async function sendEmail(to, subject, text) {
  if (postmarkClient && process.env.POSTMARK_SENDER_ADDRESS && to) {
    try {
      await postmarkClient.sendEmail({
        From: process.env.POSTMARK_SENDER_ADDRESS,
        To: to,
        Subject: subject,
        TextBody: text,
      });
    } catch (err) {
      console.error('Error sending email:', err);
    }
  } else {
    console.log(`Email to ${to} – ${subject}: ${text}`);
  }
}

async function notifyAssignment(job, crew, client) {
  // Notify crew via SMS/email if contact details provided
  const crewMessage = `You have been assigned to job #${job.id}: ${job.description || ''}.`;
  if (crew.phone) {
    await sendSMS(crew.phone, crewMessage);
  }
  if (crew.email) {
    await sendEmail(crew.email, `New Job Assigned (#${job.id})`, crewMessage);
  }
  // Notify client that their job has been scheduled
  if (client) {
    const clientMessage = `Your job (#${job.id}) has been scheduled and assigned to ${crew.name}.`;
    if (client.phone) {
      await sendSMS(client.phone, clientMessage);
    }
    if (client.email) {
      await sendEmail(client.email, `Job Scheduled (#${job.id})`, clientMessage);
    }
  }
}

async function notifyStatus(job, crew, client) {
  const statusMessage = `Job #${job.id} status updated to ${job.status}.`;
  // Notify crew (if provided) – they might be interested in changes after assignment
  if (crew) {
    if (crew.phone) {
      await sendSMS(crew.phone, statusMessage);
    }
    if (crew.email) {
      await sendEmail(crew.email, `Job Status Update (#${job.id})`, statusMessage);
    }
  }
  // Notify client
  if (client) {
    if (client.phone) {
      await sendSMS(client.phone, statusMessage);
    }
    if (client.email) {
      await sendEmail(client.email, `Job Status Update (#${job.id})`, statusMessage);
    }
  }
}

// --- Payment integration (Stripe) ---
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Create a checkout session for a subscription plan
app.post('/billing/create-checkout-session', authenticate, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }
  const { plan } = req.body;
  const planKey = plan ? plan.toUpperCase() : '';
  const priceId = process.env[`STRIPE_PRICE_${planKey}`];
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    // Ensure user has a Stripe customer
    const user = users.find((u) => u.id === req.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.username });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      saveData();
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [ { price: priceId, quantity: 1 } ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/cancel`,
    });
    // Record the plan choice so we can activate it later (in a real webhook)
    user.plan = plan;
    user.subscriptionStatus = 'pending';
    saveData();
    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

// Handle Stripe webhooks (stub).  You should configure STRIPE_WEBHOOK_SECRET and
// verify the signature in a real implementation.  This endpoint updates the
// user's subscription status and plan in the prototype's user store.
app.post('/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // In this prototype we simply log the event.  In production you would
  // verify the signature and update user.subscriptionStatus and user.plan.
  console.log('Received Stripe webhook event');
  res.json({ received: true });
});

// --- AI Schedule Optimization ---
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  openaiClient = new OpenAIApi(config);
}

app.post('/jobs/optimize', authenticate, requireRoleIn(['admin', 'foreman']), async (req, res) => {
  // This endpoint attempts to generate an optimized schedule for unassigned jobs.
  // If OpenAI is configured, it will call the API with a prompt; otherwise it
  // falls back to a simple deterministic heuristic similar to auto‑assignment.
  const unassignedJobs = jobs.filter((j) => !j.crewId);
  if (unassignedJobs.length === 0) {
    return res.json({ message: 'No unassigned jobs' });
  }
  // If OpenAI is available, call the API
  if (openaiClient) {
    try {
      const systemPrompt = `You are an assistant that helps assign jobs to crews based on proximity, skills and workload. Provide suggestions in JSON format [{jobId: number, crewId: number}, ...].`;
      const content = `Jobs: ${JSON.stringify(unassignedJobs)}\nCrews: ${JSON.stringify(crews)}`;
      const response = await openaiClient.createChatCompletion({
        model: 'gpt-4o',
        messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content } ],
      });
      const msg = response.data.choices[0].message.content;
      // Attempt to parse JSON suggestions
      let suggestions = [];
      try {
        suggestions = JSON.parse(msg);
      } catch (err) {
        // Fallback to empty
        suggestions = [];
      }
      return res.json({ suggestions, raw: msg });
    } catch (err) {
      console.error('OpenAI error:', err);
      // fall through to heuristic
    }
  }
  // Simple heuristic: assign each job using the existing auto‑assign algorithm but
  // do not mutate the jobs list.  Return suggestions array.
  const suggestions = [];
  unassignedJobs.forEach((job) => {
    // Copy of assignment logic from /jobs/:id/assign
    const candidates = crews.filter((crew) => {
      const zoneMatch = !job.zone || !crew.zone || crew.zone === job.zone;
      const skillsMatch = job.requiredSkills.every((skill) => crew.skills.includes(skill));
      return zoneMatch && skillsMatch;
    });
    let selected = null;
    let bestScore = Infinity;
    candidates.forEach((c) => {
      const count = jobs.filter((j) => j.crewId === c.id).length;
      const dist = (typeof job.lat === 'number' && typeof job.lng === 'number' && typeof c.lat === 'number' && typeof c.lng === 'number')
        ? haversineDistance(job.lat, job.lng, c.lat, c.lng)
        : 0;
      const score = count * 1000 + dist;
      if (score < bestScore) {
        bestScore = score;
        selected = c;
      }
    });
    if (selected) {
      suggestions.push({ jobId: job.id, crewId: selected.id });
    }
  });
  res.json({ suggestions });
});

// --- Crew Punch‑In/Punch‑Out ---

// Helper to find crew for the authenticated crew user
function getCrewForUser(user) {
  if (!user || user.role !== 'crew' || user.crewId == null) {
    return null;
  }
  return crews.find((c) => c.id === user.crewId);
}

// POST /jobs/:id/check-in – crew marks the job as started
app.post('/jobs/:id/check-in', authenticate, requireRole('crew'), (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const crew = getCrewForUser(req.user);
  if (!crew || job.crewId !== crew.id) {
    return res.status(403).json({ error: 'You are not assigned to this job' });
  }
  // Only allow check‑in if job is scheduled
  if (job.status !== 'Scheduled') {
    return res.status(400).json({ error: 'Job is not in Scheduled status' });
  }
  const { lat, lng } = req.body;
  job.status = 'On-Site';
  job.startTime = Date.now();
  job.checkInLocation = {
    lat: typeof lat === 'number' ? lat : crew.lat,
    lng: typeof lng === 'number' ? lng : crew.lng,
  };
  // Optionally update crew's location
  if (typeof lat === 'number' && typeof lng === 'number') {
    crew.lat = lat;
    crew.lng = lng;
  }
  saveData();
  res.json(job);
});

// POST /jobs/:id/check-out – crew marks the job as complete
app.post('/jobs/:id/check-out', authenticate, requireRole('crew'), (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const crew = getCrewForUser(req.user);
  if (!crew || job.crewId !== crew.id) {
    return res.status(403).json({ error: 'You are not assigned to this job' });
  }
  if (job.status !== 'On-Site') {
    return res.status(400).json({ error: 'Job is not in On-Site status' });
  }
  const { lat, lng } = req.body;
  job.status = 'Complete';
  job.endTime = Date.now();
  job.checkOutLocation = {
    lat: typeof lat === 'number' ? lat : crew.lat,
    lng: typeof lng === 'number' ? lng : crew.lng,
  };
  // Update crew location
  if (typeof lat === 'number' && typeof lng === 'number') {
    crew.lat = lat;
    crew.lng = lng;
  }
  saveData();
  res.json(job);
});

// In‑memory stores for prototype data.  In a real application you would
// persist this information in a database such as PostgreSQL or Firebase.
// In‑memory stores for prototype data.  Data is persisted to JSON files in
// the data directory.  A production application would use a real database.
const dataDir = path.join(__dirname, 'data');
const crewsFile = path.join(dataDir, 'crews.json');
const jobsFile = path.join(dataDir, 'jobs.json');
const usersFile = path.join(dataDir, 'users.json');
const clientsFile = path.join(dataDir, 'clients.json');

// Simple in‑memory session store.  Maps session tokens to user objects.
const sessions = {};

// Rate limiting middleware: limit requests per IP address
const rateLimits = {};
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'anonymous';
  const now = Date.now();
  const entry = rateLimits[ip] || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimits[ip] = entry;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  if (!fs.existsSync(crewsFile)) {
    fs.writeFileSync(crewsFile, '[]');
  }
  if (!fs.existsSync(jobsFile)) {
    fs.writeFileSync(jobsFile, '[]');
  }
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, '[]');
  }
  if (!fs.existsSync(clientsFile)) {
    fs.writeFileSync(clientsFile, '[]');
  }
}

function loadData() {
  ensureDataDir();
  const crewsData = JSON.parse(fs.readFileSync(crewsFile, 'utf8'));
  const jobsData = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
  const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  const clientsData = JSON.parse(fs.readFileSync(clientsFile, 'utf8'));
  return { crewsData, jobsData, usersData, clientsData };
}

function saveData() {
  fs.writeFileSync(crewsFile, JSON.stringify(crews, null, 2));
  fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  fs.writeFileSync(clientsFile, JSON.stringify(clients, null, 2));
}

// Initialize in‑memory data from files
ensureDataDir();
const { crewsData, jobsData, usersData, clientsData } = loadData();
const crews = crewsData;
const jobs = jobsData;
const users = usersData;
const clients = clientsData;

const app = express();
// Apply security middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(rateLimit);
app.use(express.json());

// --- Authentication Helpers ---

// Hash a password using bcrypt.  bcryptjs is synchronous so the call returns a promise.
function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify a password against a stored hash using bcrypt.
function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = authHeader.replace('Bearer ', '');
  const user = sessions[token];
  if (!user) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  req.user = user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireRoleIn(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// --- Crew endpoints ---

// GET /crews – returns all crews
app.get('/crews', authenticate, async (req, res) => {
  // If a database is configured, fetch crews from it; otherwise fall back to in‑memory data.
  if (db.enabled) {
    try {
      const data = await db.getCrews();
      if (data) {
        return res.json(data);
      }
    } catch (err) {
      console.error('Error fetching crews from database:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  return res.json(crews);
});

// POST /crews – create a new crew (admin or foreman)
app.post('/crews', authenticate, requireRoleIn(['admin', 'foreman']), async (req, res) => {
  const { name, skills, zone, availability, lat, lng, phone, email } = req.body;
  // Construct a crew object for local storage
  const crew = {
    id: crews.length + 1,
    name,
    skills: Array.isArray(skills) ? skills : [],
    zone: zone || null,
    availability: availability || {},
    lat: typeof lat === 'number' ? lat : 0,
    lng: typeof lng === 'number' ? lng : 0,
    phone: phone || null,
    email: email || null,
  };
  // If a database is configured, insert the crew there first.  The returned record
  // will include the assigned ID from the database.
  if (db.enabled) {
    try {
      const dbCrew = await db.insertCrew({ name, skills, zone, lat: crew.lat, lng: crew.lng, phone, email });
      if (dbCrew) {
        // Sync the in‑memory store with the DB record ID
        crew.id = dbCrew.id;
      }
    } catch (err) {
      console.error('Error inserting crew into database:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  crews.push(crew);
  saveData();
  res.status(201).json(crew);
});

// --- Job endpoints ---

// GET /jobs – returns all jobs
app.get('/jobs', authenticate, (req, res) => {
  res.json(jobs);
});

// POST /jobs – create a new job (admin or foreman)
app.post('/jobs', authenticate, requireRoleIn(['admin', 'foreman']), async (req, res) => {
  const { description, address, crewId, date, requiredSkills, zone, lat, lng, clientId } = req.body;
  // Build a job object for local storage
  const job = {
    id: jobs.length + 1,
    description,
    address,
    crewId: crewId || null,
    date: date || null,
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
    zone: zone || null,
    lat: typeof lat === 'number' ? lat : 0,
    lng: typeof lng === 'number' ? lng : 0,
    status: 'Scheduled',
    clientId: clientId || null,
    startTimestamp: null,
    endTimestamp: null,
    checkInLat: null,
    checkInLng: null,
    checkOutLat: null,
    checkOutLng: null,
  };
  // If a database is available, insert the job and use its generated ID
  if (db.enabled) {
    try {
      const dbJob = await db.insertJob({
        description: job.description,
        address: job.address,
        requiredSkills: job.requiredSkills,
        zone: job.zone,
        date: job.date,
        crewId: job.crewId,
        lat: job.lat,
        lng: job.lng,
        status: job.status,
        clientId: job.clientId,
        startTimestamp: job.startTimestamp,
        endTimestamp: job.endTimestamp,
        checkInLat: job.checkInLat,
        checkInLng: job.checkInLng,
        checkOutLat: job.checkOutLat,
        checkOutLng: job.checkOutLng,
      });
      if (dbJob) {
        job.id = dbJob.id;
      }
    } catch (err) {
      console.error('Error inserting job into database:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  jobs.push(job);
  saveData();
  res.status(201).json(job);
});

// PATCH /jobs/:id/status – update job status (admin or foreman)
// Body: { status }
app.patch('/jobs/:id/status', authenticate, requireRoleIn(['admin', 'foreman', 'crew']), (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const { status } = req.body;
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  // Validate status
  const allowedStatuses = ['Scheduled', 'On-Site', 'Complete', 'Flagged'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  job.status = status;
  saveData();
  // Notify assigned crew and client of status change
  const assignedCrew = job.crewId ? crews.find((c) => c.id === job.crewId) : null;
  const client = job.clientId ? clients.find((cl) => cl.id === job.clientId) : null;
  notifyStatus(job, assignedCrew, client).catch((err) => console.error(err));
  res.json(job);
});

// Haversine distance between two coordinates (lat/lng in degrees).  Returns distance in kilometers.
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /jobs/:id/assign – assign a job to the most suitable crew based on zone, skills and distance (admin or foreman)
app.post('/jobs/:id/assign', authenticate, requireRoleIn(['admin', 'foreman']), (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  // Find crews that match the job's zone and have the required skills.
  const candidates = crews.filter((crew) => {
    // Zone must match or be null (cover any zone)
    const zoneMatch = !job.zone || !crew.zone || crew.zone === job.zone;
    // All required skills must be in crew.skills
    const skillsMatch = job.requiredSkills.every((skill) => crew.skills.includes(skill));
    return zoneMatch && skillsMatch;
  });
  if (candidates.length === 0) {
    return res.status(400).json({ error: 'No suitable crew available' });
  }
  // Choose the crew with the fewest assigned jobs and closest distance to the job location.
  let selected = null;
  let bestScore = Infinity;
  candidates.forEach((c) => {
    const count = jobs.filter((j) => j.crewId === c.id).length;
    // Compute distance.  If either job or crew has no lat/lng, default distance to 0.
    const dist = (typeof job.lat === 'number' && typeof job.lng === 'number' && typeof c.lat === 'number' && typeof c.lng === 'number')
      ? haversineDistance(job.lat, job.lng, c.lat, c.lng)
      : 0;
    // Score: prioritize fewer jobs, then shorter distance.  Use a simple weighted score.
    const score = count * 1000 + dist; // each job counts as 1000 km equivalent distance
    if (score < bestScore) {
      bestScore = score;
      selected = c;
    }
  });
  if (!selected) {
    return res.status(400).json({ error: 'No suitable crew available' });
  }
  job.crewId = selected.id;
  saveData();
  // Look up client and send notifications.  clientId may be null.
  const client = job.clientId ? clients.find((cl) => cl.id === job.clientId) : null;
  notifyAssignment(job, selected, client).catch((err) => console.error(err));
  res.json({ job, assignedTo: selected });
});

// Root
app.get('/', (req, res) => {
  res.send('TimeBoss API is running');
});

// --- Auth endpoints ---

// POST /auth/signup – create a new user
// Body: { username, password }
app.post('/auth/signup', (req, res) => {
app.post('/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  // Check if user exists
  const existing = users.find((u) => u.username === username);
  if (existing) {
    return res.status(400).json({ error: 'User already exists' });
  }
  try {
    const passwordHash = await hashPassword(password);
    // If this is the first user, make them an admin.  Otherwise default to crew.
    const role = users.length === 0 ? 'admin' : 'crew';
    const user = { id: users.length + 1, username, passwordHash, role };
    users.push(user);
    saveData();
    res.status(201).json({ message: 'User created', role });
  } catch (err) {
    console.error('Error hashing password', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login – authenticate user
// Body: { username, password }
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  try {
    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions[token] = { id: user.id, username: user.username, role: user.role, crewId: user.crewId || null };
    res.json({ token, role: user.role, crewId: user.crewId || null });
  } catch (err) {
    console.error('Error verifying password', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/reset-request – request a password reset token
// Body: { username }
app.post('/auth/reset-request', (req, res) => {
  const { username } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    // Do not reveal whether user exists
    return res.json({ message: 'If the user exists, a reset token has been generated.' });
  }
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetTokenHash = resetTokenHash;
  user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  saveData();
  // In production, email the reset token to the user.  For this prototype
  // we return it in the response.
  res.json({ message: 'Reset token generated', token: resetToken });
});

// POST /auth/reset-password – reset password using token
// Body: { username, token, newPassword }
app.post('/auth/reset-password', async (req, res) => {
  const { username, token, newPassword } = req.body;
  if (!username || !token || !newPassword) {
    return res.status(400).json({ error: 'username, token and newPassword are required' });
  }
  const user = users.find((u) => u.username === username);
  if (!user || !user.resetTokenHash || !user.resetTokenExpiry) {
    return res.status(400).json({ error: 'Invalid token' });
  }
  if (Date.now() > user.resetTokenExpiry) {
    return res.status(400).json({ error: 'Token expired' });
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  if (tokenHash !== user.resetTokenHash) {
    return res.status(400).json({ error: 'Invalid token' });
  }
  try {
    // Update password
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    // Remove salt if present from legacy data
    if (user.salt) delete user.salt;
    // Clear reset token fields
    delete user.resetTokenHash;
    delete user.resetTokenExpiry;
    saveData();
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Error resetting password', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me – return current authenticated user
app.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// --- User Management (admin only) ---

// GET /users – list all users (admin only)
app.get('/users', authenticate, requireRole('admin'), (req, res) => {
  // Return list without sensitive information but include crewId for crew assignments
  const list = users.map(({ id, username, role, crewId }) => ({ id, username, role, crewId: crewId || null }));
  res.json(list);
});

// POST /users – create a new user (admin only)
// Body: { username, password, role }
app.post('/users', authenticate, requireRole('admin'), async (req, res) => {
  const { username, password, role, crewId } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password and role are required' });
  }
  if (!['admin', 'foreman', 'crew'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (role === 'crew' && (crewId == null || !crews.find((c) => c.id === parseInt(crewId, 10)))) {
    return res.status(400).json({ error: 'Invalid crewId for crew role' });
  }
  const existing = users.find((u) => u.username === username);
  if (existing) {
    return res.status(400).json({ error: 'User already exists' });
  }
  try {
    const passwordHash = await hashPassword(password);
    const user = { id: users.length + 1, username, passwordHash, role, crewId: role === 'crew' ? parseInt(crewId, 10) : null };
    users.push(user);
    saveData();
    res.status(201).json({ id: user.id, username: user.username, role: user.role, crewId: user.crewId });
  } catch (err) {
    console.error('Error creating user', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/:id – update user role (admin only)
// Body: { role }
app.patch('/users/:id', authenticate, requireRole('admin'), (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { role, crewId } = req.body;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (role && !['admin', 'foreman', 'crew'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (role === 'crew') {
    if (crewId == null || !crews.find((c) => c.id === parseInt(crewId, 10))) {
      return res.status(400).json({ error: 'Invalid crewId for crew role' });
    }
    user.crewId = parseInt(crewId, 10);
  } else if (role && role !== 'crew') {
    user.crewId = null;
  }
  if (role) {
    user.role = role;
  }
  saveData();
  res.json({ id: user.id, username: user.username, role: user.role, crewId: user.crewId });
});

// --- Client endpoints ---

// GET /clients – list all clients (admin or foreman)
app.get('/clients', authenticate, requireRoleIn(['admin', 'foreman', 'crew']), (req, res) => {
  res.json(clients);
});

// POST /clients – create a new client (admin or foreman)
app.post('/clients', authenticate, requireRoleIn(['admin', 'foreman']), (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const id = clients.length + 1;
  const client = { id, name, email: email || null, phone: phone || null };
  clients.push(client);
  saveData();
  res.status(201).json(client);
});

// --- Job Invoicing ---
// Generate a simple invoice for a completed job.  Only admins and foremen can request any job; crew members can request invoices only for jobs assigned to them.
app.get('/jobs/:id/invoice', authenticate, requireRoleIn(['admin', 'foreman', 'crew']), (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  // Check permissions: crew can only view invoices for their own jobs
  if (req.user.role === 'crew') {
    const crew = getCrewForUser(req.user);
    if (!crew || job.crewId !== crew.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  // Ensure job has been completed (has startTime and endTime)
  if (!job.startTime || !job.endTime) {
    return res.status(400).json({ error: 'Job has not been completed yet' });
  }
  const crew = job.crewId ? crews.find((c) => c.id === job.crewId) : null;
  const client = job.clientId ? clients.find((cl) => cl.id === job.clientId) : null;
  // Calculate duration in hours (rounded to two decimals)
  const durationMs = job.endTime - job.startTime;
  const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
  const ratePerHour = 100; // For prototype purposes use a flat rate
  const total = Math.round((durationHours * ratePerHour) * 100) / 100;
  const invoice = {
    jobId: job.id,
    description: job.description,
    date: job.date,
    crew: crew ? { id: crew.id, name: crew.name } : null,
    client: client ? { id: client.id, name: client.name } : null,
    startTime: job.startTime,
    endTime: job.endTime,
    hours: durationHours,
    ratePerHour,
    total,
  };
  res.json(invoice);
});

// Start the server
const PORT = process.env.PORT || 4000;
// Catch‑all handler for unknown routes.  Returns a 404 JSON response.
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start the server only if this file is run directly (not imported).  This allows the app to be
// imported in tests without automatically creating a server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

// Export the Express app for testing purposes.
module.exports = app;

// --- Reporting endpoints ---
// Daily summary of jobs for a given date.  Only admin and foreman can access.
// Query param: date=YYYY-MM-DD.  If not provided, defaults to current date.
app.get('/reports/daily-summary', authenticate, requireRoleIn(['admin', 'foreman']), (req, res) => {
  let { date } = req.query;
  if (!date) {
    const now = new Date();
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  // Gather jobs scheduled for the given date.  Job.date may be undefined or empty.
  const dateJobs = jobs.filter((j) => j.date === date);
  const totalJobs = dateJobs.length;
  const statusCounts = {};
  dateJobs.forEach((j) => {
    const status = j.status || 'Scheduled';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  // Crew summary: count jobs per crew
  const crewCounts = {};
  dateJobs.forEach((j) => {
    if (j.crewId) {
      crewCounts[j.crewId] = (crewCounts[j.crewId] || 0) + 1;
    }
  });
  const crewSummary = Object.keys(crewCounts).map((id) => {
    const crewId = parseInt(id, 10);
    const crew = crews.find((c) => c.id === crewId);
    return {
      crewId,
      name: crew ? crew.name : `Crew ${crewId}`,
      count: crewCounts[id],
    };
  });
  res.json({ date, totalJobs, statusCounts, crewSummary });
});

// --- Contact form endpoint ---
// Allow unauthenticated users to submit a contact form from the marketing page.  The request body
// should contain { name, email, message }.  If an ADMIN_EMAIL environment variable is set or
// POSTMARK_SENDER_ADDRESS is available, the form submission will be emailed to that address.  Otherwise
// it will be logged to the console.  Responds with a thank‑you message on success.
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields (name, email, message) are required' });
  }
  try {
    const to = process.env.ADMIN_EMAIL || process.env.POSTMARK_SENDER_ADDRESS || null;
    const subject = `New contact form submission from ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    if (to) {
      await sendEmail(to, subject, body);
    } else {
      console.log('Contact form submission:', { name, email, message });
    }
    return res.json({ message: 'Thank you for reaching out! We will get back to you soon.' });
  } catch (err) {
    console.error('Error processing contact form submission:', err);
    return res.status(500).json({ error: 'Unable to submit contact form' });
  }
});