// This file is auto-generated from the Excel sources in Piano Finanziario - FP
// Run python scripts/generate_financial_data.py to refresh the dataset.

export interface FinancialPlanMonthValue {
  month: string;
  preventivo: number | null;
  consuntivo: number | null;
}

export interface FinancialPlanRow {
  macroCategory: string;
  detail: string;
  months: FinancialPlanMonthValue[];
}

export interface FinancialCausaleCategory {
  name: string;
  items: string[];
}

export interface FinancialCausaleGroup {
  macroCategory: string;
  categories: FinancialCausaleCategory[];
}

export interface FinancialStatsRow {
  month: string;
  fatturatoImponibile: number | null;
  fatturatoTotale: number | null;
  fatturatoPrevisionale?: number | null;
  utileCassa: number | null;
  utilePrevisionale?: number | null;
  incassato: number | null;
  incassatoPrevisionale?: number | null;
  saldoConto: number | null;
  saldoSecondoConto: number | null;
  saldoTotale: number | null;
  creditiPendenti: number | null;
  creditiScaduti: number | null;
  debitiFornitore: number | null;
  debitiBancari: number | null;
}


export const financialPlanRows = [
  {
    "macroCategory": "INCASSATO",
    "detail": "INCASSATO",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "COSTI FISSI",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Rete vendita, Amministratori, Immobili",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Rimborsi spese",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Affitto",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Enasarco",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Eventi Organizzati",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Cene",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Eventi",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Costo del personale",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Stipendi Lordi ( netto * 2,3 )",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "rimborso km",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Rimborso soci",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Stipendi dei Dipendenti",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Rimborsi spese",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Rimborsi KM e Diarie",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "IRPEF/Contributi",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "F24",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "F24 irpef e contributi",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "F24 diritto annuale",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "F24 Tasse",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Fondo pensione",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Totale Servizi",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Servizi",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Autostrada",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Amazon",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Spese varie – Notaio",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Consulenze -Osm/bni",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Formazione",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "computer e telefoni",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "commercialista - buste paga",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Assicurazioni/bolli",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Cancelleria - spesa varia",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Pasti - Trasferte - Mensa",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Accisa",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Manutenzione Mezzi",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Acquisto Mezzi (anche Leasing e Finanziamenti)",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "software e licenze",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Multe",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Quota Associativa",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Imposta di registro",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Utenze",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Luce - Elettricità",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Gas",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Acqua",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Rifiuti",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Telefonia Mobile + Fissa + Internet",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Pubblicità - Marketing",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Sponsor",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Marketing",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Pubblicità",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "nome fornitore",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Gestione finanziaria",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Oneri Finanziari - Commissioni",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "rate erario",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Leasing - Mutuo (immobili)",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Bancomat - Carte - Prepagate",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Operazioni Extra",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Acquisto Ramo d'Azienda",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Altro",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "detail": "Fondi - Obbligazionario",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "COSTI VARIABILI TOTALI",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Fornitori Materiali",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Merce in Acquisto",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Freelance",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Noleggio Attrezzature",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Sub-Appaltatori",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Costi spedizione fornitori",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Costi trasporto (in arrivo e in uscita)",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "detail": "Altro",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": null,
        "consuntivo": null
      }
    ]
  },
  {
    "macroCategory": "UTILE LORDO",
    "detail": "RISULTATO DEL MESE",
    "months": [
      {
        "month": "OTTOBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "NOVEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      },
      {
        "month": "DICEMBRE 2025",
        "preventivo": 0.0,
        "consuntivo": 0.0
      }
    ]
  }
] as const;


