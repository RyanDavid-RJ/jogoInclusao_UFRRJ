const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const sslEnabled = process.env.DB_SSL === 'true';
const configuredPort = process.env.DB_PORT;
const port = Number(configuredPort);

if (
  !configuredPort ||
  !/^\d+$/.test(configuredPort) ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error("DB_PORT must be a valid TCP port.");
}

let ssl;

if (sslEnabled) {
  let ca;
  const configuredCa = process.env.DB_CA_CERT?.trim();
  const configuredCaPath = process.env.DB_CA_PATH?.trim();

  if (configuredCaPath) {
    try {
      const caPath = path.resolve(__dirname, "..", configuredCaPath);
      const fileCa = fs.readFileSync(caPath);
      if (fileCa.length > 0) {
        ca = fileCa;
      }
    } catch {
      // Fall back to the environment value when the deployment does not create a file.
    }
  }

  if (!ca && configuredCa) {
    ca = configuredCa.replace(/\\n/g, "\n");
  }

  if (!ca) {
    throw new Error(
      "Database TLS is enabled, but DB_CA_CERT or DB_CA_PATH is not configured.",
    );
  }

  ssl = {
    ca,
    rejectUnauthorized: true,
  };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(sslEnabled ? { ssl } : {}),
});

module.exports = pool;
