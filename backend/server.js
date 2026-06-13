const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars FIRST
dotenv.config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const integrationRoutes = require('./routes/integrations');
const memoryRoutes = require('./routes/memory');
const documentRoutes = require('./routes/documents');

// Connect to database
connectDB();

// Global Error Handlers to prevent Node from crashing due to external SDK stream parsing errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Keeping process alive...', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! Keeping process alive...', reason?.message || reason);
});

const app = express();



// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/documents', documentRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
