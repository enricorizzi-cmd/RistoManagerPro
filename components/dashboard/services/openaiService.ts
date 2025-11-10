// OpenAI Service - Integration with OpenAI API for insights and predictions

import type { AIInsight, AIPrediction } from '../types/dashboard.types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export async function generateAIInsights(
  financialData: any,
  salesData: any,
  recipes: any[]
): Promise<AIInsight[]> {
  if (!OPENAI_API_KEY) {
    // Return mock insights if no API key
    return getMockInsights();
  }

  try {
    const prompt = buildInsightsPrompt(financialData, salesData, recipes);

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Sei un esperto analista finanziario per ristoranti. Analizza i dati e fornisci insights pratici e actionable in formato JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return getMockInsights();
    }

    return parseAIResponse(content);
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    return getMockInsights();
  }
}

export async function generateAIPredictions(
  financialData: any,
  _salesData: any
): Promise<AIPrediction | null> {
  if (!OPENAI_API_KEY) {
    return getMockPredictions();
  }

  try {
    const prompt = buildPredictionsPrompt(financialData, _salesData);

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Sei un esperto analista finanziario. Fornisci previsioni accurate basate su trend storici in formato JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return getMockPredictions();
    }

    return parsePredictionsResponse(content);
  } catch (error) {
    console.error('Failed to generate AI predictions:', error);
    return getMockPredictions();
  }
}

function buildInsightsPrompt(
  financialData: any,
  salesData: any,
  recipes: any[]
): string {
  return `Analizza i seguenti dati del ristorante e fornisci 3-5 insights pratici in formato JSON:

Dati Finanziari:
${JSON.stringify(financialData, null, 2)}

Dati Vendite:
${JSON.stringify(salesData, null, 2)}

Ricette:
${JSON.stringify(recipes.slice(0, 10), null, 2)}

Formato risposta JSON:
{
  "insights": [
    {
      "type": "success|warning|info|danger",
      "priority": "high|medium|low",
      "title": "Titolo breve",
      "message": "Descrizione dettagliata",
      "recommendation": "Raccomandazione actionable"
    }
  ]
}`;
}

function buildPredictionsPrompt(financialData: any, _salesData: any): string {
  return `Basandoti sui trend storici, fornisci previsioni per il prossimo mese e trimestre in formato JSON:

Dati Storici:
${JSON.stringify(financialData, null, 2)}

Formato risposta JSON:
{
  "nextMonth": {
    "fatturato": 0,
    "utile": 0,
    "vendite": 0
  },
  "nextQuarter": {
    "fatturato": 0,
    "utile": 0,
    "vendite": 0
  },
  "confidence": 0.85
}`;
}

function parseAIResponse(content: string): AIInsight[] {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getMockInsights();
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const insights = parsed.insights || [];

    return insights.map((insight: any, index: number) => ({
      id: `insight-${Date.now()}-${index}`,
      type: insight.type || 'info',
      priority: insight.priority || 'medium',
      title: insight.title || 'Insight',
      message: insight.message || '',
      recommendation: insight.recommendation || '',
      metrics: insight.metrics || {},
      timestamp: new Date(),
    }));
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return getMockInsights();
  }
}

function parsePredictionsResponse(content: string): AIPrediction {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getMockPredictions();
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      nextMonth: parsed.nextMonth || {
        fatturato: 0,
        utile: 0,
        vendite: 0,
      },
      nextQuarter: parsed.nextQuarter || {
        fatturato: 0,
        utile: 0,
        vendite: 0,
      },
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error('Failed to parse predictions response:', error);
    return getMockPredictions();
  }
}

function getMockInsights(): AIInsight[] {
  return [
    {
      id: 'mock-1',
      type: 'info',
      priority: 'medium',
      title: 'Analisi Dati',
      message:
        'I dati finanziari sono stati caricati correttamente. Continua a monitorare le metriche chiave.',
      recommendation:
        'Verifica regolarmente il fatturato e i costi per mantenere la redditività.',
      timestamp: new Date(),
    },
  ];
}

function getMockPredictions(): AIPrediction {
  return {
    nextMonth: {
      fatturato: 0,
      utile: 0,
      vendite: 0,
    },
    nextQuarter: {
      fatturato: 0,
      utile: 0,
      vendite: 0,
    },
    confidence: 0.5,
  };
}
