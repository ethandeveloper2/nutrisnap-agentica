export interface IFoodItem {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  kcal: number;
  carb_g?: number;
  protein_g?: number;
  fat_g?: number;
  sodium_mg?: number;
}

export interface IParsedMeal {
  items: IFoodItem[];
  totalKcal: number;
  totalGrams: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  note?: string;
}

export interface INutritionDatabase {
  [foodName: string]: {
    kcalPer100g: number;
    carbPer100g?: number;
    proteinPer100g?: number;
    fatPer100g?: number;
    sodiumPer100g?: number;
  };
}

export class NutritionService {
  // 한국 음식 영양소 데이터베이스 (초기 버전)
  private nutritionDB: INutritionDatabase = {
    // 밥류
    '밥': { kcalPer100g: 130, carbPer100g: 23, proteinPer100g: 2.6, fatPer100g: 0.3 },
    '흰밥': { kcalPer100g: 130, carbPer100g: 23, proteinPer100g: 2.6, fatPer100g: 0.3 },
    '현미밥': { kcalPer100g: 120, carbPer100g: 22, proteinPer100g: 2.8, fatPer100g: 0.8 },
    
    // 국/찌개류
    '김치찌개': { kcalPer100g: 80, carbPer100g: 4, proteinPer100g: 6, fatPer100g: 5, sodiumPer100g: 800 },
    '된장찌개': { kcalPer100g: 60, carbPer100g: 3, proteinPer100g: 4, fatPer100g: 3, sodiumPer100g: 700 },
    '된장국': { kcalPer100g: 30, carbPer100g: 2, proteinPer100g: 2, fatPer100g: 1, sodiumPer100g: 600 },
    '미역국': { kcalPer100g: 20, carbPer100g: 1, proteinPer100g: 1.5, fatPer100g: 0.5, sodiumPer100g: 500 },
    
    // 반찬류
    '김치': { kcalPer100g: 23, carbPer100g: 4, proteinPer100g: 2, fatPer100g: 0.4, sodiumPer100g: 900 },
    '계란후라이': { kcalPer100g: 196, carbPer100g: 0.8, proteinPer100g: 13, fatPer100g: 15 },
    '계란': { kcalPer100g: 155, carbPer100g: 1.1, proteinPer100g: 13, fatPer100g: 11 },
    
    // 면류
    '라면': { kcalPer100g: 380, carbPer100g: 56, proteinPer100g: 9, fatPer100g: 14, sodiumPer100g: 1800 },
    '냉면': { kcalPer100g: 130, carbPer100g: 25, proteinPer100g: 4, fatPer100g: 1 },
    '칼국수': { kcalPer100g: 120, carbPer100g: 24, proteinPer100g: 4, fatPer100g: 1 },
    
    // 빵류
    '식빵': { kcalPer100g: 280, carbPer100g: 50, proteinPer100g: 8, fatPer100g: 4 },
    '토스트': { kcalPer100g: 290, carbPer100g: 48, proteinPer100g: 8, fatPer100g: 6 },
    
    // 육류
    '삼겹살': { kcalPer100g: 518, carbPer100g: 0, proteinPer100g: 17, fatPer100g: 49 },
    '닭가슴살': { kcalPer100g: 165, carbPer100g: 0, proteinPer100g: 31, fatPer100g: 3.6 },
    
    // 기본 분류
    '치킨': { kcalPer100g: 250, carbPer100g: 0, proteinPer100g: 25, fatPer100g: 15 },
    '피자': { kcalPer100g: 266, carbPer100g: 33, proteinPer100g: 11, fatPer100g: 10 },
    '햄버거': { kcalPer100g: 295, carbPer100g: 31, proteinPer100g: 15, fatPer100g: 14 },
    '샐러드': { kcalPer100g: 20, carbPer100g: 4, proteinPer100g: 1, fatPer100g: 0.2 }
  };

