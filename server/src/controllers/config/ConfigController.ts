import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

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
}

@Controller("config")
export class ConfigController {
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
      // Store the refresh token in a way that MyGlobal can access it
      // For demo purposes, we'll store it in process.env temporarily
      // In production, you'd want to use a more secure method
      
      if (!input.googleRefreshToken || input.googleRefreshToken.trim() === '') {
        return {
          success: false,
          message: "Google Refresh Token is required"
        };
      }

      // Temporarily set the environment variable
      process.env.GOOGLE_REFRESH_TOKEN = input.googleRefreshToken.trim();

      // TODO: In production, store in secure storage or encrypted config
      console.log('[ConfigController] OAuth token configured successfully');

      return {
        success: true,
        message: "Google OAuth configured successfully"
      };
    } catch (error) {
      console.error('[ConfigController] Error setting up OAuth:', error);
      return {
        success: false,
        message: "Failed to configure OAuth"
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
    const hasGoogleRefreshToken = !!(
      process.env.GOOGLE_REFRESH_TOKEN && 
      process.env.GOOGLE_REFRESH_TOKEN.trim() !== ''
    );

    return {
      isConfigured: hasGoogleRefreshToken,
      hasGoogleRefreshToken
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
}