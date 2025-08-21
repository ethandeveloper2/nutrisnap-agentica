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
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ];

  // OAuth 2.0 Playground URL - 직접 scope를 선택할 수 있도록 안내
  const getOAuthPlaygroundUrl = () => {
    return 'https://developers.google.com/oauthplayground/';
  };

  const handleOpenOAuthPlayground = async () => {
    try {
      // Get OAuth URL from our server
      const response = await fetch('http://localhost:37001/config/oauth/url');
      const result = await response.json();
      
      if (result.authUrl) {
        window.open(result.authUrl, 'oauth', 'width=800,height=600');
      } else {
        alert('OAuth URL 생성 실패: ' + result.message);
      }
    } catch (error) {
      console.error('Error getting OAuth URL:', error);
      alert('OAuth URL 요청 실패. 서버가 실행 중인지 확인해주세요.');
    }
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
        {/* Step 1: Direct OAuth */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-medium text-gray-900 mb-2">Google 권한 승인</h4>
          <p className="text-sm text-gray-600 mb-3">
            Google 계정으로 로그인하고 다음 권한들을 승인해주세요:
          </p>
          
          {/* Required Scopes Display */}
          <div className="bg-blue-50 p-3 rounded-md mb-3">
            <h5 className="text-sm font-medium text-blue-900 mb-2">승인할 권한들:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              {REQUIRED_SCOPES.map((scope, index) => {
                const scopeInfo = {
                  'https://www.googleapis.com/auth/calendar': '📅 Google Calendar - 식사 이벤트 생성',
                  'https://www.googleapis.com/auth/drive.file': '📁 Google Drive - 파일 생성/관리',
                  'https://www.googleapis.com/auth/spreadsheets': '📊 Google Sheets - 영양 데이터 기록'
                };
                return (
                  <li key={index} className="bg-white p-2 rounded border">
                    <div className="text-xs text-gray-800 font-medium">{scopeInfo[scope as keyof typeof scopeInfo]}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          
          <button
            onClick={handleOpenOAuthPlayground}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Google 계정으로 로그인 및 승인</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">📋 사용 방법</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li><strong>버튼 클릭:</strong> 위의 "Google 계정으로 로그인 및 승인" 버튼을 클릭합니다</li>
            <li><strong>Google 로그인:</strong> 새 창에서 Google 계정으로 로그인합니다</li>
            <li><strong>권한 승인:</strong> NutriSnap이 요청하는 권한들을 승인합니다</li>
            <li><strong>자동 완료:</strong> 승인이 완료되면 자동으로 설정이 저장됩니다</li>
          </ol>
          
          <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
            <strong>✅ 간편함:</strong> 복잡한 토큰 복사/붙여넣기 없이 원클릭으로 설정이 완료됩니다!
          </div>
        </div>
      </div>
    </div>
  );
}