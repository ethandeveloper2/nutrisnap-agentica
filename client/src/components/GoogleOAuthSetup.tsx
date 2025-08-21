import { useState } from 'react';

interface GoogleOAuthSetupProps {
  onTokenReceived: (token: string) => void;
  isConnected: boolean;
}

export function GoogleOAuthSetup({ onTokenReceived, isConnected }: GoogleOAuthSetupProps) {
  const [refreshToken, setRefreshToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 필요한 Google API 스코프들
  const REQUIRED_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' ');

  // OAuth 2.0 Playground URL with pre-configured settings
  const getOAuthPlaygroundUrl = () => {
    const baseUrl = 'https://developers.google.com/oauthplayground/';
    const params = new URLSearchParams({
      'scope': REQUIRED_SCOPES,
      'access_type': 'offline',
      'include_granted_scopes': 'true'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleOpenOAuthPlayground = () => {
    const oauthUrl = getOAuthPlaygroundUrl();
    window.open(oauthUrl, '_blank', 'width=800,height=600');
  };

  const handleTokenSubmit = async () => {
    if (!refreshToken.trim()) return;
    
    setIsLoading(true);
    try {
      // Send token to server
      const response = await fetch('http://localhost:37001/config/oauth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleRefreshToken: refreshToken.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        onTokenReceived(refreshToken.trim());
        console.log('OAuth setup successful:', result.message);
      } else {
        console.error('OAuth setup failed:', result.message);
        alert('설정 실패: ' + result.message);
      }
    } catch (error) {
      console.error('Error setting up OAuth:', error);
      alert('서버 연결 실패. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await fetch('http://localhost:37001/config/oauth/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`연결 테스트 성공!\n캘린더: ${result.services.calendar ? '✓' : '✗'}\n드라이브: ${result.services.drive ? '✓' : '✗'}`);
      } else {
        alert('연결 테스트 실패: ' + result.message);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('연결 테스트 실패. 서버가 실행 중인지 확인해주세요.');
    }
  };

  if (isConnected) {
    return (
      <div className="p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-green-800">Google 서비스 연결됨</h3>
        </div>
        <p className="text-green-700 text-sm mb-4">
          캘린더, 드라이브, 시트 API 사용이 가능합니다.
        </p>
        <button
          onClick={handleTestConnection}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          연결 테스트
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Google 서비스 연동 설정</h3>
      
      <div className="space-y-4">
        {/* Step 1: OAuth Playground */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-medium text-gray-900 mb-2">1단계: Google 권한 승인</h4>
          <p className="text-sm text-gray-600 mb-3">
            OAuth 2.0 Playground에서 캘린더, 드라이브 권한을 승인하고 Refresh Token을 발급받으세요.
          </p>
          <button
            onClick={handleOpenOAuthPlayground}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>OAuth Playground 열기</span>
          </button>
        </div>

        {/* Step 2: Token Input */}
        <div className="border-l-4 border-green-500 pl-4">
          <h4 className="font-medium text-gray-900 mb-2">2단계: Refresh Token 입력</h4>
          <p className="text-sm text-gray-600 mb-3">
            발급받은 Refresh Token을 아래에 붙여넣으세요.
          </p>
          
          <div className="space-y-3">
            <textarea
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="1//04_refresh_token_here..."
              className="w-full p-3 border border-gray-300 rounded-md text-sm font-mono resize-none"
              rows={3}
            />
            
            <button
              onClick={handleTokenSubmit}
              disabled={!refreshToken.trim() || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '설정 중...' : '연동 완료'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">📋 상세 가이드</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>OAuth Playground 버튼을 클릭하여 새 탭을 엽니다</li>
            <li>우측 설정에서 "Use your own OAuth credentials" 체크</li>
            <li>Client ID와 Client Secret을 입력합니다</li>
            <li>"Authorize APIs" 버튼을 클릭하고 구글 로그인</li>
            <li>"Exchange authorization code for tokens" 클릭</li>
            <li>생성된 Refresh Token을 복사하여 위 입력창에 붙여넣기</li>
          </ol>
        </div>
      </div>
    </div>
  );
}