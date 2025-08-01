class AIService {
    constructor() {
        this.apiKeys = this.loadAPIKeys();
        this.chatHistory = this.loadChatHistory();
        this.preferredModel = localStorage.getItem('ai_preferred_model') || 'openai/gpt-4';
    }

    loadAPIKeys() {
        return {
            openai: localStorage.getItem('ai_openai_key') || '',
            openrouter: localStorage.getItem('ai_openrouter_key') || '',
            gemini: localStorage.getItem('ai_gemini_key') || ''
        };
    }

    saveAPIKeys(keys) {
        this.apiKeys = keys;
        if (keys.openai) localStorage.setItem('ai_openai_key', keys.openai);
        if (keys.openrouter) localStorage.setItem('ai_openrouter_key', keys.openrouter);
        if (keys.gemini) localStorage.setItem('ai_gemini_key', keys.gemini);
    }

    clearAPIKeys() {
        localStorage.removeItem('ai_openai_key');
        localStorage.removeItem('ai_openrouter_key');
        localStorage.removeItem('ai_gemini_key');
        localStorage.removeItem('ai_preferred_model');
        this.apiKeys = { openai: '', openrouter: '', gemini: '' };
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
        if (this.apiKeys.openai) {
            models.push({ value: 'openai/gpt-4', label: 'OpenAI GPT-4' });
            models.push({ value: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' });
        }
        if (this.apiKeys.openrouter) {
            models.push({ value: 'openrouter/anthropic/claude-3-haiku', label: 'Claude 3 Haiku' });
            models.push({ value: 'openrouter/anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' });
            models.push({ value: 'openrouter/meta-llama/llama-3-8b-instruct', label: 'Llama 3 8B' });
        }
        if (this.apiKeys.gemini) {
            models.push({ value: 'gemini/gemini-pro', label: 'Gemini Pro' });
            models.push({ value: 'gemini/gemini-flash', label: 'Gemini Flash' });
        }
        return models;
    }

    async sendMessage(message, model = this.preferredModel) {
        const [provider, modelName] = model.split('/', 2);
        
        try {
            switch (provider) {
                case 'openai':
                    return await this.sendOpenAIMessage(message, modelName);
                case 'openrouter':
                    return await this.sendOpenRouterMessage(message, modelName);
                case 'gemini':
                    return await this.sendGeminiMessage(message, modelName);
                default:
                    throw new Error('지원되지 않는 AI 모델입니다.');
            }
        } catch (error) {
            throw new Error(`AI API 오류: ${error.message}`);
        }
    }

    async sendOpenAIMessage(message, model) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.openai}`
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
            throw new Error(`OpenAI API 오류: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async sendOpenRouterMessage(message, model) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKeys.openrouter}`,
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
            throw new Error(`OpenRouter API 오류: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async sendGeminiMessage(message, model) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKeys.gemini}`, {
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
            throw new Error(`Gemini API 오류: ${response.status}`);
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

        try {
            const response = await fetch(`/api/env-files/${this.currentFileId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    variables: this.currentVariables
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showStatus('✅ 파일이 성공적으로 저장되었습니다!', 'success');
            } else {
                this.showStatus('❌ 저장 실패: ' + result.error, 'error');
            }
        } catch (error) {
            this.showStatus('❌ 저장 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }

    async createBackup() {
        if (!this.currentFileId) return;

        try {
            const response = await fetch(`/api/env-files/${this.currentFileId}/backup`, {
                method: 'POST'
            });

            const result = await response.json();
            if (result.success) {
                this.showStatus(`✅ 백업이 생성되었습니다: ${result.backupPath}`, 'success');
            } else {
                this.showStatus('❌ 백업 실패: ' + result.error, 'error');
            }
        } catch (error) {
            this.showStatus('❌ 백업 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }

    async downloadAllStates() {
        if (!this.currentFileId) return;

        try {
            const file = this.envFiles.find(f => f.id === this.currentFileId);
            const fileName = file.name.replace('.env', '');
            
            const zip = new JSZip();
            
            zip.file(`${fileName}.env`, this.generateEnvContent(this.currentVariables));
            
            const productionVars = Object.fromEntries(
                Object.entries(this.currentVariables).filter(([key, data]) => 
                    !key.includes('DEV') && !key.includes('TEST') && !key.includes('LOCAL')
                )
            );
            zip.file(`${fileName}.production.env`, this.generateEnvContent(productionVars));
            
            const developmentVars = Object.fromEntries(
                Object.entries(this.currentVariables).map(([key, data]) => [
                    key, { ...data, value: key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY') ? 'dev_placeholder' : data.value }
                ])
            );
            zip.file(`${fileName}.development.env`, this.generateEnvContent(developmentVars));
            
            const templateVars = Object.fromEntries(
                Object.entries(this.currentVariables).map(([key, data]) => [
                    key, { ...data, value: `YOUR_${key}_HERE` }
                ])
            );
            zip.file(`${fileName}.template.env`, this.generateEnvContent(templateVars));

            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}_all_states.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showStatus('✅ 모든 상태의 환경변수 파일이 다운로드되었습니다', 'success');
        } catch (error) {
            this.showStatus('❌ 다운로드 중 오류가 발생했습니다: ' + error.message, 'error');
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

const envManager = new EnvManager();

function showAISettingsModal() {
    const modal = document.getElementById('aiSettingsModal');
    const aiService = envManager.aiService;
    
    document.getElementById('openaiApiKey').value = aiService.apiKeys.openai;
    document.getElementById('openrouterApiKey').value = aiService.apiKeys.openrouter;
    document.getElementById('geminiApiKey').value = aiService.apiKeys.gemini;
    document.getElementById('preferredModel').value = aiService.preferredModel;
    
    updateAISettingsStatus();
    modal.style.display = 'block';
}

function updateAISettingsStatus() {
    const aiService = envManager.aiService;
    document.getElementById('openaiStatus').textContent = aiService.apiKeys.openai ? '✅ 설정됨' : '❌ 미설정';
    document.getElementById('openaiStatus').className = aiService.apiKeys.openai ? 'status-indicator connected' : 'status-indicator disconnected';
    
    document.getElementById('openrouterStatus').textContent = aiService.apiKeys.openrouter ? '✅ 설정됨' : '❌ 미설정';
    document.getElementById('openrouterStatus').className = aiService.apiKeys.openrouter ? 'status-indicator connected' : 'status-indicator disconnected';
    
    document.getElementById('geminiStatus').textContent = aiService.apiKeys.gemini ? '✅ 설정됨' : '❌ 미설정';
    document.getElementById('geminiStatus').className = aiService.apiKeys.gemini ? 'status-indicator connected' : 'status-indicator disconnected';
}

function saveAISettings() {
    const aiService = envManager.aiService;
    const keys = {
        openai: document.getElementById('openaiApiKey').value.trim(),
        openrouter: document.getElementById('openrouterApiKey').value.trim(),
        gemini: document.getElementById('geminiApiKey').value.trim()
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
        document.getElementById('openaiApiKey').value = '';
        document.getElementById('openrouterApiKey').value = '';
        document.getElementById('geminiApiKey').value = '';
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

async function downloadCurrentFile() {
    if (!envManager.currentFileId) return;

    try {
        const response = await fetch(`/api/env-files/${envManager.currentFileId}/download`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = envManager.envFiles.find(f => f.id === envManager.currentFileId).name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        envManager.showStatus('❌ 다운로드 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

function downloadAllStates() {
    envManager.downloadAllStates();
}