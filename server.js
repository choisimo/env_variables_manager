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

// === 유틸리티 함수들 ===

/**
 * HTTP 헤더용 파일명 정규화 함수 (RFC 5987 준수)
 * @param {string} fileName - 정규화할 파일명
 * @returns {string} HTTP 헤더용 안전한 파일명
 */
function sanitizeFileNameForHeader(fileName) {
    if (!fileName || typeof fileName !== 'string') {
        return 'untitled';
    }
    
    return fileName
        .replace(/[^\w\s.-]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === 에러 처리 미들웨어 ===

/**
 * 전역 에러 핸들러 미들웨어
 */
function errorHandler(err, req, res, next) {
    console.error('Server Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent')
    });

    // 클라이언트에게 안전한 에러 메시지 전송
    if (err.code === 'ENOENT') {
        return res.status(404).json({
            success: false,
            error: 'File not found',
            code: 'FILE_NOT_FOUND'
        });
    }

    if (err.code === 'EACCES' || err.code === 'EPERM') {
        return res.status(403).json({
            success: false,
            error: 'Permission denied',
            code: 'PERMISSION_ERROR'
        });
    }

    if (err.code === 'EMFILE' || err.code === 'ENFILE') {
        return res.status(503).json({
            success: false,
            error: 'Server temporarily unavailable',
            code: 'SERVER_BUSY'
        });
    }

    // 기본 서버 에러
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
}

/**
 * 비동기 라우트 핸들러 래퍼
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 요청 검증 미들웨어
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message,
                code: 'VALIDATION_ERROR'
            });
        }
        next();
    };
}

const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.originalname.includes('.env') || file.originalname.endsWith('.env')) {
            cb(null, true);
        } else {
            cb(new Error('Only .env files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
        files: 5 // 최대 5개 파일
    }
});

// 파일 업로드 에러 처리
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.',
                code: 'FILE_TOO_LARGE'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files. Maximum is 5 files.',
                code: 'TOO_MANY_FILES'
            });
        }
    }
    next(error);
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

        // 파일 존재 여부 확인
        const exists = await fs.pathExists(envFile.path);
        if (!exists) {
            return res.status(404).json({ success: false, error: 'File does not exist on disk' });
        }

        // 파일 내용을 직접 읽어서 전송
        try {
            const fileContent = await fs.readFile(envFile.path, 'utf8');
            
            // 안전한 파일명 생성 (RFC 5987 준수)
            const safeFileName = sanitizeFileNameForHeader(envFile.name);
            const encodedFileName = encodeURIComponent(envFile.name);
            
            res.setHeader('Content-Disposition', 
                `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`);
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send(fileContent);
        } catch (readError) {
            console.error('File read error:', readError);
            return res.status(500).json({ success: false, error: 'Failed to read file' });
        }
    } catch (error) {
        console.error('Download endpoint error:', error);
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

// === 성능 모니터링 엔드포인트 ===

// 시스템 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
    const systemResources = monitorSystemResources();
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        system: systemResources,
        version: process.env.npm_package_version || '1.0.0'
    });
});

// 메트릭 수집 엔드포인트
app.post('/api/metrics', (req, res) => {
    try {
        const clientMetrics = req.body;
        
        // 클라이언트 메트릭 저장
        saveMetric({
            ...clientMetrics,
            source: 'client',
            serverTimestamp: new Date().toISOString()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Metrics collection error:', error);
        res.status(500).json({ success: false, error: 'Failed to collect metrics' });
    }
});

// 메트릭 조회 엔드포인트 (대시보드용)
app.get('/api/metrics', (req, res) => {
    const { type, limit = 100 } = req.query;
    
    let filteredMetrics = metrics;
    
    if (type) {
        filteredMetrics = metrics.filter(m => m.type === type);
    }
    
    const recentMetrics = filteredMetrics.slice(-parseInt(limit));
    
    res.json({
        success: true,
        metrics: recentMetrics,
        total: filteredMetrics.length,
        system: monitorSystemResources()
    });
});

// === 시스템 리소스 모니터링 함수들 ===

/**
 * 시스템 리소스 모니터링
 */
function monitorSystemResources() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        uptime: Math.round(process.uptime())
    };
}

/**
 * 메트릭 저장 함수
 */
const metrics = [];
function saveMetric(metric) {
    metrics.push(metric);
    
    // 메트릭 개수 제한
    if (metrics.length > 10000) {
        metrics.splice(0, 5000);
    }
}

// 에러 핸들러 미들웨어 (모든 라우트 이후에 추가)
app.use(errorHandler);

// 404 핸들러
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

app.listen(PORT, () => {
    console.log(`Environment Manager Server running on http://localhost:${PORT}`);
    console.log('Features:');
    console.log('- Manage multiple .env files from different directories');
    console.log('- Web-based editor with syntax highlighting');
    console.log('- Automatic backup before changes');
    console.log('- File upload/download support');
    console.log('- Directory scanning for .env files');
    console.log('- Enhanced error handling and logging');
    console.log('- Performance monitoring and metrics');
    
    // 정기적인 시스템 모니터링 시작
    if (process.env.NODE_ENV !== 'test') {
        setInterval(() => {
            const systemMetrics = monitorSystemResources();
            
            // 메모리 사용량 경고 (80% 이상)
            if (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal > 0.8) {
                console.warn('🚨 High memory usage:', systemMetrics.memory);
            }
            
            saveMetric({
                type: 'system_resources',
                ...systemMetrics,
                timestamp: new Date().toISOString()
            });
        }, 30000); // 30초마다 시스템 리소스 체크
    }
});

module.exports = app;