  // 한국어 단위 변환 테이블
  private unitConverter: { [key: string]: { default: number; foods?: { [key: string]: number } } } = {
    // 밥류
    '공기': { default: 150, foods: { '밥': 150, '흰밥': 150, '현미밥': 150 } },
    '그릇': { default: 200, foods: { '라면': 300, '냉면': 350, '칼국수': 300 } },
    
    // 국/찌개류 - '그릇'이 이미 정의되어 있으므로 별도로 처리하지 않음
    
    // 개수 단위
    '개': { default: 50, foods: { '계란': 60, '계란후라이': 60 } },
    '장': { default: 30, foods: { '식빵': 30, '토스트': 30 } },
    '조각': { default: 50, foods: { '피자': 150, '치킨': 100 } },
    
    // 기타
    '컵': { default: 200 },
    '숟가락': { default: 15 },
    '큰술': { default: 15 },
    '작은술': { default: 5 }
  };

  /**
   * 자연어 텍스트에서 음식 정보를 파싱
   */
  public parseMealFromText(input: string): IParsedMeal {
    console.log('[NutritionService] Parsing input:', input);
    
    const items: IFoodItem[] = [];
    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined;

    // 식사 시간대 추출
    if (input.includes('아침') || input.includes('조식')) mealType = 'breakfast';
    else if (input.includes('점심') || input.includes('중식')) mealType = 'lunch';
    else if (input.includes('저녁') || input.includes('석식') || input.includes('dinner')) mealType = 'dinner';
    else if (input.includes('간식') || input.includes('snack')) mealType = 'snack';

    // 음식 패턴 매칭 (한국어)
    const foodPatterns = [
      // "밥 한 공기" 패턴
      /(\w+)\s*([0-9]*\.?[0-9]*)\s*([공개그컵숟장조][\w]*)/g,
      // "한 그릇 라면" 패턴
      /([한두세네다섯여덟아홉]*)\s*([공개그컵숟장조][\w]*)\s*(\w+)/g,
      // "김치찌개 1그릇" 패턴
      /(\w+)\s*([0-9]+)\s*([공개그컵숟장조][\w]*)/g
    ];

    for (const pattern of foodPatterns) {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        console.log('[NutritionService] Pattern match:', match);
        
        let foodName = '';
        let quantity = 1;
        let unit = '';

        // 패턴별로 파싱 로직 적용
        if (pattern.source.includes('\\w+.*[0-9]')) {
          // "밥 한 공기" 패턴
          [, foodName, , unit] = match;
          quantity = this.parseKoreanNumber(match[2]) || 1;
        } else if (pattern.source.includes('[한두세네다섯여덟아홉]*')) {
          // "한 그릇 라면" 패턴
          [, , unit, foodName] = match;
          quantity = this.parseKoreanNumber(match[1]) || 1;
        } else {
          // "김치찌개 1그릇" 패턴
          [, foodName, , unit] = match;
          quantity = parseFloat(match[2]) || 1;
        }

        if (foodName && this.nutritionDB[foodName]) {
          const item = this.createFoodItem(foodName, quantity, unit);
          if (item) {
            items.push(item);
          }
        }
      }
    }

    // 간단한 음식명만 있는 경우 처리
    if (items.length === 0) {
      const knownFoods = Object.keys(this.nutritionDB);
      for (const food of knownFoods) {
        if (input.includes(food)) {
          const item = this.createFoodItem(food, 1, '기본');
          if (item) {
            items.push(item);
          }
        }
      }
    }

    const totalKcal = items.reduce((sum, item) => sum + item.kcal, 0);
    const totalGrams = items.reduce((sum, item) => sum + item.grams, 0);

