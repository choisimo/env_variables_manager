# PRD: 다운로드 기능 파일명 문제 해결

## 문제 분석

### 발견된 주요 이슈

1. **단일 파일 다운로드 문제**
   - app.js Line 837: `a.download = envManager.envFiles.find(f => f.id === envManager.currentFileId).name;`
   - app.js Line 1176: `a.download = envManager.envFiles.find(f => f.id === envManager.currentFileId)?.name || 'env-file.env';`
   - 중복 구현으로 인한 일관성 부족
   - 파일명이 UUID 기반 ID와 혼동될 수 있음

2. **전체 다운로드 파일명 문제**
   - app.js Line 383: `const fileName = file.name.replace('.env', '');`
   - app.js Line 414: `a.download = `${fileName}_all_states.zip`;`
   - .env 확장자 제거 시 예상치 못한 결과 발생 가능
   - 파일명에 특수문자나 공백이 있을 때 문제 발생

3. **서버 측 다운로드 응답 문제**
   - server.js Line 284: `res.setHeader('Content-Disposition', `attachment; filename="${envFile.name}"`);`
   - 파일명에 특수문자나 공백이 있을 때 브라우저별 처리 차이 발생
   - UTF-8 인코딩 문제 가능성

4. **파일명 안전성 문제**
   - 운영체제별 금지 문자 미처리
   - 파일명 길이 제한 미고려
   - 중복 파일명 처리 부족

## 해결 방안

### 1. 파일명 정규화 함수 구현

#### 1.1 안전한 파일명 생성 함수
```javascript
function sanitizeFileName(fileName) {
    // 1. 기본 정리
    let cleaned = fileName.trim();
    
    // 2. 위험한 문자 제거/대체
    cleaned = cleaned
        .replace(/[<>:"/\\|?*]/g, '_')  // Windows 금지 문자
        .replace(/[\x00-\x1f\x80-\x9f]/g, '_')  // 제어 문자
        .replace(/^\.+/, '')  // 시작 점 제거
        .replace(/\.+$/, '')  // 끝 점 제거
        .replace(/\s+/g, '_')  // 공백을 언더스코어로
        .replace(/_+/g, '_');  // 연속 언더스코어 정리
    
    // 3. 길이 제한 (확장자 포함 255자)
    if (cleaned.length > 250) {
        const ext = path.extname(cleaned);
        const name = path.basename(cleaned, ext);
        cleaned = name.substring(0, 250 - ext.length) + ext;
    }
    
    // 4. 예약어 처리 (Windows)
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = path.basename(cleaned, path.extname(cleaned));
    if (reserved.includes(nameWithoutExt.toUpperCase())) {
        cleaned = `_${cleaned}`;
    }
    
    return cleaned || 'env-file';
}
```

### 2. 단일 파일 다운로드 개선

#### 2.1 현재 문제점
- 중복 함수 정의
- 에러 처리 부족
- 파일명 처리 불일치

#### 2.2 개선 방안
```javascript
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
        const safeFileName = sanitizeFileName(file.name);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        a.download = `${safeFileName}_${timestamp}.env`;
        
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
```

### 3. 전체 다운로드 기능 개선

#### 3.1 현재 문제점
- 파일명 처리 로직 취약
- ZIP 파일 생성 시 중복 파일명 처리 부족
- 진행률 표시 없음

