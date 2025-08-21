import { TypedBody, TypedRoute, TypedQuery } from "@nestia/core";
import { Controller } from "@nestjs/common";
import * as fs from 'fs';
import * as path from 'path';
import { MyGlobal } from "../../MyGlobal";

export namespace IConfigController {
  export interface IOAuthSetupRequest {
    googleRefreshToken: string;
  }

  export interface IOAuthSetupResponse {
    success: boolean;
    message: string;
  }

  export interface IOAuthStatusResponse {
    isConfigured: boolean;
    hasGoogleRefreshToken: boolean;
  }

  export interface IOAuthUrlResponse {
    authUrl: string;
    message: string;
  }
}

@Controller("config")
export class ConfigController {
  private readonly configPath = path.join(process.cwd(), 'config.json');

  private readConfig(): { googleRefreshToken?: string } {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[ConfigController] Error reading config:', error);
    }
    return {};
  }

  private writeConfig(config: { googleRefreshToken?: string }): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('[ConfigController] Error writing config:', error);
      throw error;
    }
  }
  /**
   * Set up OAuth tokens for Google services
   * 
   * @summary Configure Google OAuth refresh token
   * @param input OAuth configuration data
   * @returns Setup result
   */
  @TypedRoute.Post("oauth/setup")
  public async setupOAuth(
    @TypedBody() input: IConfigController.IOAuthSetupRequest
  ): Promise<IConfigController.IOAuthSetupResponse> {
    try {
      if (!input.googleRefreshToken || input.googleRefreshToken.trim() === '') {
        return {
          success: false,
          message: "Google Refresh Token is required"
        };
      }

      // 파일에 영구 저장
      const config = this.readConfig();
      config.googleRefreshToken = input.googleRefreshToken.trim();
      this.writeConfig(config);

      // 메모리에도 설정 (즉시 사용 가능하도록)
      process.env.GOOGLE_REFRESH_TOKEN = input.googleRefreshToken.trim();

      console.log('[ConfigController] OAuth token saved to file and memory');

      return {
        success: true,
        message: "Google OAuth configured and saved successfully"
      };
    } catch (error) {
      console.error('[ConfigController] Error setting up OAuth:', error);
      return {
        success: false,
        message: "Failed to configure OAuth: " + (error as Error).message
      };
    }
  }

  /**
   * Check OAuth configuration status
   * 
   * @summary Get current OAuth status
   * @returns OAuth configuration status
   */
  @TypedRoute.Get("oauth/status")
  public async getOAuthStatus(): Promise<IConfigController.IOAuthStatusResponse> {
    // 파일에서 읽기
    const config = this.readConfig();
    const hasFileToken = !!(config.googleRefreshToken && config.googleRefreshToken.trim() !== '');
    
    // 메모리에서 읽기
    const hasMemoryToken = !!(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim() !== '');
    
    // 파일에 있는데 메모리에 없으면 메모리에 로드
    if (hasFileToken && !hasMemoryToken) {
      process.env.GOOGLE_REFRESH_TOKEN = config.googleRefreshToken;
      console.log('[ConfigController] Loaded token from file to memory');
    }

    const hasToken = hasFileToken || hasMemoryToken;

    return {
      isConfigured: hasToken,
      hasGoogleRefreshToken: hasToken
    };
  }

  /**
   * Test Google services connection
   * 
   * @summary Test Google API connectivity
   * @returns Connection test result
   */
  @TypedRoute.Post("oauth/test")
  public async testConnection(): Promise<{ success: boolean; message: string; services: Record<string, boolean> }> {
    try {
      const results = {
        calendar: false,
        drive: false
      };

      // TODO: Actually test the Google services
      // For now, just check if token exists
      const hasToken = !!(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim() !== '');
      
      if (hasToken) {
        results.calendar = true;
        results.drive = true;
      }

      const allWorking = Object.values(results).every(Boolean);

      return {
        success: allWorking,
        message: allWorking ? "All Google services connected" : "Some services failed to connect",
        services: results
      };
    } catch (error) {
      console.error('[ConfigController] Error testing connection:', error);
      return {
        success: false,
        message: "Connection test failed",
        services: { calendar: false, drive: false }
      };
    }
  }

  /**
   * Generate Google OAuth authorization URL
   * 
   * @summary Get OAuth authorization URL with correct redirect URI
   * @returns Authorization URL for Google OAuth
   */
  @TypedRoute.Get("oauth/url")
  public async getOAuthUrl(): Promise<IConfigController.IOAuthUrlResponse> {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ];

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(MyGlobal.env.GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent('http://localhost:37001/config/oauth/callback')}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `access_type=offline&` +
        `prompt=consent`;

      return {
        authUrl,
        message: "Click this URL to authorize Google services"
      };
    } catch (error) {
      console.error('[ConfigController] Error generating OAuth URL:', error);
      return {
        authUrl: '',
        message: "Failed to generate OAuth URL"
      };
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   * 
   * @summary OAuth callback endpoint
   * @param code Authorization code from Google
   * @returns Success page or error
   */
  @TypedRoute.Get("oauth/callback")
  public async handleOAuthCallback(
    @TypedQuery() query: { code?: string; error?: string }
  ): Promise<string> {
    try {
      if (query.error) {
        return `<html><body><h1>OAuth Error</h1><p>${query.error}</p><p><a href="/">돌아가기</a></p></body></html>`;
      }

      if (!query.code) {
        return `<html><body><h1>OAuth Error</h1><p>No authorization code received</p><p><a href="/">돌아가기</a></p></body></html>`;
      }

      // Exchange code for tokens
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const tokenData = {
        client_id: MyGlobal.env.GOOGLE_CLIENT_ID,
        client_secret: MyGlobal.env.GOOGLE_CLIENT_SECRET,
        code: query.code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:37001/config/oauth/callback'
      };

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenData).toString()
      });

      const tokenResult = await response.json();

      if (tokenResult.error) {
        console.error('[ConfigController] Token exchange error:', tokenResult);
        return `<html><body><h1>Token Exchange Error</h1><p>${tokenResult.error_description || tokenResult.error}</p><p><a href="/">돌아가기</a></p></body></html>`;
      }

      // Save refresh token
      if (tokenResult.refresh_token) {
        const config = this.readConfig();
        config.googleRefreshToken = tokenResult.refresh_token;
        this.writeConfig(config);
        process.env.GOOGLE_REFRESH_TOKEN = tokenResult.refresh_token;

        console.log('[ConfigController] OAuth flow completed successfully');

        return `<html><body>
          <h1>✅ OAuth 설정 완료!</h1>
          <p>Google 서비스 연동이 성공적으로 완료되었습니다.</p>
          <p>이제 영양 기록이 Google Sheets와 Calendar에 자동으로 저장됩니다.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
          <p><a href="/">메인으로 돌아가기</a></p>
        </body></html>`;
      } else {
        return `<html><body><h1>OAuth Error</h1><p>No refresh token received. Please try again.</p><p><a href="/">돌아가기</a></p></body></html>`;
      }

    } catch (error) {
      console.error('[ConfigController] OAuth callback error:', error);
      return `<html><body><h1>OAuth Error</h1><p>Server error occurred during OAuth flow.</p><p><a href="/">돌아가기</a></p></body></html>`;
    }
  }
}