export const financialCausali = [
  {
    "macroCategory": "INCASSATO",
    "categories": [
      {
        "name": "Incassato",
        "items": [
          "Incassato"
        ]
      }
    ]
  },
  {
    "macroCategory": "COSTI FISSI",
    "categories": [
      {
        "name": "Rete vendita, Amministratori, Immobili",
        "items": [
          "Rimborsi spese",
          "Affitto",
          "Enasarco"
        ]
      },
      {
        "name": "Eventi Organizzati",
        "items": [
          "Cene",
          "Eventi"
        ]
      },
      {
        "name": "Dipendenti",
        "items": [
          "Stipendi dei Dipendenti",
          "Rimborsi KM e Diarie (Dipendenti)",
          "Premi/Bonus",
          "F24 IRPEF e Contributi (Dipendenti)",
          "Fondo pensione (Dipendenti)",
          "TFR"
        ]
      },
      {
        "name": "Amministratori",
        "items": [
          "Compensi Amministratori",
          "Rimborsi KM e Diarie (Amministratori)",
          "Contributi previdenziali (F24) Amministratori",
          "Fondo pensione (Amministratori)"
        ]
      },
      {
        "name": "Tasse",
        "items": [
          "F24",
          "F24 diritto annuale",
          "F24 Tasse",
          "IRES/IRAP",
          "Imposte locali e altre tasse"
        ]
      },
      {
        "name": "Servizi",
        "items": [
          "Autostrada",
          "Amazon",
          "Spese varie – Notaio",
          "Consulenze - Osm ecc",
          "Formazione",
          "computer e telefoni",
          "commercialista - buste paga",
          "Assicurazioni/bolli",
          "Cancelleria - spesa varia",
          "Pasti - Trasferte - Mensa",
          "Accisa",
          "Manutenzione Mezzi",
          "Acquisto Mezzi (anche Leasing e Finanziamenti)",
          "Software e licenze",
          "Multe",
          "Quota Associativa"
        ]
      },
      {
        "name": "Utenze",
        "items": [
          "Luce - Elettricità",
          "Gas",
          "Acqua",
          "Rifiuti",
          "Telefonia Mobile + Fissa + Internet"
        ]
      },
      {
        "name": "Pubblicità - Marketing",
        "items": [
          "Sponsor",
          "Marketing",
          "Pubblicità",
          "nome fornitore"
        ]
      },
      {
        "name": "Gestione finanziaria",
        "items": [
          "Oneri Finanziari - Commissioni",
          "rate erario",
          "Leasing - Mutuo (immobili)",
          "Bancomat - Carte - Prepagate"
        ]
      },
      {
        "name": "Operazioni Extra",
        "items": [
          "Acquisto Ramo d'Azienda",
          "Altro",
          "Fondi - Obbligazionario - Investimenti"
        ]
      }
    ]
  },
  {
    "macroCategory": "COSTI VARIABILI",
    "categories": [
      {
        "name": "Fornitori Materiali",
        "items": [
          "nome fornitore",
          "Merce in Acquisto",
          "Freelance",
          "Noleggio Attrezzature",
          "Sub-Appaltatori"
        ]
      },
      {
        "name": "Costi spedizione",
        "items": [
          "Costi trasporto (in arrivo e in uscita)",
          "Altro"
        ]
      }
    ]
  }
] as const;


export const financialStats = [
  {
    "month": "Gen. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Feb. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Mar. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Apr. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Mag. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Giu. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Lug. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Ago. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Set. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Ott. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Nov. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Dic. 24",
    "fatturatoImponibile": null,
    "fatturatoTotale": null,
    "utileCassa": 0.0,
    "incassato": null,
    "saldoConto": 3926.0,
    "saldoSecondoConto": null,
    "saldoTotale": 3926.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Gen. 25",
    "fatturatoImponibile": 15200.0,
    "fatturatoTotale": 15200.0,
    "utileCassa": 2506.16,
    "incassato": 22305.56,
    "saldoConto": 15925.0,
    "saldoSecondoConto": null,
    "saldoTotale": 15925.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Feb. 25",
    "fatturatoImponibile": 25020.0,
    "fatturatoTotale": 25020.0,
    "utileCassa": -5456.16,
    "incassato": 11235.84,
    "saldoConto": 27026.0,
    "saldoSecondoConto": null,
    "saldoTotale": 27026.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Mar. 25",
    "fatturatoImponibile": 13864.0,
    "fatturatoTotale": 13864.0,
    "utileCassa": -2822.8,
    "incassato": 18680.0,
    "saldoConto": 37597.0,
    "saldoSecondoConto": null,
    "saldoTotale": 37597.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Apr. 25",
    "fatturatoImponibile": 12418.0,
    "fatturatoTotale": 12418.0,
    "utileCassa": 8886.39,
    "incassato": 29470.08,
    "saldoConto": 43566.0,
    "saldoSecondoConto": null,
    "saldoTotale": 43566.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Mag. 25",
    "fatturatoImponibile": 28076.0,
    "fatturatoTotale": 28076.0,
    "utileCassa": -9449.91,
    "incassato": 17682.79,
    "saldoConto": 27450.0,
    "saldoSecondoConto": null,
    "saldoTotale": 27450.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Giu. 25",
    "fatturatoImponibile": 15590.0,
    "fatturatoTotale": 15590.0,
    "utileCassa": 1346.61,
    "incassato": 20671.31,
    "saldoConto": 11330.0,
    "saldoSecondoConto": null,
    "saldoTotale": 11330.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Lug. 25",
    "fatturatoImponibile": 25441.0,
    "fatturatoTotale": 25441.0,
    "utileCassa": 8624.83,
    "incassato": 33318.85,
    "saldoConto": 20440.0,
    "saldoSecondoConto": null,
    "saldoTotale": 20440.0,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  },
  {
    "month": "Ago. 25",
    "fatturatoImponibile": 20109.0,
    "fatturatoTotale": 20109.0,
    "utileCassa": -7212.65,
    "incassato": 25691.8,
    "saldoConto": null,
    "saldoSecondoConto": null,
    "saldoTotale": null,
    "creditiPendenti": null,
    "creditiScaduti": null,
    "debitiFornitore": null,
    "debitiBancari": null
  }
] as const;
