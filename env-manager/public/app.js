class EnvManager {
    constructor() {
        this.currentFileId = null;
        this.currentVariables = {};
        this.envFiles = [];
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

    async downloadCurrentFile() {
        if (!this.currentFileId) return;

        try {
            const response = await fetch(`/api/env-files/${this.currentFileId}/download`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.envFiles.find(f => f.id === this.currentFileId).name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            this.showStatus('❌ 다운로드 중 오류가 발생했습니다: ' + error.message, 'error');
        }
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