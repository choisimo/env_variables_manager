const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.originalname.includes('.env') || file.originalname.endsWith('.env')) {
      cb(null, true);
    } else {
      cb(new Error('Only .env files are allowed'));
    }
  }
});

class EnvManager {
  constructor() {
    this.envFiles = new Map();
    this.loadExistingEnvFiles();
  }

  async loadExistingEnvFiles() {
    try {
      const currentDir = process.cwd();
      const parentDir = path.dirname(currentDir);
      
      const envFiles = await this.findEnvFiles(parentDir);
      envFiles.forEach(filePath => {
        this.addEnvFile(filePath);
      });
    } catch (error) {
      console.error('Error loading existing env files:', error);
    }
  }

  async findEnvFiles(dir) {
    const envFiles = [];
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile() && (file === '.env' || file.startsWith('.env.'))) {
          envFiles.push(filePath);
        } else if (stat.isDirectory() && !file.startsWith('.')) {
          const subEnvFiles = await this.findEnvFiles(filePath);
          envFiles.push(...subEnvFiles);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    return envFiles;
  }

  addEnvFile(filePath) {
    const id = uuidv4();
    this.envFiles.set(id, {
      id,
      path: filePath,
      name: path.basename(filePath),
      directory: path.dirname(filePath),
      relativePath: path.relative(process.cwd(), filePath)
    });
    return id;
  }

  async readEnvFile(id) {
    const envFile = this.envFiles.get(id);
    if (!envFile) {
      throw new Error('Environment file not found');
    }

    try {
      const content = await fs.readFile(envFile.path, 'utf8');
      return this.parseEnvContent(content);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  parseEnvContent(content) {
    const variables = {};
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          variables[key] = {
            value: value.replace(/^["']|["']$/g, ''),
            lineNumber: index + 1,
            originalLine: line
          };
        }
      }
    });
    
    return { variables, rawContent: content };
  }

  async writeEnvFile(id, variables) {
    const envFile = this.envFiles.get(id);
    if (!envFile) {
      throw new Error('Environment file not found');
    }

    let content = '';
    Object.entries(variables).forEach(([key, data]) => {
      const value = data.value;
      const needsQuotes = value.includes(' ') || value.includes('\n') || value.includes('\t');
      content += `${key}=${needsQuotes ? `"${value}"` : value}\n`;
    });

    try {
      await fs.writeFile(envFile.path, content, 'utf8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async createBackup(id) {
    const envFile = this.envFiles.get(id);
    if (!envFile) {
      throw new Error('Environment file not found');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${envFile.path}.backup.${timestamp}`;
    
    try {
      await fs.copy(envFile.path, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  getAllEnvFiles() {
    return Array.from(this.envFiles.values());
  }

  removeEnvFile(id) {
    return this.envFiles.delete(id);
  }
}

const envManager = new EnvManager();

app.get('/api/env-files', (req, res) => {
  try {
    const files = envManager.getAllEnvFiles();
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/env-files', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }

    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'File does not exist' });
    }

    const id = envManager.addEnvFile(filePath);
    const envFile = envManager.envFiles.get(id);
    
    res.json({ success: true, file: envFile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/env-files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await envManager.readEnvFile(id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/env-files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;
    
    await envManager.createBackup(id);
    await envManager.writeEnvFile(id, variables);
    
    res.json({ success: true, message: 'Environment file updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/env-files/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = envManager.removeEnvFile(id);
    
    if (success) {
      res.json({ success: true, message: 'Environment file removed from management' });
    } else {
      res.status(404).json({ success: false, error: 'Environment file not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/env-files/:id/backup', async (req, res) => {
  try {
    const { id } = req.params;
    const backupPath = await envManager.createBackup(id);
    res.json({ success: true, backupPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/upload', upload.single('envFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { destination } = req.body;
    const uploadedFile = req.file;
    const targetPath = destination ? path.join(destination, uploadedFile.originalname) : uploadedFile.originalname;
    
    await fs.move(uploadedFile.path, targetPath);
    const id = envManager.addEnvFile(targetPath);
    const envFile = envManager.envFiles.get(id);
    
    res.json({ success: true, file: envFile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/env-files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const envFile = envManager.envFiles.get(id);
    
    if (!envFile) {
      return res.status(404).json({ success: false, error: 'Environment file not found' });
    }

    res.download(envFile.path, envFile.name);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scan-directory', async (req, res) => {
  try {
    const { directory } = req.body;
    
    if (!directory) {
      return res.status(400).json({ success: false, error: 'Directory path is required' });
    }

    const exists = await fs.pathExists(directory);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'Directory does not exist' });
    }

    const envFiles = await envManager.findEnvFiles(directory);
    const newFiles = [];
    
    envFiles.forEach(filePath => {
      const existing = Array.from(envManager.envFiles.values()).find(f => f.path === filePath);
      if (!existing) {
        const id = envManager.addEnvFile(filePath);
        newFiles.push(envManager.envFiles.get(id));
      }
    });
    
    res.json({ success: true, newFiles, totalFound: envFiles.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Environment Manager Server running on http://localhost:${PORT}`);
  console.log('Features:');
  console.log('- Manage multiple .env files from different directories');
  console.log('- Web-based editor with syntax highlighting');
  console.log('- Automatic backup before changes');
  console.log('- File upload/download support');
  console.log('- Directory scanning for .env files');
});

module.exports = app;