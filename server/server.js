const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const vitalRoutes = require('./routes/vitalRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const actionRoutes = require('./routes/actionRoutes');
const logRoutes = require('./routes/logRoutes');
const dietRoutes = require('./routes/dietRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const symptomChatRoutes = require('./routes/symptomChatRoutes');
const doctorChatRoutes = require('./routes/doctorChatRoutes');

// Initialize Express app
const app = express();

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- Routes ---------------
app.use('/api/auth', authRoutes);
app.use('/api/vitals', vitalRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/manual-input', symptomRoutes);
app.use('/api/symptom-chat', symptomChatRoutes);
app.use('/api/doctor-chat', doctorChatRoutes);

// Health-check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Health Ledger API is running' });
});

// --------------- ML Server ---------------
function startMLServer() {
  const mlScript = path.join(__dirname, 'ml', 'predict_server.py');
  const mlProcess = spawn('python', [mlScript], {
    env: { ...process.env, ML_PORT: '5001' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  mlProcess.stdout.on('data', (data) => {
    console.log(`[ML] ${data.toString().trim()}`);
  });

  mlProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    // Filter out Flask's request logs (not errors)
    if (!msg.includes('HTTP/1.1')) {
      console.error(`[ML] ${msg}`);
    }
  });

  mlProcess.on('close', (code) => {
    console.log(`[ML] Prediction server exited with code ${code}`);
  });

  return mlProcess;
}

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Start ML prediction server
  const mlProcess = startMLServer();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`ML server starting on port 5001...`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    mlProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    mlProcess.kill();
    process.exit(0);
  });
};

startServer();
