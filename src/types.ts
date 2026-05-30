/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DieSetting {
  dado: 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
  mod: number;
}

export type AttributeKey = 'Agilidade' | 'Astúcia' | 'Espírito' | 'Força' | 'Vigor';

export interface SkillSetting {
  nome: string;
  atributoAssociado: AttributeKey;
  possui: boolean;
  dado: 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
  mod: number;
}

export interface Power {
  id: string;
  nome: string;
  estagio: string;
  custo: string;
  distancia: string;
  duracao: string;
  efeito: string;
}

export interface Weapon {
  id: string;
  nome: string;
  dano: string;
  alcance: string;
  cdt: string;
  pa: string;
  peso: string;
  observacoes: string;
}

export interface CharacterFormState {
  formId: string; // 'base' | 'espada' | 'arco' | 'funda'
  nomeForma: string; // e.g. "Forma Base", "Espada", "Arco", "Funda"
  imageUrl: string; // Token image URL
  atributos: Record<AttributeKey, DieSetting>;
  pericias: SkillSetting[];
  vantagens: string;
  complicacoes: string;
  poderes: Power[];
  armas: Weapon[];
  apararMod: number; // modifier for Parry
  resistenciaMod: number; // modifier for Toughness
  tokenBorder?: 'amber' | 'gold' | 'iron' | 'neon' | 'fire';
  tokenScale?: number;
  tokenOffsetY?: number;
  tokenStyle?: 'circle' | 'card' | 'backdrop';
}

export interface CharacterSheet {
  id: string;
  nomePersonagem: string;
  jogador: string;
  campanha: string;
  raca: string;
  conceito: string;
  aparencia: string;
  historia: string;
  equipamentoGeral: string;
  pesoCarregado: string;
  pesoLimite: string;
  
  formas: CharacterFormState[];
  formaAtivaId: string; // ID of active form
  
  // Stats typically permanent or globally tracked, but customizable
  benes: number;
  ferimentos: number; // 0, 1, 2, 3, or more (wound penalties: -1, -2, -3, or incapacitated)
  fadiga: number; // 0, 1, 2 (fatigue penalties: -1, -2)
  xp: number;
  xpTrack: string; // e.g., "Novato"
  
  editToken?: string;
  lastUpdated: number;
}

// Default skill templates to populate new sheets
export const INITIAL_SKILLS: SkillSetting[] = [
  { nome: 'Atletismo', atributoAssociado: 'Agilidade', possui: true, dado: 'd6', mod: 0 },
  { nome: 'Furtividade', atributoAssociado: 'Agilidade', possui: true, dado: 'd4', mod: 0 },
  { nome: 'Lutar', atributoAssociado: 'Agilidade', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Atirar', atributoAssociado: 'Agilidade', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Dirigir', atributoAssociado: 'Agilidade', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Ladinagem', atributoAssociado: 'Agilidade', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Navegar', atributoAssociado: 'Agilidade', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Cavalgar', atributoAssociado: 'Agilidade', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Perceber', atributoAssociado: 'Astúcia', possui: true, dado: 'd6', mod: 0 },
  { nome: 'Con. Geral', atributoAssociado: 'Astúcia', possui: true, dado: 'd4', mod: 0 },
  { nome: 'Científico', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Histórico', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Hackear', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Sobrevivência', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Medicina', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Concertar', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Provocar', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Pesquisar', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Eletrônica', atributoAssociado: 'Astúcia', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Persuadir', atributoAssociado: 'Espírito', possui: true, dado: 'd4', mod: 0 },
  { nome: 'Intimidação', atributoAssociado: 'Espírito', possui: false, dado: 'd4', mod: 0 },
  { nome: 'Performance', atributoAssociado: 'Espírito', possui: false, dado: 'd4', mod: 0 }
];
