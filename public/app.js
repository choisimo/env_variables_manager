class AIService {
    constructor() {
        this.apiKeys = this.loadAPIKeys();
        this.chatHistory = this.loadChatHistory();
        this.preferredModel = localStorage.getItem('ai_preferred_model') || 'provider_a/model_1';
    }

    loadAPIKeys() {
        return {
            provider_a: localStorage.getItem('ai_provider_a_key') || '',
            provider_b: localStorage.getItem('ai_provider_b_key') || '',
            provider_c: localStorage.getItem('ai_provider_c_key') || ''
        };
    }

    saveAPIKeys(keys) {
        this.apiKeys = keys;
        if (keys.provider_a) localStorage.setItem('ai_provider_a_key', keys.provider_a);
        if (keys.provider_b) localStorage.setItem('ai_provider_b_key', keys.provider_b);
        if (keys.provider_c) localStorage.setItem('ai_provider_c_key', keys.provider_c);
    }

    clearAPIKeys() {
        localStorage.removeItem('ai_provider_a_key');
        localStorage.removeItem('ai_provider_b_key');
        localStorage.removeItem('ai_provider_c_key');
        localStorage.removeItem('ai_preferred_model');
        this.apiKeys = { provider_a: '', provider_b: '', provider_c: '' };
    }

    loadChatHistory() {
        const history = localStorage.getItem('ai_chat_history');
        return history ? JSON.parse(history) : [];
    }

    saveChatHistory() {
        localStorage.setItem('ai_chat_history', JSON.stringify(this.chatHistory));
    }

    clearChatHistory() {
        this.chatHistory = [];
        localStorage.removeItem('ai_chat_history');
    }

    getAvailableModels() {
        const models = [];
        if (this.apiKeys.provider_a) {
            models.push({ value: 'provider_a/model_1', label: 'Provider A Model 1' });
            models.push({ value: 'provider_a/model_2', label: 'Provider A Model 2' });
        }
        if (this.apiKeys.provider_b) {
            models.push({ value: 'provider_b/model_1', label: 'Provider B Model 1' });
            models.push({ value: 'provider_b/model_2', label: 'Provider B Model 2' });
            models.push({ value: 'provider_b/model_3', label: 'Provider B Model 3' });
        }
        if (this.apiKeys.provider_c) {
            models.push({ value: 'provider_c/model_1', label: 'Provider C Model 1' });
            models.push({ value: 'provider_c/model_2', label: 'Provider C Model 2' });
        }
        return models;
    }

    async sendMessage(message, model = this.preferredModel) {
        const [provider, modelName] = model.split('/', 2);
        
        try {
            switch (provider) {
                case 'provider_a':
                    return await this.sendProviderAMessage(message, modelName);
                case 'provider_b':
                    return await this.sendProviderBMessage(message, modelName);
                case 'provider_c':
                    return await this.sendProviderCMessage(message, modelName);
                default:
                    throw new Error('지원되지 않는 AI 모델입니다.');
            }
        } catch (error) {
            throw new Error(`AI API 오류: ${error.message}`);
        }
    }

    async sendProviderAMessage(message, model) {
        const response = await fetch('https://api.provider-a.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.provider_a}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '당신은 환경변수 관리 전문가입니다. 사용자의 환경변수 관련 질문에 도움을 주고, 보안 모범 사례를 제안하며, 설정 파일을 개선하는 방법을 알려주세요.'
                    },
                    ...this.chatHistory.slice(-10),
                    { role: 'user', content: message }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Provider A API 오류: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async sendProviderBMessage(message, model) {
        const response = await fetch('https://api.provider-b.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.provider_b}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Environment Variables Manager'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '당신은 환경변수 관리 전문가입니다. 사용자의 환경변수 관련 질문에 도움을 주고, 보안 모범 사례를 제안하며, 설정 파일을 개선하는 방법을 알려주세요.'
                    },
                    ...this.chatHistory.slice(-10),
                    { role: 'user', content: message }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Provider B API 오류: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async sendProviderCMessage(message, model) {
        const response = await fetch(`https://api.provider-c.com/v1beta/models/${model}:generateContent?key=${this.apiKeys.provider_c}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `환경변수 관리 전문가로서 다음 질문에 답해주세요: ${message}`
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Provider C API 오류: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    addToChatHistory(role, content) {
        this.chatHistory.push({ role, content });
        if (this.chatHistory.length > 20) {
            this.chatHistory = this.chatHistory.slice(-20);
        }
        this.saveChatHistory();
    }
}

class EnvManager {
    constructor() {
        this.currentFileId = null;
        this.currentVariables = {};
        this.envFiles = [];
        this.aiService = new AIService();
        this.init();
    }

    async init() {
        await this.loadEnvFiles();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files);
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files);
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadEnvFiles() {
        try {
            const response = await fetch('/api/env-files');
            const result = await response.json();
            
            if (result.success) {
                this.envFiles = result.files;
                this.renderFileList();
            }
        } catch (error) {
            this.showStatus('파일 목록을 불러오는데 실패했습니다: ' + error.message, 'error');
        }
    }

    renderFileList() {
        const fileList = document.getElementById('fileList');
        
        if (this.envFiles.length === 0) {
            fileList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">등록된 파일이 없습니다</div>';
            return;
        }

        fileList.innerHTML = this.envFiles.map(file => `
            <div class="file-item ${file.id === this.currentFileId ? 'active' : ''}" 
                 onclick="envManager.selectFile('${file.id}')">
                <div class="file-name">${file.name}</div>
                <div class="file-path">${file.relativePath || file.path}</div>
            </div>
        `).join('');
    }

    async selectFile(fileId) {
        try {
            this.currentFileId = fileId;
            this.renderFileList();
            
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('envEditor').classList.add('active');
            
            const response = await fetch(`/api/env-files/${fileId}`);
            const result = await response.json();
            
            if (result.success) {
                this.currentVariables = result.data.variables;
                this.renderVariables();
                
                const file = this.envFiles.find(f => f.id === fileId);
                document.getElementById('editorTitle').textContent = `📝 ${file.name} 편집`;
            }
        } catch (error) {
            this.showStatus('파일을 불러오는데 실패했습니다: ' + error.message, 'error');
        }
    }

    renderVariables() {
        const container = document.getElementById('variablesContainer');
        
        if (Object.keys(this.currentVariables).length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 40px;">환경변수가 없습니다. 새로운 변수를 추가해보세요.</div>';
            return;
        }

        container.innerHTML = Object.entries(this.currentVariables).map(([key, data]) => `
            <div class="variable-item">
                <div class="variable-header">
                    <div class="variable-key">${key}</div>
                    <div class="variable-actions">
                        <button class="btn btn-sm btn-danger" onclick="envManager.removeVariable('${key}')">삭제</button>
                    </div>
                </div>
                <textarea class="variable-value" 
                          onchange="envManager.updateVariable('${key}', this.value)"
                          placeholder="환경변수 값을 입력하세요...">${data.value || ''}</textarea>
            </div>
        `).join('');
    }

    updateVariable(key, value) {
        if (this.currentVariables[key]) {
            this.currentVariables[key].value = value;
        }
    }

    removeVariable(key) {
        if (confirm(`'${key}' 환경변수를 삭제하시겠습니까?`)) {
            delete this.currentVariables[key];
            this.renderVariables();
        }
    }

    addNewVariable() {
        const key = prompt('새 환경변수 이름을 입력하세요:');
        if (key && key.trim()) {
            const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            if (this.currentVariables[cleanKey]) {
                alert('이미 존재하는 환경변수입니다.');
                return;
            }
            
            this.currentVariables[cleanKey] = {
                value: '',
                lineNumber: Object.keys(this.currentVariables).length + 1
            };
            this.renderVariables();
        }
    }

    async saveCurrentFile() {
        if (!this.currentFileId) return;

        return await safeExecuteWithRetry(async () => {
            const response = await fetch(`/api/env-files/${this.currentFileId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    variables: this.currentVariables
                })
            });

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                this.showStatus('✅ 파일이 성공적으로 저장되었습니다!', 'success');
                return result;
            } else {
                throw new Error(result.error || '저장 실패');
            }
        }, 3, 1000, { action: 'saveCurrentFile', fileId: this.currentFileId });
    }

    async createBackup() {
        if (!this.currentFileId) return;

        return await safeExecuteWithRetry(async () => {
            const response = await fetch(`/api/env-files/${this.currentFileId}/backup`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`백업 요청 실패: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (result.success) {
                this.showStatus(`✅ 백업이 생성되었습니다: ${result.backupPath}`, 'success');
                return result;
            } else {
                throw new Error(result.error || '백업 생성 실패');
            }
        }, 2, 1500, { action: 'createBackup', fileId: this.currentFileId });
    }

    async downloadAllStates() {
        if (!this.currentFileId) return;

        try {
            const file = this.envFiles.find(f => f.id === this.currentFileId);
            if (!file) {
                throw new Error('파일 정보를 찾을 수 없습니다');
            }
            
            // 안전한 기본 파일명 생성
            let baseName = sanitizeFileName(file.name);
            if (baseName.endsWith('.env')) {
                baseName = baseName.slice(0, -4);
            }
            
            const zip = new JSZip();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            
            // 원본 파일
            zip.file(`${baseName}.env`, this.generateEnvContent(this.currentVariables));
            
            // 프로덕션 환경용 파일
            const productionVars = Object.fromEntries(
                Object.entries(this.currentVariables).filter(([key, data]) => 
                    !key.includes('DEV') && !key.includes('TEST') && !key.includes('LOCAL')
                )
            );
            zip.file(`${baseName}.production.env`, this.generateEnvContent(productionVars));
            
            // 개발 환경용 파일 (민감한 정보 마스킹)
            const developmentVars = Object.fromEntries(
                Object.entries(this.currentVariables).map(([key, data]) => [
                    key, { ...data, value: key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY') ? 'dev_placeholder' : data.value }
                ])
            );
            zip.file(`${baseName}.development.env`, this.generateEnvContent(developmentVars));
            
            // 템플릿 파일
            const templateVars = Object.fromEntries(
                Object.entries(this.currentVariables).map(([key, data]) => [
                    key, { ...data, value: `YOUR_${key}_HERE` }
                ])
            );
            zip.file(`${baseName}.template.env`, this.generateEnvContent(templateVars));

            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}_all_states_${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showStatus('✅ 모든 상태의 환경변수 파일이 다운로드되었습니다', 'success');
        } catch (error) {
            this.showStatus(`❌ 다운로드 중 오류가 발생했습니다: ${error.message}`, 'error');
        }
    }

    generateEnvContent(variables) {
        return Object.entries(variables)
            .map(([key, data]) => `${key}=${data.value || ''}`)
            .join('\n');
    }

    async removeCurrentFile() {
        if (!this.currentFileId) return;

        const file = this.envFiles.find(f => f.id === this.currentFileId);
        if (confirm(`'${file.name}' 파일을 관리 목록에서 제거하시겠습니까?\n(실제 파일은 삭제되지 않습니다)`)) {
            try {
                const response = await fetch(`/api/env-files/${this.currentFileId}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                if (result.success) {
                    this.showStatus('✅ 파일이 관리 목록에서 제거되었습니다', 'success');
                    this.currentFileId = null;
                    document.getElementById('envEditor').classList.remove('active');
                    document.getElementById('welcomeScreen').style.display = 'block';
                    await this.loadEnvFiles();
                }
            } catch (error) {
                this.showStatus('❌ 파일 제거 중 오류가 발생했습니다: ' + error.message, 'error');
            }
        }
    }

    async handleFileUpload(files) {
        const envFiles = files.filter(file => 
            file.name.includes('.env') || file.name.endsWith('.env')
        );

        if (envFiles.length === 0) {
            this.showStatus('❌ .env 파일만 업로드할 수 있습니다', 'error');
            return;
        }

        for (const file of envFiles) {
            const formData = new FormData();
            formData.append('envFile', file);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    this.showStatus(`✅ ${file.name} 업로드 완료`, 'success');
                } else {
                    this.showStatus(`❌ ${file.name} 업로드 실패: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showStatus(`❌ ${file.name} 업로드 중 오류: ${error.message}`, 'error');
            }
        }

        await this.loadEnvFiles();
        document.getElementById('fileInput').value = '';
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }

    async refreshFileList() {
        await this.loadEnvFiles();
        this.showStatus('✅ 파일 목록이 새로고침되었습니다', 'success');
    }
}

function showAddFileModal() {
    document.getElementById('addFileModal').style.display = 'block';
}

function showScanModal() {
    document.getElementById('scanModal').style.display = 'block';
}

function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function addEnvFile() {
    const filePath = document.getElementById('filePath').value.trim();
    
    if (!filePath) {
        alert('파일 경로를 입력해주세요.');
        return;
    }

    try {
        const response = await fetch('/api/env-files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filePath })
        });

        const result = await response.json();
        if (result.success) {
            envManager.showStatus('✅ 파일이 성공적으로 추가되었습니다', 'success');
            await envManager.loadEnvFiles();
            closeModal('addFileModal');
            document.getElementById('filePath').value = '';
        } else {
            envManager.showStatus('❌ 파일 추가 실패: ' + result.error, 'error');
        }
    } catch (error) {
        envManager.showStatus('❌ 파일 추가 중 오류: ' + error.message, 'error');
    }
}

async function scanDirectory() {
    const directory = document.getElementById('scanPath').value.trim();
    
    if (!directory) {
        alert('디렉토리 경로를 입력해주세요.');
        return;
    }

    try {
        const response = await fetch('/api/scan-directory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ directory })
        });

        const result = await response.json();
        if (result.success) {
            envManager.showStatus(`✅ 디렉토리 스캔 완료: ${result.newFiles.length}개의 새 파일 발견`, 'success');
            await envManager.loadEnvFiles();
            closeModal('scanModal');
            document.getElementById('scanPath').value = '';
        } else {
            envManager.showStatus('❌ 디렉토리 스캔 실패: ' + result.error, 'error');
        }
    } catch (error) {
        envManager.showStatus('❌ 디렉토리 스캔 중 오류: ' + error.message, 'error');
    }
}

async function uploadFiles() {
    const destination = document.getElementById('uploadDestination').value.trim();
    const files = document.getElementById('uploadFileInput').files;
    
    if (files.length === 0) {
        alert('업로드할 파일을 선택해주세요.');
        return;
    }

    for (const file of files) {
        const formData = new FormData();
        formData.append('envFile', file);
        if (destination) {
            formData.append('destination', destination);
        }
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                envManager.showStatus(`✅ ${file.name} 업로드 완료`, 'success');
            } else {
                envManager.showStatus(`❌ ${file.name} 업로드 실패: ${result.error}`, 'error');
            }
        } catch (error) {
            envManager.showStatus(`❌ ${file.name} 업로드 중 오류: ${error.message}`, 'error');
        }
    }

    await envManager.loadEnvFiles();
    closeModal('uploadModal');
    document.getElementById('uploadDestination').value = '';
    document.getElementById('uploadFileInput').value = '';
}

// === 성능 모니터링 시스템 ===

/**
 * 성능 메트릭 수집 및 모니터링 클래스
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.apiMetrics = new Map();
        this.userMetrics = {
            pageLoadTime: 0,
            interactionCount: 0,
            errorCount: 0,
            sessionStart: Date.now()
        };
        
        this.init();
    }

    init() {
        this.measurePageLoad();
        this.setupPerformanceObserver();
        this.trackUserInteractions();
        this.startPeriodicReporting();
    }

    /**
     * 페이지 로딩 시간 측정
     */
    measurePageLoad() {
        if (performance.timing) {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.userMetrics.pageLoadTime = loadTime;
            
            if (loadTime > 3000) {
                this.reportAlert('페이지 로딩 시간 초과', { loadTime });
            }
        }

        // Core Web Vitals 측정
        this.measureWebVitals();
    }

    /**
     * Core Web Vitals 측정 (LCP, FID, CLS)
     */
    measureWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                this.recordMetric('LCP', lastEntry.startTime);
                
                if (lastEntry.startTime > 2500) {
                    this.reportAlert('LCP 성능 이슈', { lcp: lastEntry.startTime });
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.recordMetric('FID', entry.processingStart - entry.startTime);
                    
                    if ((entry.processingStart - entry.startTime) > 100) {
                        this.reportAlert('FID 성능 이슈', { fid: entry.processingStart - entry.startTime });
                    }
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
        }
    }

    /**
     * Performance Observer 설정
     */
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            // Resource timing 관찰
            const resourceObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    if (entry.duration > 1000) {
                        this.reportAlert('리소스 로딩 지연', {
                            name: entry.name,
                            duration: entry.duration,
                            type: entry.initiatorType
                        });
                    }
                });
            });
            resourceObserver.observe({ entryTypes: ['resource'] });

            // Navigation timing 관찰
            const navigationObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.recordMetric('Navigation', {
                        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                        domComplete: entry.domComplete - entry.domLoading,
                        loadComplete: entry.loadEventEnd - entry.loadEventStart
                    });
                });
            });
            navigationObserver.observe({ entryTypes: ['navigation'] });
        }
    }

    /**
     * API 호출 성능 측정
     */
    measureAPICall(endpoint, startTime, endTime, success = true) {
        const duration = endTime - startTime;
        
        if (!this.apiMetrics.has(endpoint)) {
            this.apiMetrics.set(endpoint, {
                totalCalls: 0,
                totalDuration: 0,
                errorCount: 0,
                avgDuration: 0
            });
        }

        const metric = this.apiMetrics.get(endpoint);
        metric.totalCalls++;
        metric.totalDuration += duration;
        metric.avgDuration = metric.totalDuration / metric.totalCalls;
        
        if (!success) {
            metric.errorCount++;
        }

        // 느린 API 호출 알림
        if (duration > 5000) {
            this.reportAlert('API 응답 지연', {
                endpoint,
                duration,
                success
            });
        }

        this.recordMetric('API_Call', {
            endpoint,
            duration,
            success,
            timestamp: Date.now()
        });
    }

    /**
     * 사용자 상호작용 추적
     */
    trackUserInteractions() {
        // 클릭 이벤트 추적
        document.addEventListener('click', (event) => {
            this.userMetrics.interactionCount++;
            
            this.recordMetric('User_Interaction', {
                type: 'click',
                target: event.target.tagName,
                className: event.target.className,
                timestamp: Date.now()
            });
        });

        // 폼 제출 추적
        document.addEventListener('submit', (event) => {
            this.recordMetric('Form_Submit', {
                formId: event.target.id,
                timestamp: Date.now()
            });
        });

        // 에러 발생 추적
        window.addEventListener('error', (event) => {
            this.userMetrics.errorCount++;
            
            this.recordMetric('Client_Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: Date.now()
            });
        });
    }

    /**
     * 메트릭 기록
     */
    recordMetric(type, data) {
        this.metrics.push({
            type,
            data,
            timestamp: Date.now()
        });

        // 메트릭 개수 제한 (메모리 사용량 관리)
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-500);
        }
    }

    /**
     * 알림 보고
     */
    reportAlert(message, data) {
        console.warn('🚨 Performance Alert:', message, data);
        
        // 실제 환경에서는 모니터링 서비스로 전송
        this.sendToMonitoringService({
            type: 'alert',
            message,
            data,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }

    /**
     * 정기적인 메트릭 리포팅
     */
    startPeriodicReporting() {
        setInterval(() => {
            this.generateReport();
        }, 60000); // 1분마다 리포트 생성

        // 페이지 언로드 시 최종 리포트
        window.addEventListener('beforeunload', () => {
            this.generateFinalReport();
        });
    }

    /**
     * 성능 리포트 생성
     */
    generateReport() {
        const report = {
            timestamp: Date.now(),
            session: {
                duration: Date.now() - this.userMetrics.sessionStart,
                pageLoadTime: this.userMetrics.pageLoadTime,
                interactionCount: this.userMetrics.interactionCount,
                errorCount: this.userMetrics.errorCount
            },
            api: Object.fromEntries(this.apiMetrics),
            memory: this.getMemoryUsage(),
            connection: this.getConnectionInfo()
        };

        this.sendToMonitoringService(report);
        return report;
    }

    /**
     * 최종 리포트 생성 (세션 종료 시)
     */
    generateFinalReport() {
        const finalReport = this.generateReport();
        finalReport.type = 'session_end';
        
        // beacon API를 사용하여 안정적으로 전송
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/metrics', JSON.stringify(finalReport));
        }
    }

    /**
     * 메모리 사용량 정보
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * 연결 정보
     */
    getConnectionInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }
        return null;
    }

    /**
     * 모니터링 서비스로 전송
     */
    sendToMonitoringService(data) {
        // 실제 환경에서는 외부 모니터링 서비스 (Prometheus, Grafana, New Relic 등)로 전송
        try {
            fetch('/api/metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).catch(error => {
                console.warn('Failed to send metrics:', error);
            });
        } catch (error) {
            console.warn('Metrics sending error:', error);
        }
    }

    /**
     * 성능 대시보드 데이터 반환
     */
    getDashboardData() {
        return {
            currentSession: this.userMetrics,
            apiMetrics: Object.fromEntries(this.apiMetrics),
            recentMetrics: this.metrics.slice(-50),
            performance: {
                memory: this.getMemoryUsage(),
                connection: this.getConnectionInfo()
            }
        };
    }
}

// 전역 성능 모니터 인스턴스 생성
const performanceMonitor = new PerformanceMonitor();

// === 에러 처리 및 로깅 시스템 ===

/**
 * 에러 타입 정의
 */
const ErrorTypes = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 중앙화된 에러 핸들러
 */
class ErrorHandler {
    static handleError(error, context = {}) {
        const errorInfo = {
            type: this.categorizeError(error),
            message: error.message || '알 수 없는 오류가 발생했습니다',
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // 에러 로깅
        this.logError(errorInfo);

        // 사용자에게 적절한 메시지 표시
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        if (envManager) {
            envManager.showStatus(userMessage, 'error');
        }

        return errorInfo;
    }

    static categorizeError(error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return ErrorTypes.NETWORK_ERROR;
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
            return ErrorTypes.FILE_NOT_FOUND;
        }
        if (error.message.includes('validation') || error.message.includes('invalid')) {
            return ErrorTypes.VALIDATION_ERROR;
        }
        if (error.message.includes('permission') || error.message.includes('forbidden')) {
            return ErrorTypes.PERMISSION_ERROR;
        }
        return ErrorTypes.UNKNOWN_ERROR;
    }

    static getUserFriendlyMessage(errorInfo) {
        const baseMessage = '❌ ';
        
        switch (errorInfo.type) {
            case ErrorTypes.NETWORK_ERROR:
                return baseMessage + '네트워크 연결을 확인해주세요. 잠시 후 다시 시도해주세요.';
            case ErrorTypes.FILE_NOT_FOUND:
                return baseMessage + '요청한 파일을 찾을 수 없습니다. 파일이 존재하는지 확인해주세요.';
            case ErrorTypes.VALIDATION_ERROR:
                return baseMessage + '입력 정보가 올바르지 않습니다. 다시 확인해주세요.';
            case ErrorTypes.PERMISSION_ERROR:
                return baseMessage + '접근 권한이 없습니다. 관리자에게 문의해주세요.';
            default:
                return baseMessage + errorInfo.message;
        }
    }

    static logError(errorInfo) {
        // 개발 환경에서는 콘솔에 상세 로그
        if (process.env.NODE_ENV === 'development') {
            console.group('🚨 Error Details');
            console.error('Type:', errorInfo.type);
            console.error('Message:', errorInfo.message);
            console.error('Context:', errorInfo.context);
            console.error('Timestamp:', errorInfo.timestamp);
            console.groupEnd();
        }

        // 프로덕션 환경에서는 외부 로깅 서비스로 전송
        // 예: Sentry, LogRocket, 또는 자체 로깅 API
        try {
            this.sendToLoggingService(errorInfo);
        } catch (loggingError) {
            console.warn('로깅 서비스 전송 실패:', loggingError);
        }
    }

    static sendToLoggingService(errorInfo) {
        // 실제 로깅 서비스 연동 시 구현
        // 예시: Sentry, Winston, 또는 외부 API
        
        // 로컬 스토리지에 에러 로그 저장 (임시 방편)
        try {
            const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
            errorLogs.push(errorInfo);
            
            // 최대 100개까지만 보관
            if (errorLogs.length > 100) {
                errorLogs.splice(0, errorLogs.length - 100);
            }
            
            localStorage.setItem('error_logs', JSON.stringify(errorLogs));
        } catch (e) {
            console.warn('로컬 에러 로그 저장 실패:', e);
        }
    }
}

/**
 * 전역 에러 핸들러 설정
 */
window.addEventListener('error', (event) => {
    ErrorHandler.handleError(event.error, {
        source: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handleError(event.reason, {
        source: 'unhandledrejection',
        promise: event.promise
    });
    event.preventDefault(); // 기본 에러 표시 방지
});

/**
 * 안전한 비동기 함수 실행 래퍼
 * @param {Function} asyncFn - 실행할 비동기 함수
 * @param {Object} context - 에러 컨텍스트 정보
 * @returns {Promise} 결과 또는 에러
 */
async function safeExecute(asyncFn, context = {}) {
    try {
        return await asyncFn();
    } catch (error) {
        return ErrorHandler.handleError(error, {
            ...context,
            function: asyncFn.name
        });
    }
}

/**
 * 재시도 로직이 포함된 안전한 실행 함수
 * @param {Function} asyncFn - 실행할 비동기 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} retryDelay - 재시도 간격 (ms)
 * @param {Object} context - 에러 컨텍스트 정보
 */
async function safeExecuteWithRetry(asyncFn, maxRetries = 3, retryDelay = 1000, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await asyncFn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                break;
            }
            
            // 네트워크 에러인 경우에만 재시도
            const errorType = ErrorHandler.categorizeError(error);
            if (errorType !== ErrorTypes.NETWORK_ERROR) {
                break;
            }
            
            console.warn(`시도 ${attempt} 실패, ${retryDelay}ms 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    
    return ErrorHandler.handleError(lastError, {
        ...context,
        attempts: maxRetries,
        function: asyncFn.name
    });
}

/**
 * 파일명을 안전하게 정규화하는 함수
 * @param {string} fileName - 정규화할 파일명
 * @param {number} maxLength - 최대 파일명 길이 (기본값: 255)
 * @returns {string} 정규화된 안전한 파일명
 */
function sanitizeFileName(fileName, maxLength = 255) {
    if (!fileName || typeof fileName !== 'string') {
        return 'untitled';
    }

    // 1. 기본 정리 - 앞뒤 공백 제거
    let cleaned = fileName.trim();

    // 2. 위험한 문자 제거/대체
    // Windows/Linux/macOS에서 금지된 문자들
    cleaned = cleaned
        .replace(/[<>:"/\\|?*]/g, '_')  // Windows 금지 문자
        .replace(/[\x00-\x1f\x80-\x9f]/g, '_')  // 제어 문자
        .replace(/^\.+/, '')  // 시작 점 제거 (숨김 파일 방지)
        .replace(/\.+$/, '')  // 끝 점 제거
        .replace(/\s+/g, '_')  // 공백을 언더스코어로
        .replace(/_+/g, '_')  // 연속 언더스코어 정리
        .replace(/^_+|_+$/g, ''); // 시작/끝 언더스코어 제거

    // 3. Windows 예약어 처리
    const reserved = [
        'CON', 'PRN', 'AUX', 'NUL', 
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const ext = getFileExtension(cleaned);
    const nameWithoutExt = getFileNameWithoutExtension(cleaned);
    
    if (reserved.includes(nameWithoutExt.toUpperCase())) {
        cleaned = `safe_${cleaned}`;
    }

    // 4. 길이 제한 (확장자 고려)
    if (cleaned.length > maxLength) {
        const extension = getFileExtension(cleaned);
        const baseName = getFileNameWithoutExtension(cleaned);
        const maxBaseLength = maxLength - extension.length;
        cleaned = baseName.substring(0, maxBaseLength) + extension;
    }

    // 5. 빈 문자열 처리
    if (!cleaned) {
        cleaned = 'untitled';
    }

    return cleaned;
}

/**
 * 파일 확장자를 추출하는 함수
 * @param {string} fileName - 파일명
 * @returns {string} 확장자 (점 포함)
 */
function getFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
}

/**
 * 확장자를 제외한 파일명을 추출하는 함수
 * @param {string} fileName - 파일명
 * @returns {string} 확장자를 제외한 파일명
 */
function getFileNameWithoutExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}

/**
 * HTTP 헤더용 파일명 정규화 함수 (RFC 5987 준수)
 * @param {string} fileName - 정규화할 파일명
 * @returns {string} HTTP 헤더용 안전한 파일명
 */
function sanitizeFileNameForHeader(fileName) {
    return sanitizeFileName(fileName)
        .replace(/[^\w\s.-]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}

/**
 * 타임스탬프가 포함된 고유 파일명 생성
 * @param {string} baseName - 기본 파일명
 * @param {string} extension - 확장자 (점 포함)
 * @returns {string} 타임스탬프가 포함된 고유 파일명
 */
function generateUniqueFileName(baseName, extension = '') {
    const timestamp = new Date().toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, '')
        .replace('T', '_');
    
    const safeName = sanitizeFileName(baseName);
    return `${safeName}_${timestamp}${extension}`;
}

function showAISettingsModal() {
    const modal = document.getElementById('aiSettingsModal');
    const aiService = envManager.aiService;
    
    document.getElementById('providerAApiKey').value = aiService.apiKeys.provider_a;
    document.getElementById('providerBApiKey').value = aiService.apiKeys.provider_b;
    document.getElementById('providerCApiKey').value = aiService.apiKeys.provider_c;
    document.getElementById('preferredModel').value = aiService.preferredModel;
    
    updateAISettingsStatus();
    modal.style.display = 'block';
}

function updateAISettingsStatus() {
    const aiService = envManager.aiService;
    document.getElementById('providerAStatus').textContent = aiService.apiKeys.provider_a ? '✅ 설정됨' : '❌ 미설정';
    document.getElementById('providerAStatus').className = aiService.apiKeys.provider_a ? 'status-indicator connected' : 'status-indicator disconnected';
    
    document.getElementById('providerBStatus').textContent = aiService.apiKeys.provider_b ? '✅ 설정됨' : '❌ 미설정';
    document.getElementById('providerBStatus').className = aiService.apiKeys.provider_b ? 'status-indicator connected' : 'status-indicator disconnected';
    
    document.getElementById('providerCStatus').textContent = aiService.apiKeys.provider_c ? '✅ 설정됨' : '❌ 미설정';
    document.getElementById('providerCStatus').className = aiService.apiKeys.provider_c ? 'status-indicator connected' : 'status-indicator disconnected';
}

function saveAISettings() {
    const aiService = envManager.aiService;
    const keys = {
        provider_a: document.getElementById('providerAApiKey').value.trim(),
        provider_b: document.getElementById('providerBApiKey').value.trim(),
        provider_c: document.getElementById('providerCApiKey').value.trim()
    };
    
    aiService.saveAPIKeys(keys);
    aiService.preferredModel = document.getElementById('preferredModel').value;
    localStorage.setItem('ai_preferred_model', aiService.preferredModel);
    
    envManager.showStatus('✅ AI 설정이 저장되었습니다', 'success');
    closeModal('aiSettingsModal');
}

function clearAllAPIKeys() {
    if (confirm('모든 AI API 키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        envManager.aiService.clearAPIKeys();
        document.getElementById('providerAApiKey').value = '';
        document.getElementById('providerBApiKey').value = '';
        document.getElementById('providerCApiKey').value = '';
        updateAISettingsStatus();
        envManager.showStatus('✅ 모든 AI API 키가 삭제되었습니다', 'success');
    }
}

function showAIChatModal() {
    const modal = document.getElementById('aiChatModal');
    const aiService = envManager.aiService;
    
    const availableModels = aiService.getAvailableModels();
    if (availableModels.length === 0) {
        envManager.showStatus('❌ AI API 키가 설정되지 않았습니다. 먼저 AI 설정에서 API 키를 입력해주세요.', 'error');
        showAISettingsModal();
        return;
    }
    
    const chatModelSelect = document.getElementById('chatModel');
    chatModelSelect.innerHTML = availableModels.map(model => 
        `<option value="${model.value}" ${model.value === aiService.preferredModel ? 'selected' : ''}>${model.label}</option>`
    ).join('');
    
    renderChatHistory();
    modal.style.display = 'block';
    
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

function renderChatHistory() {
    const chatHistory = document.getElementById('chatHistory');
    const messages = envManager.aiService.chatHistory;
    
    const systemMessage = chatHistory.querySelector('.chat-message.system');
    const otherMessages = messages.map(msg => `
        <div class="chat-message ${msg.role}">
            <strong>${msg.role === 'user' ? '사용자' : 'AI 도우미'}:</strong> ${msg.content.replace(/\n/g, '<br>')}
        </div>
    `).join('');
    
    chatHistory.innerHTML = systemMessage.outerHTML + otherMessages;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const message = input.value.trim();
    
    if (!message) return;
    
    const selectedModel = document.getElementById('chatModel').value;
    const aiService = envManager.aiService;
    
    input.value = '';
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="loading"></div>';
    
    aiService.addToChatHistory('user', message);
    renderChatHistory();
    
    try {
        const contextMessage = `현재 편집 중인 환경변수: ${JSON.stringify(envManager.currentVariables, null, 2)}\n\n사용자 질문: ${message}`;
        const response = await aiService.sendMessage(contextMessage, selectedModel);
        
        aiService.addToChatHistory('assistant', response);
        renderChatHistory();
    } catch (error) {
        const errorMessage = `죄송합니다. AI 응답 중 오류가 발생했습니다: ${error.message}`;
        document.getElementById('chatHistory').innerHTML += `
            <div class="chat-message error">
                <strong>오류:</strong> ${errorMessage}
            </div>
        `;
    } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = '전송';
        document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
    }
}

function clearChatHistory() {
    if (confirm('대화 기록을 모두 삭제하시겠습니까?')) {
        envManager.aiService.clearChatHistory();
        renderChatHistory();
        envManager.showStatus('✅ 대화 기록이 삭제되었습니다', 'success');
    }
}

// === 전역 함수들 (HTML onclick 이벤트용) ===

// 저장 기능
async function saveCurrentFile() {
    if (!envManager.currentFileId) {
        envManager.showStatus('❌ 선택된 파일이 없습니다', 'error');
        return;
    }
    
    const saveBtn = document.querySelector('button[onclick="saveCurrentFile()"]');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '💾 저장 중...';
        saveBtn.disabled = true;
        
        await envManager.saveCurrentFile();
    } catch (error) {
        envManager.showStatus('❌ 저장 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// 백업 기능
async function createBackup() {
    if (!envManager.currentFileId) {
        envManager.showStatus('❌ 선택된 파일이 없습니다', 'error');
        return;
    }
    
    const backupBtn = document.querySelector('button[onclick="createBackup()"]');
    const originalText = backupBtn.innerHTML;
    
    try {
        backupBtn.innerHTML = '📋 백업 중...';
        backupBtn.disabled = true;
        
        await envManager.createBackup();
    } catch (error) {
        envManager.showStatus('❌ 백업 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        backupBtn.innerHTML = originalText;
        backupBtn.disabled = false;
    }
}

// 다운로드 기능
async function downloadCurrentFile() {
    if (!envManager.currentFileId) {
        envManager.showStatus('❌ 선택된 파일이 없습니다', 'error');
        return;
    }
    
    const downloadBtn = document.querySelector('button[onclick="downloadCurrentFile()"]');
    const originalText = downloadBtn.innerHTML;
    
    try {
        downloadBtn.innerHTML = '📥 다운로드 중...';
        downloadBtn.disabled = true;
        
        const file = envManager.envFiles.find(f => f.id === envManager.currentFileId);
        if (!file) {
            throw new Error('파일 정보를 찾을 수 없습니다');
        }
        
        const response = await fetch(`/api/env-files/${envManager.currentFileId}/download`);
        if (!response.ok) {
            throw new Error(`다운로드 실패: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 안전한 파일명 생성
        const safeFileName = generateUniqueFileName(file.name, '.env');
        a.download = safeFileName;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        envManager.showStatus('✅ 파일이 다운로드되었습니다', 'success');
    } catch (error) {
        envManager.showStatus(`❌ 다운로드 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

// 전체 다운로드 기능
async function downloadAllStates() {
    const downloadBtn = document.querySelector('button[onclick="downloadAllStates()"]');
    const originalText = downloadBtn.innerHTML;
    
    try {
        downloadBtn.innerHTML = '📦 생성 중...';
        downloadBtn.disabled = true;
        
        await envManager.downloadAllStates();
    } catch (error) {
        envManager.showStatus('❌ 전체 다운로드 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

// 제거 기능
async function removeCurrentFile() {
    if (!envManager.currentFileId) {
        envManager.showStatus('❌ 선택된 파일이 없습니다', 'error');
        return;
    }
    
    const removeBtn = document.querySelector('button[onclick="removeCurrentFile()"]');
    const originalText = removeBtn.innerHTML;
    
    try {
        removeBtn.innerHTML = '🗑️ 제거 중...';
        removeBtn.disabled = true;
        
        await envManager.removeCurrentFile();
    } catch (error) {
        envManager.showStatus('❌ 제거 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        removeBtn.innerHTML = originalText;
        removeBtn.disabled = false;
    }
}

// AI 채팅 모달 표시
function showAIChatModal() {
    const modal = document.getElementById('aiChatModal');
    modal.style.display = 'block';
    
    // 모델 선택 옵션 업데이트
    const modelSelect = document.getElementById('chatModel');
    const availableModels = envManager.aiService.getAvailableModels();
    
    modelSelect.innerHTML = '';
    if (availableModels.length === 0) {
        modelSelect.innerHTML = '<option value="">API 키를 먼저 설정하세요</option>';
        document.getElementById('sendButton').disabled = true;
    } else {
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            if (model.value === envManager.aiService.preferredModel) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
        document.getElementById('sendButton').disabled = false;
    }
    
    renderChatHistory();
}

// 모든 API 키 삭제
function clearAllAPIKeys() {
    if (confirm('모든 AI API 키를 삭제하시겠습니까?')) {
        envManager.aiService.clearAPIKeys();
        updateAISettingsStatus();
        envManager.showStatus('✅ 모든 API 키가 삭제되었습니다', 'success');
    }
}