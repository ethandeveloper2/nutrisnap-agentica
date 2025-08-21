import { google } from 'googleapis';

export interface ISheetRow {
  DateTime: string;
  Meal: string;
  Item: string;
  Qty: number;
  Unit: string;
  Grams: number;
  Kcal: number;
  Carb: number;
  Protein: number;
  Fat: number;
  Sodium: number;
  Note: string;
  Source: string;
}

export interface ICalendarEvent {
  title: string;
  description: string;
  startTime?: Date;
  endTime?: Date;
}

export class GoogleIntegrationService {
  private SPREADSHEET_NAME = 'NutriSnap 영양 기록';
  private SHEET_NAME = 'Nutrition Log';

  /**
   * OAuth 클라이언트 생성
   */
  private createOAuthClient(refreshToken: string) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
      refresh_token: decodeURIComponent(refreshToken)
    });

    return client;
  }

  /**
   * 스프레드시트 찾기 또는 생성
   */
  private async findOrCreateSpreadsheet(auth: any): Promise<string> {
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    try {
      // 기존 스프레드시트 검색
      const searchResponse = await drive.files.list({
        q: `name='${this.SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        console.log('[GoogleIntegration] 기존 스프레드시트 발견:', searchResponse.data.files[0].id);
        return searchResponse.data.files[0].id!;
      }

      // 새 스프레드시트 생성
      console.log('[GoogleIntegration] 새 스프레드시트 생성 중...');
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: this.SPREADSHEET_NAME,
          },
          sheets: [{
            properties: {
              title: this.SHEET_NAME,
            },
          }],
        },
      });

      const spreadsheetId = createResponse.data.spreadsheetId!;

      // 헤더 행 추가
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A1:M1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'DateTime', 'Meal', 'Item', 'Qty', 'Unit', 'Grams', 
            'Kcal', 'Carb(g)', 'Protein(g)', 'Fat(g)', 'Sodium(mg)', 
            'Note', 'Source'
          ]],
        },
      });

      console.log('[GoogleIntegration] 새 스프레드시트 생성 완료:', spreadsheetId);
      return spreadsheetId;

    } catch (error) {
      console.error('[GoogleIntegration] 스프레드시트 생성/검색 실패:', error);
      throw error;
    }
  }

  /**
   * Google Sheets에 영양 데이터 저장
   */
  public async saveToSheets(rows: ISheetRow[], refreshToken: string): Promise<{ success: boolean; message: string; spreadsheetUrl?: string }> {
    try {
      const auth = this.createOAuthClient(refreshToken);
      const sheets = google.sheets({ version: 'v4', auth });

      // 스프레드시트 찾기/생성
      const spreadsheetId = await this.findOrCreateSpreadsheet(auth);

      // 데이터 변환
      const values = rows.map(row => [
        row.DateTime,
        row.Meal,
        row.Item,
        row.Qty,
        row.Unit,
        row.Grams,
        row.Kcal,
        row.Carb,
        row.Protein,
        row.Fat,
        row.Sodium,
        row.Note,
        row.Source
      ]);

      // 시트에 데이터 추가
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.SHEET_NAME}!A:M`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      
      console.log('[GoogleIntegration] Sheets 저장 성공:', {
        spreadsheetId,
        rowsAdded: values.length,
        updatedRange: appendResponse.data.updates?.updatedRange
      });

      return {
        success: true,
        message: `${values.length}개 항목이 Google Sheets에 저장되었습니다.`,
        spreadsheetUrl
      };

    } catch (error) {
      console.error('[GoogleIntegration] Sheets 저장 실패:', error);
      
      let errorMessage = 'Google Sheets 저장 중 오류가 발생했습니다.';
      if ((error as any).code === 401) {
        errorMessage = 'Google 인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if ((error as any).code === 403) {
        errorMessage = 'Google Sheets 권한이 없습니다. 권한을 확인해주세요.';
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Google Calendar에 식사 이벤트 생성
   */
  public async saveToCalendar(event: ICalendarEvent, refreshToken: string): Promise<{ success: boolean; message: string; eventUrl?: string }> {
    try {
      const auth = this.createOAuthClient(refreshToken);
      const calendar = google.calendar({ version: 'v3', auth });

      // 시간 설정 (기본적으로 현재 시간부터 30분)
      const startTime = event.startTime || new Date();
      const endTime = event.endTime || new Date(startTime.getTime() + 30 * 60 * 1000); // 30분 후

      const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Seoul',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Seoul',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 0 }, // 즉시 알림
          ],
        },
      };

      const createResponse = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
      });

      const eventUrl = createResponse.data.htmlLink || undefined;

      console.log('[GoogleIntegration] Calendar 이벤트 생성 성공:', {
        eventId: createResponse.data.id,
        eventUrl
      });

      return {
        success: true,
        message: 'Google Calendar에 식사 이벤트가 생성되었습니다.',
        eventUrl
      };

    } catch (error) {
      console.error('[GoogleIntegration] Calendar 저장 실패:', error);
      
      let errorMessage = 'Google Calendar 저장 중 오류가 발생했습니다.';
      if ((error as any).code === 401) {
        errorMessage = 'Google 인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if ((error as any).code === 403) {
        errorMessage = 'Google Calendar 권한이 없습니다. 권한을 확인해주세요.';
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * 통합 저장 (Sheets + Calendar)
   */
  public async saveToGoogleServices(
    rows: ISheetRow[], 
    event: ICalendarEvent, 
    refreshToken: string
  ): Promise<{
    sheets: { success: boolean; message: string; spreadsheetUrl?: string };
    calendar: { success: boolean; message: string; eventUrl?: string };
  }> {
    console.log('[GoogleIntegration] 통합 저장 시작');

    const [sheetsResult, calendarResult] = await Promise.allSettled([
      this.saveToSheets(rows, refreshToken),
      this.saveToCalendar(event, refreshToken)
    ]);

    return {
      sheets: sheetsResult.status === 'fulfilled' 
        ? sheetsResult.value 
        : { success: false, message: '시트 저장 실패: ' + sheetsResult.reason },
      calendar: calendarResult.status === 'fulfilled'
        ? calendarResult.value
        : { success: false, message: '캘린더 저장 실패: ' + calendarResult.reason }
    };
  }
}