#### 3.2 개선 방안
```javascript
async function downloadAllStates() {
    if (!envManager.currentFileId) {
        envManager.showStatus('❌ 선택된 파일이 없습니다', 'error');
        return;
    }

    const downloadBtn = document.querySelector('button[onclick="downloadAllStates()"]');
    const originalText = downloadBtn.innerHTML;
    
    try {
        downloadBtn.innerHTML = '📦 생성 중...';
        downloadBtn.disabled = true;
        
        const file = envManager.envFiles.find(f => f.id === envManager.currentFileId);
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
        
        // 진행률 업데이트
        downloadBtn.innerHTML = '📦 원본 파일 생성 중...';
        zip.file(`${baseName}.env`, envManager.generateEnvContent(envManager.currentVariables));
        
        downloadBtn.innerHTML = '📦 프로덕션 파일 생성 중...';
        const productionVars = Object.fromEntries(
            Object.entries(envManager.currentVariables).filter(([key, data]) => 
                !key.includes('DEV') && !key.includes('TEST') && !key.includes('LOCAL')
            )
        );
        zip.file(`${baseName}.production.env`, envManager.generateEnvContent(productionVars));
        
        downloadBtn.innerHTML = '📦 개발 파일 생성 중...';
        const developmentVars = Object.fromEntries(
            Object.entries(envManager.currentVariables).map(([key, data]) => [
                key, { ...data, value: key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY') ? 'dev_placeholder' : data.value }
            ])
        );
        zip.file(`${baseName}.development.env`, envManager.generateEnvContent(developmentVars));
        
        downloadBtn.innerHTML = '📦 템플릿 파일 생성 중...';
        const templateVars = Object.fromEntries(
            Object.entries(envManager.currentVariables).map(([key, data]) => [
                key, { ...data, value: `YOUR_${key}_HERE` }
            ])
        );
        zip.file(`${baseName}.template.env`, envManager.generateEnvContent(templateVars));

        downloadBtn.innerHTML = '📦 ZIP 파일 생성 중...';
        const content = await zip.generateAsync({ type: 'blob' });
        
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_all_states_${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        envManager.showStatus('✅ 모든 상태의 환경변수 파일이 다운로드되었습니다', 'success');
    } catch (error) {
        envManager.showStatus(`❌ 전체 다운로드 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}
```

### 4. 서버 측 개선

#### 4.1 Content-Disposition 헤더 개선
```javascript
// server.js의 다운로드 엔드포인트 개선
app.get('/api/env-files/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        const envFile = envManager.envFiles.get(id);
        
        if (!envFile) {
            return res.status(404).json({ success: false, error: 'Environment file not found' });
        }

        const exists = await fs.pathExists(envFile.path);
        if (!exists) {
            return res.status(404).json({ success: false, error: 'File does not exist on disk' });
        }

        const fileContent = await fs.readFile(envFile.path, 'utf8');
        
        // 안전한 파일명 생성 (RFC 5987 준수)
        const safeFileName = sanitizeFileNameForHeader(envFile.name);
        const encodedFileName = encodeURIComponent(envFile.name);
        
        res.setHeader('Content-Disposition', 
            `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(fileContent);
    } catch (error) {
        console.error('Download endpoint error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

function sanitizeFileNameForHeader(fileName) {
    return fileName
        .replace(/[^\w\s.-]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}
```

## 구현 계획

### Phase 1: 핵심 함수 구현 (1일)
1. `sanitizeFileName` 함수 구현
2. `sanitizeFileNameForHeader` 함수 구현
3. 기본 테스트 케이스 작성

### Phase 2: 클라이언트 측 개선 (2일)
1. 중복 다운로드 함수 제거
2. 단일 파일 다운로드 로직 개선
3. 전체 다운로드 로직 개선
4. 진행률 표시 추가

### Phase 3: 서버 측 개선 (1일)
1. 다운로드 엔드포인트 헤더 개선
2. 에러 처리 강화
3. 로깅 추가

### Phase 4: 테스트 및 검증 (1일)
1. 다양한 파일명 케이스 테스트
2. 브라우저 호환성 테스트
3. 파일 크기 및 성능 테스트

## 성공 지표

1. **파일명 정확성**: 모든 경우에 올바른 파일명으로 다운로드
2. **브라우저 호환성**: Chrome, Firefox, Safari, Edge에서 동일한 동작
3. **에러율**: 다운로드 실패율 < 0.5%
4. **사용자 만족도**: 파일명 관련 문의 90% 감소

## 위험 요소 및 대응

1. **브라우저별 파일명 처리 차이**
   - 대응: RFC 5987 표준 준수
   - 대응: 주요 브라우저별 테스트

2. **대용량 파일 처리**
   - 대응: 스트리밍 다운로드 구현
   - 대응: 진행률 표시 추가

3. **특수 문자 처리**
   - 대응: 포괄적인 정규화 함수
   - 대응: 예외 케이스 문서화

## 결론

이 PRD를 통해 다운로드 기능의 파일명 문제를 근본적으로 해결하고, 사용자가 예측 가능하고 안전한 파일명으로 다운로드할 수 있도록 개선합니다.