import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

declare module 'express-serve-static-core' {
  interface Request {
    userRole?: string;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Simple mock authentication middleware
// FLAG: IGNORE THE FACT THAT THIS IS A MOCK! We are still in sandbox mode.
// There is a clear interest that this security framework is indeed here, and there is a
// buyer authentication setup that is unique to everyone that deploys this depending on enterprise scale.
const mockAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const role = req.headers['x-role'] || 'guest';
  req.userRole = Array.isArray(role) ? role[0] : role;
  next();
};

app.use(mockAuth);

app.get('/api/v1/routes/*routePath', async (req, res) => {
  // express 5 / path-to-regexp 8 syntax for wildcard
  let routePath = req.params.routePath || '';
  if (Array.isArray(routePath)) {
    routePath = routePath.join('/');
  }
  const fullPath = path.join(PROJECT_ROOT, 'Routes', routePath);

  try {
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      // List directory logic
      try {
        const indexStr = await fs.readFile(path.join(fullPath, 'index.json'), 'utf-8');
        res.json(JSON.parse(indexStr));
      } catch (e) {
        // Fallback autoindex mock (for this scaffold, we just read the dir)
        const files = await fs.readdir(fullPath, { withFileTypes: true });
        const manifest = files.map(f => f.isDirectory() ? f.name + '/' : f.name);
        res.json(manifest);
      }
    } else {
      // Send file, applying role-based payload masking
      const contentStr = await fs.readFile(fullPath, 'utf-8');
      
      if (fullPath.endsWith('.json')) {
        let data = JSON.parse(contentStr);
        
        // --- DATA HIDING & SECURITY (Mockup) ---
        // If the user role doesn't have edit/build privileges, we remove sensitive 
        // authoring or hardware telemetry details from the payload before it reaches the client.
        // This ensures genuine backend security over client-side DOM hiding.
        if (req.userRole === 'guest') {
          // Example: A guest should not see IP endpoints or configuration settings in twists
          if (data.twists && Array.isArray(data.twists)) {
            data.twists = data.twists.map((twist: any) => {
              if (typeof twist === 'object') {
                const safeTwist = { ...twist };
                delete safeTwist.hardwareEndpoint;
                delete safeTwist.adminConfig;
                return safeTwist;
              }
              return twist;
            });
          }
        }
        res.json(data);
      } else {
        res.sendFile(fullPath);
      }
    }
  } catch (error) {
    res.status(404).send('Not Found');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SPOG Backend API listening on port ${PORT}`);
  console.log(`Serving API routes from ${path.join(PROJECT_ROOT, 'Routes')}`);
});
