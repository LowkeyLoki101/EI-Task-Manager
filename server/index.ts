import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import realtimeRouter from "./realtime";

// Set NODE_ENV for proper production deployment behavior
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.REPL_DEPLOYMENT ? 'production' : 'development';
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced CORS configuration for ElevenLabs widget
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    /\.repl\.co$/,
    /\.replit\.dev$/,
    /\.replit\.app$/,
    'https://unpkg.com',
    'https://api.elevenlabs.io',
    /\.elevenlabs\.io$/,
    'http://localhost:5173',  // Vite dev server
    'http://localhost:5000'   // Our server
  ];
  
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return origin === allowedOrigin;
    }
    return allowedOrigin.test(origin || '');
  });
  
  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, xi-api-key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Add permissions policy for microphone access
  res.header('Permissions-Policy', 'microphone=*');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Debug middleware to catch all ElevenLabs webhook requests
app.use('/api/actions', (req, res, next) => {
  console.log(`[DEBUG] ElevenLabs webhook intercepted: ${req.method} ${req.path}`);
  console.log(`[DEBUG] Body:`, JSON.stringify(req.body, null, 2));
  console.log(`[DEBUG] Headers:`, req.headers);
  next();
});

// Mount realtime router
app.use(realtimeRouter);

// Graceful server startup with proper error handling
(async () => {
  try {
    log('Starting server initialization...');
    
    // Register routes and get HTTP server instance
    const server = await registerRoutes(app);
    log('Routes registered successfully');

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Log error for debugging but don't crash the app
      console.error(`[ERROR] ${req.method} ${req.path}:`, {
        status,
        message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      res.status(status).json({ message });
      // Removed throw err to prevent app crashes in production
    });

    // Setup vite in development or serve static files in production
    // Use NODE_ENV for proper environment detection
    const isProduction = process.env.NODE_ENV === 'production';
    log(`Environment: ${process.env.NODE_ENV || 'development'} (isProduction: ${isProduction})`);
    
    if (isProduction) {
      log('Setting up static file serving for production');
      serveStatic(app);
    } else {
      log('Setting up Vite development server');
      await setupVite(app, server);
    }
    log('Frontend setup completed');

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Start the server with proper error handling
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✅ Server successfully started`);
      log(`🌐 Serving on http://0.0.0.0:${port}`);
      log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`🚀 Server is ready to accept connections`);
    });
    
    // Handle server errors
    server.on('error', (error: any) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
})();

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
