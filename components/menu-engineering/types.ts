// Menu Engineering Types

export type MainTab = 'materie-prime' | 'ricette' | 'menu-mix';

export type RecipeCategory =
  | 'antipasti'
  | 'primi'
  | 'secondi'
  | 'dessert'
  | 'altro'
  | 'contorni'
  | 'pizze'
  | 'tutti';

export interface RawMaterial {
  id: string;
  tipologia: string;
  categoria: string;
  codice: string;
  materiaPrima: string;
  unitaMisura: 'KG' | 'LT' | 'PZ';
  fornitore: string;
  prezzoAcquisto: number;
  dataUltimoAcquisto: string; // ISO date string
}

export interface RecipeIngredient {
  id: string;
  codMateria: string;
  materiaPrima: string;
  unitaMisura: 'KG' | 'GR' | 'LT' | 'ML' | 'PZ';
  peso: number;
  costo: number;
}

export interface Recipe {
  id: string;
  nomePiatto: string;
  categoria: RecipeCategory;
  prezzoVendita: number;
  ingredienti: RecipeIngredient[];
  foodCost: number;
  utile: number;
  marginalita: number; // percentage
  order: number; // for drag & drop ordering
}

export interface RecipeSales {
  recipeId: string;
  quantity: number;
  date: string; // ISO date string
}

export interface BCGQuadrant {
  name: string;
  color: string;
  bgColor: string;
  recipes: Recipe[];
}

export interface BCGMatrix {
  stars: Recipe[]; // High popularity, high margin
  questionMarks: Recipe[]; // Low popularity, high margin
  cashCows: Recipe[]; // High popularity, low margin
  dogs: Recipe[]; // Low popularity, low margin
}
