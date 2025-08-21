import { Controller } from "@nestjs/common";
import typia from "typia";
import * as fs from 'fs';
import * as path from 'path';

import { NutritionService, IParsedMeal, IFoodItem } from "./NutritionService";
import { GoogleIntegrationService } from "./GoogleIntegrationService";
import { MyGlobal } from "../../MyGlobal";

// Agentica에서 사용할 도구 클래스
export class NutritionController {
  private nutritionService = new NutritionService();
  private googleService = new GoogleIntegrationService();

  /**
   * Google Refresh Token을 가져옵니다.
   * 파일 저장소에서 토큰을 우선으로 읽고, 메모리에도 로드합니다.
   */
  private getGoogleRefreshToken(): string | null {
    try {
      // 1. 파일에서 토큰 읽기
      const configPath = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (configData.googleRefreshToken && configData.googleRefreshToken.trim() !== '') {
          // 파일에서 읽은 토큰을 메모리에도 설정
          process.env.GOOGLE_REFRESH_TOKEN = configData.googleRefreshToken.trim();
          return configData.googleRefreshToken.trim();
        }
      }
    } catch (error) {
      console.warn('[NutritionController] Error reading config file:', error);
    }

    // 2. 메모리에서 토큰 확인 (fallback)
    const memoryToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (memoryToken && memoryToken.trim() !== '') {
      return memoryToken.trim();
    }

    // 3. 환경변수에서 토큰 확인 (final fallback)
    const envToken = MyGlobal.env.GOOGLE_REFRESH_TOKEN;
    if (envToken && envToken.trim() !== '') {
      return envToken.trim();
    }

    return null;
  }

  /**
   * 자연어 텍스트에서 음식 정보를 파싱하고 영양소를 계산합니다.
   * 
   * @param params 파싱 요청 매개변수
   * @returns 파싱된 음식 정보와 영양소 데이터
   * 
   * @example
   * // 입력: { input: "아침에 토스트 2장이랑 계란후라이 1개 먹었어" }
   * // 출력: { items: [토스트 정보, 계란후라이 정보], totalKcal: 350, ... }
   */
  public parseMeal(params: { input: string }): IParsedMeal {
    console.log(`[NutritionController] 음식 파싱 시작: "${params.input}"`);
    
    const parsed = this.nutritionService.parseMealFromText(params.input);
    
    console.log(`[NutritionController] 파싱 완료:`, {
      itemCount: parsed.items.length,
      totalKcal: parsed.totalKcal,
      mealType: parsed.mealType
    });

    return parsed;
  }

  /**
   * 파싱된 음식 데이터의 양을 조정합니다.
   * 
   * @param params 조정 요청 매개변수
   * @returns 조정된 음식 아이템 정보
   * 
   * @example
   * // 입력: { foodName: "밥", newQuantity: 0.5, unit: "공기" }
   */
  public adjustQuantity(params: { foodName: string; newQuantity: number; unit: string }): IFoodItem | null {
    console.log(`[NutritionController] 양 조정: ${params.foodName} ${params.newQuantity}${params.unit}`);
    
    // NutritionService의 createFoodItem 메서드를 사용하도록 수정 필요
    // 현재는 private이므로 public으로 변경하거나 별도 메서드 생성
    
    return null; // TODO: 구현
  }

  /**
   * Google Sheets에 식사 기록을 저장합니다.
   * 
   * @param parsedMeal 파싱된 식사 데이터
   * @returns 저장 성공 여부
   */
  public async saveToGoogleSheets(parsedMeal: IParsedMeal): Promise<{ success: boolean; message: string; spreadsheetUrl?: string }> {
    console.log('[NutritionController] Google Sheets 저장 시작');
    
    try {
      const refreshToken = this.getGoogleRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          message: 'Google Refresh Token이 설정되지 않았습니다. OAuth 설정을 먼저 완료해주세요.'
        };
      }

      const formatted = this.nutritionService.formatMealRecord(parsedMeal);
      const result = await this.googleService.saveToSheets(formatted.sheetRows, refreshToken);
      
      return result;
    } catch (error) {
      console.error('[NutritionController] Sheets 저장 실패:', error);
      return {
        success: false,
        message: 'Google Sheets 저장 중 오류가 발생했습니다: ' + (error as Error).message
      };
    }
  }

  /**
   * Google Calendar에 식사 이벤트를 생성합니다.
   * 
   * @param parsedMeal 파싱된 식사 데이터
   * @returns 이벤트 생성 성공 여부
   */
  public async saveToGoogleCalendar(parsedMeal: IParsedMeal): Promise<{ success: boolean; message: string; eventUrl?: string }> {
    console.log('[NutritionController] Google Calendar 이벤트 생성 시작');
    
    try {
      const refreshToken = this.getGoogleRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          message: 'Google Refresh Token이 설정되지 않았습니다. OAuth 설정을 먼저 완료해주세요.'
        };
      }

      const formatted = this.nutritionService.formatMealRecord(parsedMeal);
      const result = await this.googleService.saveToCalendar(formatted.calendarEvent, refreshToken);
      
      return result;
    } catch (error) {
      console.error('[NutritionController] Calendar 저장 실패:', error);
      return {
        success: false,
        message: 'Google Calendar 저장 중 오류가 발생했습니다: ' + (error as Error).message
      };
    }
  }

  /**
   * 완전한 식사 기록 플로우 (파싱 + Sheets + Calendar)
   * 
   * @param params 기록 요청 매개변수
   * @returns 전체 처리 결과
   */
  public async recordMeal(params: { input: string }): Promise<{
    parsed: IParsedMeal;
    sheetsResult: { success: boolean; message: string; spreadsheetUrl?: string };
    calendarResult: { success: boolean; message: string; eventUrl?: string };
  }> {
    console.log('[NutritionController] 완전한 식사 기록 시작');
    
    // 1. 음식 파싱
    const parsed = this.parseMeal({ input: params.input });
    
    // 2. Google Sheets 저장
    const sheetsResult = await this.saveToGoogleSheets(parsed);
    
    // 3. Google Calendar 이벤트 생성  
    const calendarResult = await this.saveToGoogleCalendar(parsed);
    
    return {
      parsed,
      sheetsResult,
      calendarResult
    };
  }

  /**
   * 영양소 요약 정보를 생성합니다.
   * 
   * @param parsedMeal 파싱된 식사 데이터
   * @returns 요약된 영양 정보
   */
  public getNutritionSummary(parsedMeal: IParsedMeal): string {
    const items = parsedMeal.items;
    const totalKcal = parsedMeal.totalKcal;
    const totalCarb = items.reduce((sum, item) => sum + (item.carb_g || 0), 0);
    const totalProtein = items.reduce((sum, item) => sum + (item.protein_g || 0), 0);
    const totalFat = items.reduce((sum, item) => sum + (item.fat_g || 0), 0);

    return `📊 영양 정보 요약
🔥 총 칼로리: ${totalKcal}kcal
🍞 탄수화물: ${Math.round(totalCarb * 10) / 10}g
🥩 단백질: ${Math.round(totalProtein * 10) / 10}g  
🧈 지방: ${Math.round(totalFat * 10) / 10}g

📝 음식 목록:
${items.map(item => `• ${item.name} ${item.quantity}${item.unit} (${item.kcal}kcal)`).join('\n')}

이 정보를 Google 캘린더와 시트에 기록할까요?`;
  }
}