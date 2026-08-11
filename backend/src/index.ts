import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import productsRouter from './routes/products';
import challansRouter from './routes/challans';
import dashboardRouter from './routes/dashboard';

// Load Env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow connections from Vite frontend development server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes mounting
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/challans', challansRouter);
app.use('/api/dashboard', dashboardRouter);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Mini ERP + CRM Operations API is running successfully' });
});

// Catch-all 404 Route
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected error occurred on the server' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server successfully started on port ${PORT}`);
});
