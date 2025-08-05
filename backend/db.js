const { Client } = require('pg');

// This module provides optional database access using PostgreSQL.  If a DATABASE_URL
// environment variable is defined, the module will connect to that database and
// attempt to create required tables.  If no database URL is configured, the
// functions simply return null and the calling code should fall back to its
// in‑memory JSON storage.

const enabled = !!process.env.DATABASE_URL;
let client = null;

async function initDb() {
  if (!enabled) return;
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  // Create tables if they do not exist.  These schemas are intentionally simple and
  // mirror the structure of the in‑memory objects.  Feel free to adjust fields
  // (types, constraints, etc.) for a production deployment.
  await client.query(`
    CREATE TABLE IF NOT EXISTS crews (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      skills JSONB,
      zone TEXT,
      lat REAL,
      lng REAL,
      phone TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      description TEXT,
      address TEXT,
      requiredskills JSONB,
      zone TEXT,
      date TEXT,
      crewid INTEGER,
      lat REAL,
      lng REAL,
      status TEXT,
      clientid INTEGER,
      starttimestamp TEXT,
      endtimestamp TEXT,
      checkinlat REAL,
      checkinlng REAL,
      checkoutlat REAL,
      checkoutlng REAL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT,
      password TEXT,
      role TEXT,
      crewid INTEGER,
      stripecustomerid TEXT,
      plan TEXT,
      subscriptionstatus TEXT
    );
  `);
}

// Crew operations
async function getCrews() {
  if (!enabled) return null;
  const { rows } = await client.query('SELECT * FROM crews ORDER BY id');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    skills: row.skills || [],
    zone: row.zone,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    email: row.email,
  }));
}

async function insertCrew(data) {
  if (!enabled) return null;
  const { name, skills = [], zone, lat, lng, phone, email } = data;
  const { rows } = await client.query(
    'INSERT INTO crews (name, skills, zone, lat, lng, phone, email) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [name, JSON.stringify(skills), zone, lat, lng, phone, email]
  );
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    skills: row.skills || [],
    zone: row.zone,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    email: row.email,
  };
}

// Job operations
async function getJobs() {
  if (!enabled) return null;
  const { rows } = await client.query('SELECT * FROM jobs ORDER BY id');
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    address: row.address,
    requiredSkills: row.requiredskills || [],
    zone: row.zone,
    date: row.date,
    crewId: row.crewid,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    clientId: row.clientid,
    startTimestamp: row.starttimestamp,
    endTimestamp: row.endtimestamp,
    checkInLat: row.checkinlat,
    checkInLng: row.checkinlng,
    checkOutLat: row.checkoutlat,
    checkOutLng: row.checkoutlng,
  }));
}

async function insertJob(data) {
  if (!enabled) return null;
  const {
    description,
    address,
    requiredSkills = [],
    zone,
    date,
    crewId,
    lat,
    lng,
    status,
    clientId,
    startTimestamp,
    endTimestamp,
    checkInLat,
    checkInLng,
    checkOutLat,
    checkOutLng,
  } = data;
  const { rows } = await client.query(
    `INSERT INTO jobs (
      description, address, requiredskills, zone, date, crewid, lat, lng, status, clientid,
      starttimestamp, endtimestamp, checkinlat, checkinlng, checkoutlat, checkoutlng
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [
      description,
      address,
      JSON.stringify(requiredSkills),
      zone,
      date,
      crewId,
      lat,
      lng,
      status,
      clientId,
      startTimestamp,
      endTimestamp,
      checkInLat,
      checkInLng,
      checkOutLat,
      checkOutLng,
    ]
  );
  const row = rows[0];
  return {
    id: row.id,
    description: row.description,
    address: row.address,
    requiredSkills: row.requiredskills || [],
    zone: row.zone,
    date: row.date,
    crewId: row.crewid,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    clientId: row.clientid,
    startTimestamp: row.starttimestamp,
    endTimestamp: row.endtimestamp,
    checkInLat: row.checkinlat,
    checkInLng: row.checkinlng,
    checkOutLat: row.checkoutlat,
    checkOutLng: row.checkoutlng,
  };
}

module.exports = {
  enabled,
  initDb,
  getCrews,
  insertCrew,
  getJobs,
  insertJob,
};module.exports = {
  query: (...args) => client.query(...args),
  initDb
};