    return {
      items,
      totalKcal: Math.round(totalKcal),
      totalGrams: Math.round(totalGrams),
      mealType,
      note: input
    };
  }

  /**
   * 한국어 숫자를 숫자로 변환
   */
  private parseKoreanNumber(koreanNum: string): number {
    const numberMap: { [key: string]: number } = {
      '한': 1, '하나': 1, '일': 1,
      '두': 2, '둘': 2, '이': 2,
      '세': 3, '셋': 3, '삼': 3,
      '네': 4, '넷': 4, '사': 4,
      '다섯': 5, '오': 5,
      '여섯': 6, '육': 6,
      '일곱': 7, '칠': 7,
      '여덟': 8, '팔': 8,
      '아홉': 9, '구': 9,
      '열': 10, '십': 10,
      '반': 0.5
    };

    return numberMap[koreanNum] || (parseFloat(koreanNum) || 1);
  }

  /**
   * 음식 아이템 생성
   */
  private createFoodItem(foodName: string, quantity: number, unit: string): IFoodItem | null {
    const nutrition = this.nutritionDB[foodName];
    if (!nutrition) return null;

    // 단위를 그램으로 변환
    let grams = this.convertToGrams(foodName, quantity, unit);
    
    // 영양소 계산
    const multiplier = grams / 100; // 100g 기준이므로
    const kcal = nutrition.kcalPer100g * multiplier;
    const carb_g = nutrition.carbPer100g ? nutrition.carbPer100g * multiplier : undefined;
    const protein_g = nutrition.proteinPer100g ? nutrition.proteinPer100g * multiplier : undefined;
    const fat_g = nutrition.fatPer100g ? nutrition.fatPer100g * multiplier : undefined;
    const sodium_mg = nutrition.sodiumPer100g ? nutrition.sodiumPer100g * multiplier : undefined;

    return {
      name: foodName,
      quantity,
      unit,
      grams: Math.round(grams),
      kcal: Math.round(kcal),
      carb_g: carb_g ? Math.round(carb_g * 10) / 10 : undefined,
      protein_g: protein_g ? Math.round(protein_g * 10) / 10 : undefined,
      fat_g: fat_g ? Math.round(fat_g * 10) / 10 : undefined,
      sodium_mg: sodium_mg ? Math.round(sodium_mg) : undefined
    };
  }

  /**
   * 단위를 그램으로 변환
   */
  private convertToGrams(foodName: string, quantity: number, unit: string): number {
    // 이미 그램인 경우
    if (unit === 'g' || unit === '그램') {
      return quantity;
    }

    // 단위 변환표에서 찾기
    const unitInfo = this.unitConverter[unit];
    if (unitInfo) {
      // 특정 음식에 대한 단위가 있으면 사용, 없으면 기본값 사용
      const gramsPerUnit = unitInfo.foods?.[foodName] || unitInfo.default;
      return quantity * gramsPerUnit;
    }

    // 기본값 (중간 정도 크기)
    const defaultGrams: { [key: string]: number } = {
      '기본': 100,
      '조금': 50,
      '많이': 200,
      '큰': 150,
      '작은': 80
    };

    return defaultGrams[unit] || 100;
  }

  /**
   * 식사 기록을 포맷팅 (Google Sheets/Calendar용)
   */
  public formatMealRecord(parsed: IParsedMeal): {
    sheetRows: any[];
    calendarEvent: {
      title: string;
      description: string;
    };
  } {
    const now = new Date();
    const mealTypeKorean: { [key: string]: string } = {
      breakfast: '아침',
      lunch: '점심', 
      dinner: '저녁',
      snack: '간식'
    };

    // Google Sheets 행 데이터
    const sheetRows = parsed.items.map(item => ({
      DateTime: now.toISOString(),
      Meal: mealTypeKorean[parsed.mealType || 'snack'] || '식사',
      Item: item.name,
      Qty: item.quantity,
      Unit: item.unit,
      Grams: item.grams,
      Kcal: item.kcal,
      Carb: item.carb_g || 0,
      Protein: item.protein_g || 0,
      Fat: item.fat_g || 0,
      Sodium: item.sodium_mg || 0,
      Note: parsed.note || '',
      Source: 'NutriSnap v1.0'
    }));

    // 상위 2개 음식명
    const topFoods = parsed.items
      .sort((a, b) => b.kcal - a.kcal)
      .slice(0, 2)
      .map(item => item.name)
      .join(', ');

    // Google Calendar 이벤트
    const calendarEvent = {
      title: `🍽️ [${mealTypeKorean[parsed.mealType || 'snack'] || '식사'}] ${topFoods} (≈ ${parsed.totalKcal} kcal)`,
      description: `영양 정보:\n${parsed.items.map(item => 
        `• ${item.name} ${item.quantity}${item.unit} (${item.grams}g, ${item.kcal}kcal)`
      ).join('\n')}\n\n총 칼로리: ${parsed.totalKcal}kcal\n총 중량: ${parsed.totalGrams}g\n\n기록 시각: ${now.toLocaleString('ko-KR')}`
    };

    return { sheetRows, calendarEvent };
  }
}