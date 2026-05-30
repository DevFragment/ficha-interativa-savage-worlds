/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sword, Shield, Heart, Sparkles, Copy, Plus, Trash, 
  Share2, Check, Skull, Feather, History, Package, Lock, Unlock, RefreshCw,
  AlertCircle, Upload, LayoutGrid, Layers, Trash2, Camera,
  Printer, Download, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { 
  CharacterSheet, 
  CharacterFormState, 
  INITIAL_SKILLS, 
  AttributeKey, 
  SkillSetting,
  Weapon,
  Power
} from './types';

// Sealed generator function
const createDefaultSheet = (nome: string, conceito: string): CharacterSheet => {
  const baseForm: CharacterFormState = {
    formId: 'base',
    nomeForma: 'Ficha Base',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=350&h=350&fit=crop&q=80',
    atributos: {
      Agilidade: { dado: 'd6', mod: 0 },
      Astúcia: { dado: 'd6', mod: 0 },
      Espírito: { dado: 'd6', mod: 0 },
      Força: { dado: 'd6', mod: 0 },
      Vigor: { dado: 'd6', mod: 0 }
    },
    pericias: INITIAL_SKILLS.map(s => ({
      ...s,
      possui: ['Atletismo', 'Perceber', 'Con. Geral', 'Persuadir'].includes(s.nome)
    })),
    vantagens: '',
    complicacoes: '',
    poderes: [],
    armas: [
      { 
        id: 'w1', 
        nome: 'Ataque Desarmado', 
        dano: 'Força', 
        alcance: 'Melee', 
        cdt: '1', 
        pa: '0', 
        peso: '0', 
        observacoes: 'Ataque padrão desarmado.' 
      }
    ],
    apararMod: 0,
    resistenciaMod: 0
  };

  const secundaryForm: CharacterFormState = {
    formId: 'secundary',
    nomeForma: 'Ficha Alternativa',
    imageUrl: '',
    atributos: {
      Agilidade: { dado: 'd6', mod: 0 },
      Astúcia: { dado: 'd6', mod: 0 },
      Espírito: { dado: 'd6', mod: 0 },
      Força: { dado: 'd6', mod: 0 },
      Vigor: { dado: 'd6', mod: 0 }
    },
    pericias: INITIAL_SKILLS.map(s => ({
      ...s,
      possui: ['Atletismo', 'Perceber'].includes(s.nome)
    })),
    vantagens: '',
    complicacoes: '',
    poderes: [],
    armas: [],
    apararMod: 0,
    resistenciaMod: 0
  };

  return {
    id: '',
    nomePersonagem: nome || 'Meu Personagem',
    jogador: 'Jogador',
    campanha: 'Minha Campanha',
    raca: 'Humano',
    conceito: conceito || 'Guerreiro',
    aparencia: '',
    historia: '',
    equipamentoGeral: '',
    pesoCarregado: '0 kg',
    pesoLimite: '20 kg',
    formas: [baseForm, secundaryForm],
    formaAtivaId: 'base',
    benes: 3,
    ferimentos: 0,
    fadiga: 0,
    xp: 0,
    xpTrack: 'Novato',
    lastUpdated: Date.now()
  };
};

const parseSavageWorldsPDFFields = (fieldData: Record<string, string>): CharacterSheet => {
  const getValue = (key: string) => fieldData[key] || '';

  // Basic Fields
  const nomePersonagem = getValue('Nome') || 'Meu Personagem';
  const jogador = getValue('Jogador') || 'Jogador';
  const campanha = getValue('Campanha') || 'Minha Campanha';
  const raca = getValue('Raça') || 'Humano';
  const conceito = getValue('Conceito') || 'Guerreiro';
  const aparencia = getValue('Aparência') || '';
  const historia = getValue('História do Personagem') || '';
  const equipamentoGeral = getValue('Equipamento') || '';
  
  const pesoCarregado = getValue('Peso Carregado') ? `${getValue('Peso Carregado')} kg` : '0 kg';
  const pesoLimite = getValue('Peso Limite') ? `${getValue('Peso Limite')} kg` : '20 kg';
  
  const benes = parseInt(getValue('Bênes')) || 3;
  const ferimentos = 0;
  const fadiga = 0;
  const xp = 0;
  const xpTrack = 'Novato';

  // Attributes
  const getDieFromCheckBoxes = (startIndex: number): 'd4' | 'd6' | 'd8' | 'd10' | 'd12' => {
    let checkedCount = 0;
    for (let i = 0; i < 5; i++) {
      const idx = startIndex + i;
      const key = idx === 0 ? 'Check Box' : `Check Box${idx}`;
      if (fieldData[key] === '/Sim') {
        checkedCount++;
      }
    }
    if (checkedCount >= 5) return 'd12';
    if (checkedCount === 4) return 'd10';
    if (checkedCount === 3) return 'd8';
    if (checkedCount === 2) return 'd6';
    return 'd4';
  };

  const getAttributeMod = (key: string): number => {
    return parseInt(fieldData[key]) || 0;
  };

  const atributos = {
    Agilidade: { dado: getDieFromCheckBoxes(0), mod: getAttributeMod('Mod.AGI') },
    Astúcia: { dado: getDieFromCheckBoxes(4), mod: getAttributeMod('Mod.AST') },
    Espírito: { dado: getDieFromCheckBoxes(9), mod: getAttributeMod('Mod.ESP') },
    Força: { dado: getDieFromCheckBoxes(14), mod: getAttributeMod('Mod.FOR') },
    Vigor: { dado: getDieFromCheckBoxes(19), mod: getAttributeMod('Mod.VIG') }
  };

  // Skills (Perícias)
  const periciasList: SkillSetting[] = [];
  const skillGroupsList = [
    { prefix: 'Perícia(AGI)', attr: 'Agilidade' as const, count: 11 },
    { prefix: 'Perícia(AST)', attr: 'Astúcia' as const, count: 11 },
    { prefix: 'Perícia(ESP)', attr: 'Espírito' as const, count: 6 },
    { prefix: 'Perícia(FOR)', attr: 'Força' as const, count: 2 },
    { prefix: 'Perícia(VIG)', attr: 'Vigor' as const, count: 2 }
  ];

  let currentBoxIndex = 24;
  let modIndex = 0;

  skillGroupsList.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      const fieldKey = i === 0 ? group.prefix : `${group.prefix}${i - 1}`;
      const name = getValue(fieldKey);
      
      const startBox = currentBoxIndex;
      currentBoxIndex += 5;

      const modFieldKey = modIndex === 0 ? 'Mod.PER' : `Mod.PER${modIndex - 1}`;
      modIndex++;
      
      if (name && name.trim() !== '') {
        let checkedCount = 0;
        for (let b = 0; b < 5; b++) {
          const idx = startBox + b;
          const key = `Check Box${idx}`;
          if (fieldData[key] === '/Sim') {
            checkedCount++;
          }
        }
        
        let dado: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' = 'd4';
        if (checkedCount >= 5) dado = 'd12';
        else if (checkedCount === 4) dado = 'd10';
        else if (checkedCount === 3) dado = 'd8';
        else if (checkedCount === 2) dado = 'd6';
        else if (checkedCount === 1) dado = 'd4';
        
        const mod = parseInt(fieldData[modFieldKey]) || 0;
        
        periciasList.push({
          nome: name.trim(),
          atributoAssociado: group.attr,
          possui: checkedCount > 0,
          dado,
          mod
        });
      }
    }
  });

  // Default skills from types if they are missing
  INITIAL_SKILLS.forEach(initialSkill => {
    const exists = periciasList.some(p => p.nome.toLowerCase() === initialSkill.nome.toLowerCase());
    if (!exists) {
      periciasList.push({
        ...initialSkill,
        possui: false,
        dado: 'd4',
        mod: 0
      });
    }
  });

  // Weapons (Armas)
  const armas: Weapon[] = [];
  for (let w = 0; w < 5; w++) {
    const suffix = w === 0 ? '' : `${w - 1}`;
    const nameKey = `Arma${suffix}`;
    const danoKey = `Dano${suffix}`;
    const alcanceKey = `Alcance${suffix}`;
    const obsKey = `Observação${suffix}`;
    const cdtKey = `CdT${suffix}`;
    const paKey = `PA${suffix}`;
    const pesoKey = `Peso${suffix}`;

    const nome = getValue(nameKey);
    if (nome && nome.trim() !== '') {
      armas.push({
        id: `arm_pdf_${w}_${Math.random().toString(36).substring(2, 6)}`,
        nome: nome.trim(),
        dano: getValue(danoKey) || 'Força',
        alcance: getValue(alcanceKey) || 'Melee',
        cdt: getValue(cdtKey) || '1',
        pa: getValue(paKey) || '0',
        peso: getValue(pesoKey) || '0',
        observacoes: getValue(obsKey) || ''
      });
    }
  }

  // Powers (Poderes)
  const poderes: Power[] = [];
  for (let p = 0; p < 9; p++) {
    const suffix = p === 0 ? '' : `${p - 1}`;
    const nameKey = `Poder${suffix}`;
    const custoKey = `Custo${suffix}`;
    const distKey = `Distância${suffix}`;
    const durKey = `Duração${suffix}`;
    const efeitoKey = `Dano/Efeito${suffix}`;

    const nome = getValue(nameKey);
    if (nome && nome.trim() !== '') {
      poderes.push({
        id: `pow_pdf_${p}_${Math.random().toString(36).substring(2, 6)}`,
        nome: nome.trim(),
        estagio: 'Novato',
        custo: getValue(custoKey) || '',
        distancia: getValue(distKey) || '',
        duracao: getValue(durKey) || '',
        efeito: getValue(efeitoKey) || ''
      });
    }
  }

  // Derived modifiers (Aparar & Resistência)
  let apararMod = 0;
  let resistenciaMod = 0;

  const writtenParry = parseInt(getValue('ApararTotal')) || parseInt(getValue('ApararNatural')) || 0;
  if (writtenParry > 0) {
    const lutar = periciasList.find(p => p.nome.toLowerCase() === 'lutar');
    const lutarDieVal = lutar && lutar.possui ? (parseInt(lutar.dado.replace('d', '')) || 4) : 0;
    const baseParry = lutarDieVal > 0 ? (2 + Math.floor((lutarDieVal + (lutar?.mod || 0)) / 2)) : 2;
    apararMod = writtenParry - baseParry;
  }

  const writtenToughness = parseInt(getValue('ResistênciaTotal')) || parseInt(getValue('ResistênciaNatural')) || 0;
  if (writtenToughness > 0) {
    const vigorDieVal = parseInt(atributos.Vigor.dado.replace('d', '')) || 6;
    const baseToughness = 2 + Math.floor((vigorDieVal + (atributos.Vigor.mod || 0)) / 2);
    resistenciaMod = writtenToughness - baseToughness;
  }

  return {
    id: '',
    nomePersonagem,
    jogador,
    campanha,
    raca,
    conceito,
    aparencia,
    historia,
    equipamentoGeral,
    pesoCarregado,
    pesoLimite,
    benes,
    ferimentos,
    fadiga,
    xp,
    xpTrack,
    formas: [
      {
        formId: 'base',
        nomeForma: 'Ficha Base',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=350&h=350&fit=crop&q=80',
        atributos,
        pericias: periciasList,
        vantagens: getValue('Vantagens/Poderes') || '',
        complicacoes: getValue('Complicações') || '',
        poderes,
        armas,
        apararMod,
        resistenciaMod
      }
    ],
    formaAtivaId: 'base',
    lastUpdated: Date.now()
  };
};

const getTokenFrameClass = (border: 'amber' | 'gold' | 'iron' | 'neon' | 'fire', isCard: boolean): string => {
  const rounded = isCard ? 'rounded-xl' : 'rounded-full';
  switch (border) {
    case 'gold':
      return `border-4 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-600 ring-offset-2 ring-offset-slate-950 ${rounded}`;
    case 'iron':
      return `border-4 border-slate-650 shadow-[0_0_10px_rgba(71,85,105,0.4)] ring-4 ring-slate-950 ${rounded}`;
    case 'neon':
      return `border-4 border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.5)] animate-pulse ${rounded}`;
    case 'fire':
      return `border-4 border-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.5)] border-dashed ${rounded}`;
    case 'amber':
    default:
      return `border-4 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)] ${rounded}`;
  }
};

export default function App() {
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Toast notifications for iframe safety and premium UX
  const [toast, setToast] = useState<string | null>(null);

  // Landing state
  const [newName, setNewName] = useState<string>('');
  const [newConcept, setNewConcept] = useState<string>('');

  // Sintonizador local (guests / owner view offset)
  const [localActiveFormId, setLocalActiveFormId] = useState<string>('base');

  // Saving states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'modified'>('saved');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Responsive / Layout states
  const [viewMode, setViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeTab, setActiveTab] = useState<'status' | 'pericias' | 'combate' | 'global'>('status');

  // Custom Form Addition Modal / UI
  const [isAddingForm, setIsAddingForm] = useState<boolean>(false);
  const [newFormName, setNewFormName] = useState<string>('');
  const [copyFormContentId, setCopyFormContentId] = useState<string>('base');

  // Custom Skill Addition UI
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillAttr, setNewSkillAttr] = useState<AttributeKey>('Agilidade');
  const [newSkillDie, setNewSkillDie] = useState<'d4' | 'd6' | 'd8' | 'd10' | 'd12'>('d4');

  // Saved Sheets state
  const [showSavedList, setShowSavedList] = useState<boolean>(false);
  const [showImageConfig, setShowImageConfig] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [savedSheets, setSavedSheets] = useState<{id: string, editToken: string, nomePersonagem: string, conceito: string, lastAccessed: number}[]>([]);
  const [isTempStorage, setIsTempStorage] = useState<boolean>(false);

  // Check backend health/storage status on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.isVercel && !data.hasRedis) {
          setIsTempStorage(true);
        }
      })
      .catch(() => {});
  }, []);

  // Local Storage Backup (Full Sheet data for owner)
  useEffect(() => {
    if (sheet && isEditable && sheet.id) {
      try {
        localStorage.setItem(`savage_sheet_data_${sheet.id}`, JSON.stringify(sheet));
      } catch (err) {
        console.warn('LocalStorage backup failure:', err);
      }
    }
  }, [sheet, isEditable]);

  // Auto-clear toast notifications
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-detect mobile to set optimized Tab layout initially
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setViewMode('tabs');
      } else {
        setViewMode('all');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Local Storage Sync (Recent Sheets)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('savage_saved_sheets');
      if (stored) {
        setSavedSheets(JSON.parse(stored));
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (sheet && isEditable) {
      setSavedSheets(prev => {
        const existing = prev.filter(s => s.id !== sheet.id);
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || '';
        
        // Only save if we have the edit token in URL or we just created it
        if (token) {
          const updatedList = [
            ...existing,
            {
              id: sheet.id,
              editToken: token,
              nomePersonagem: sheet.nomePersonagem || 'Personagem',
              conceito: sheet.conceito || '',
              lastAccessed: Date.now()
            }
          ];
          // Sort by last Accessed desc, max 20
          updatedList.sort((a, b) => b.lastAccessed - a.lastAccessed);
          const final = updatedList.slice(0, 20);
          localStorage.setItem('savage_saved_sheets', JSON.stringify(final));
          return final;
        }
        return prev;
      });
    }
  }, [sheet?.id, sheet?.nomePersonagem, sheet?.conceito, isEditable]);

  // Parse URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const token = params.get('token');
    if (id) {
      fetchSheet(id, token);
    }
  }, []);

  // Sync active local form option if the sheet's state changes
  useEffect(() => {
    if (sheet) {
      setLocalActiveFormId(sheet.formaAtivaId);
    }
  }, [sheet?.formaAtivaId]);

  // Real-time synchronization back-pull for read-only guests
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id || isEditable) return;

    const interval = setInterval(() => {
      silentFetch(id);
    }, 3500);

    return () => clearInterval(interval);
  }, [isEditable]);

  const fetchSheet = async (id: string, token: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/sheets/${id}${token ? `?token=${token}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        // If 404 and we have a local backup with token, try to restore it!
        if (res.status === 404 && token) {
          const backup = localStorage.getItem(`savage_sheet_data_${id}`);
          if (backup) {
            try {
              const parsedBackup = JSON.parse(backup);
              setToast("Restaurando ficha do backup local...");
              const restoreRes = await fetch(`/api/sheets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...parsedBackup, editToken: token })
              });
              if (restoreRes.ok) {
                const restoreData = await restoreRes.json();
                setSheet(restoreData.sheet);
                setIsEditable(true);
                setLocalActiveFormId(restoreData.sheet.formaAtivaId || 'base');
                setToast("Sua ficha expirada no servidor foi restaurada automaticamente do backup do seu navegador!");
                return;
              }
            } catch (restoreErr) {
              console.error("Erro ao tentar auto-restaurar ficha:", restoreErr);
            }
          }
        }
        throw new Error('Ficha não encontrada ou link expirado.');
      }
      const data = await res.json();
      setSheet(data.sheet);
      setIsEditable(data.isEditable);
      setLocalActiveFormId(data.sheet.formaAtivaId);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  const silentFetch = async (id: string) => {
    try {
      const res = await fetch(`/api/sheets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSheet(prev => {
          if (!prev) return data.sheet;
          if (data.sheet.lastUpdated > prev.lastUpdated) {
            return data.sheet;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Silent sync cycle skip.', err);
    }
  };

  // Create character
  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const defaultData = createDefaultSheet(newName, newConcept);
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultData)
      });
      if (!res.ok) throw new Error('Erro ao criar herói.');
      const result = await res.json();
      
      setSheet(result.sheet);
      setIsEditable(true);
      setLocalActiveFormId(result.sheet.formaAtivaId);
      
      const newUrl = `${window.location.origin}${window.location.pathname}?id=${result.id}&token=${result.editToken}`;
      window.history.replaceState({}, '', newUrl);
    } catch (err: any) {
      setError(err.message || 'Houve um erro.');
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar banco (PUT request para persistência)
  const handleSave = async (updatedSheet: CharacterSheet) => {
    if (!isEditable) return;
    setSaveStatus('saving');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    try {
      const res = await fetch(`/api/sheets/${updatedSheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedSheet, editToken: token })
      });
      if (!res.ok) throw new Error('Sinc falhou.');
      setSaveStatus('saved');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  // Atualiza estado local imediatamente e agenda salvamento
  const updateSheet = (updater: (prev: CharacterSheet) => CharacterSheet) => {
    if (!sheet || !isEditable) return;
    setSaveStatus('modified');
    setSheet(prev => {
      const updated = updater(prev!);
      return { ...updated, lastUpdated: Date.now() };
    });
  };

  // Autosave debouncing: aguarda 1.2 segundos após a digitação para sincronizar com o banco
  useEffect(() => {
    if (!sheet || !isEditable || saveStatus !== 'modified') return;

    const timer = setTimeout(() => {
      handleSave(sheet);
    }, 1200);

    return () => clearTimeout(timer);
  }, [sheet, isEditable, saveStatus]);

  const getActiveForm = (): CharacterFormState | undefined => {
    if (!sheet) return undefined;
    return sheet.formas.find(f => f.formId === localActiveFormId);
  };

  const activeForm = getActiveForm();

  const updateActiveForm = (updater: (form: CharacterFormState) => CharacterFormState) => {
    updateSheet(prev => {
      const updatedFormas = prev.formas.map(f => {
        if (f.formId === localActiveFormId) {
          return updater(f);
        }
        return f;
      });
      return { ...prev, formas: updatedFormas };
    });
  };

  // Clone Base form attributes
  const handleCopyBaseToActive = () => {
    if (!sheet || localActiveFormId === 'base') return;
    const base = sheet.formas.find(f => f.formId === 'base');
    if (!base) return;

    if (window.confirm(`Copiar os atributos, vantagens e perícias da "Forma Base" para "${activeForm?.nomeForma}"?`)) {
      updateActiveForm(current => ({
        ...current,
        atributos: JSON.parse(JSON.stringify(base.atributos)),
        pericias: JSON.parse(JSON.stringify(base.pericias)),
        vantagens: base.vantagens,
        complicacoes: base.complicacoes,
        poderes: JSON.parse(JSON.stringify(base.poderes)),
        armas: JSON.parse(JSON.stringify(base.armas)),
        apararMod: base.apararMod,
        resistenciaMod: base.resistenciaMod
      }));
    }
  };

  // Base-image placeholder fallback resolver
  const getActiveFormImage = (): string => {
    if (!sheet) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=350&h=350&fit=crop&q=80';
    if (!activeForm) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=350&h=350&fit=crop&q=80';
    
    // 1. If active form has a valid image, use it!
    if (activeForm.imageUrl && activeForm.imageUrl.trim() !== '') {
      return activeForm.imageUrl;
    }
    
    // 2. If active form is not the 'base' form, fall back to base form's image
    if (localActiveFormId !== 'base') {
      const baseForm = sheet.formas.find(f => f.formId === 'base');
      if (baseForm && baseForm.imageUrl && baseForm.imageUrl.trim() !== '') {
        return baseForm.imageUrl;
      }
    }
    
    // 3. Absolute fallback image
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=350&h=350&fit=crop&q=80';
  };

  // Base64 Local Image Upload with Canvas-based scale & compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setToast("Compactando e carregando imagem...");

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 350;
        const MAX_HEIGHT = 350;
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress as JPEG format with 0.75 quality for an extremely light footprint (~20-40kb)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          updateActiveForm(form => ({
            ...form,
            imageUrl: compressedBase64
          }));
          setToast("Imagem carregada e compactada!");
        } else {
          // Fallback if canvas is unsupported
          updateActiveForm(form => ({
            ...form,
            imageUrl: dataUrl
          }));
          setToast("Imagem carregada!");
        }
      };
      img.onerror = () => {
        // Fallback
        updateActiveForm(form => ({
          ...form,
          imageUrl: dataUrl
        }));
        setToast("Imagem carregada!");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Dynamically ADD a Custom Game Form (Ficha/Forma)
  const handleCreateNewForm = () => {
    if (!newFormName.trim()) {
      setToast("Aviso: digite um nome para a nova ficha/estado.");
      return;
    }

    updateSheet(prev => {
      const templateSource = prev.formas.find(f => f.formId === copyFormContentId) || prev.formas[0];
      const newFormId = "forma_" + Math.random().toString(36).substring(2, 9);
      
      const newCustomForm: CharacterFormState = {
        ...JSON.parse(JSON.stringify(templateSource)),
        formId: newFormId,
        nomeForma: newFormName.trim(),
        imageUrl: templateSource.imageUrl || 'https://picsum.photos/seed/sw_custom/350/350'
      };

      return {
        ...prev,
        formas: [...prev.formas, newCustomForm],
        formaAtivaId: newFormId
      };
    });

    setNewFormName('');
    setIsAddingForm(false);
  };

  // Delete Custom Form
  const handleDeleteForm = (targetId: string) => {
    if (targetId === 'base') {
      setToast("Aviso: a Ficha Base não pode ser removida.");
      return;
    }
    const targetFormName = sheet?.formas.find(f => f.formId === targetId)?.nomeForma;
    if (window.confirm(`Tem certeza que deseja apagar a ficha "${targetFormName}"?`)) {
      updateSheet(prev => {
        const nextFormas = prev.formas.filter(f => f.formId !== targetId);
        const fallbackId = prev.formaAtivaId === targetId ? 'base' : prev.formaAtivaId;
        return {
          ...prev,
          formas: nextFormas,
          formaAtivaId: fallbackId
        };
      });
      if (localActiveFormId === targetId) {
        setLocalActiveFormId('base');
      }
    }
  };

  // Create custom weapon or attack
  const handleAddWeapon = () => {
    updateActiveForm(form => {
      const newWeapon = {
        id: "arm_" + Math.random().toString(36).substring(2, 8),
        nome: "Nova Arma",
        dano: "Força + d6",
        alcance: "Melee",
        cdt: "1",
        pa: "0",
        peso: "1kg",
        observacoes: "Adicionada manualmente."
      };
      return {
        ...form,
        armas: [...form.armas, newWeapon]
      };
    });
  };

  // Dynamic Skill Adding
  const handleAddCustomSkill = () => {
    if (!newSkillName.trim()) {
      setToast("Aviso: digite o nome da perícia.");
      return;
    }

    const exists = activeForm?.pericias.some(p => p.nome.toLowerCase() === newSkillName.trim().toLowerCase());
    if (exists) {
      setToast("Aviso: uma perícia com esse nome já existe!");
      return;
    }

    updateActiveForm(form => {
      const customSkill: SkillSetting = {
        nome: newSkillName.trim(),
        atributoAssociado: newSkillAttr,
        possui: true,
        dado: newSkillDie,
        mod: 0
      };
      return {
        ...form,
        pericias: [...form.pericias, customSkill]
      };
    });

    setNewSkillName('');
  };

  // Remove dynamic/custom skill
  const handleRemoveCustomSkill = (skillName: string) => {
    if (window.confirm(`Excluir perícia "${skillName}" dicionarizado do personagem?`)) {
      updateActiveForm(form => ({
        ...form,
        pericias: form.pericias.filter(p => p.nome !== skillName)
      }));
    }
  };

  // Calculations
  const getParry = (form: CharacterFormState): number => {
    const lutar = form.pericias.find(p => p.nome.toLowerCase() === 'lutar');
    if (!lutar || !lutar.possui) return 2 + form.apararMod;
    const dieValue = parseInt(lutar.dado.replace('d', '')) || 4;
    return 2 + Math.floor((dieValue + (lutar.mod || 0)) / 2) + form.apararMod;
  };

  const getToughness = (form: CharacterFormState): number => {
    const vigor = form.atributos.Vigor;
    const dieValue = parseInt(vigor.dado.replace('d', '')) || 6;
    return 2 + Math.floor((dieValue + (vigor.mod || 0)) / 2) + form.resistenciaMod;
  };

  const getPenalties = (): number => {
    if (!sheet) return 0;
    return -(Math.min(sheet.ferimentos, 3) + Math.min(sheet.fadiga, 2));
  };

  const handleShareLink = () => {
    if (!sheet) return;
    const readOnlyUrl = `${window.location.origin}${window.location.pathname}?id=${sheet.id}`;
    navigator.clipboard.writeText(readOnlyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!sheet) return;
    const dataStr = JSON.stringify(sheet, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (sheet.nomePersonagem || "ficha").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.download = `savage-worlds-${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast("Ficha exportada como JSON com sucesso!");
  };

  const handleEditorLink = () => {
    if (!sheet) return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const importedSheet = JSON.parse(text);

        // Check if we are currently viewing a sheet and it is editable
        if (sheet && isEditable) {
          const choice = window.confirm(
            `Ficha JSON carregada com sucesso!\n\n` +
            `Personagem: ${importedSheet.nomePersonagem || 'Sem nome'}\n` +
            `Conceito: ${importedSheet.conceito || 'Sem conceito'}\n\n` +
            `Deseja MESCLAR/SUBSTITUIR as informações na ficha atual?\n` +
            `(Clique em CANCELAR para abrir em uma NOVA ficha separada)`
          );

          if (choice) {
            updateSheet(prev => {
              // Merge/Replace all properties except id and editToken
              return {
                ...prev,
                nomePersonagem: importedSheet.nomePersonagem || prev.nomePersonagem,
                jogador: importedSheet.jogador || prev.jogador,
                campanha: importedSheet.campanha || prev.campanha,
                raca: importedSheet.raca || prev.raca,
                conceito: importedSheet.conceito || prev.conceito,
                aparencia: importedSheet.aparencia || prev.aparencia,
                historia: importedSheet.historia || prev.historia,
                equipamentoGeral: importedSheet.equipamentoGeral || prev.equipamentoGeral,
                pesoCarregado: importedSheet.pesoCarregado || prev.pesoCarregado,
                pesoLimite: importedSheet.pesoLimite || prev.pesoLimite,
                benes: importedSheet.benes ?? prev.benes,
                ferimentos: importedSheet.ferimentos ?? prev.ferimentos,
                fadiga: importedSheet.fadiga ?? prev.fadiga,
                xp: importedSheet.xp ?? prev.xp,
                xpTrack: importedSheet.xpTrack || prev.xpTrack,
                formas: importedSheet.formas || prev.formas,
                formaAtivaId: importedSheet.formaAtivaId || prev.formaAtivaId,
                lastUpdated: Date.now()
              };
            });
            setToast("Ficha mesclada via JSON com sucesso!");
            return;
          }
        }
        
        // Sanitize to avoid over-riding properties unnecessarily, but keeping it simple for now
        delete importedSheet.id; 
        delete importedSheet.editToken;

        setLoading(true);
        const res = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedSheet)
        });
        
        if (!res.ok) throw new Error('Erro ao importar ficha online.');
        const data = await res.json();
        
        // Update URL
        const newUrl = `${window.location.origin}${window.location.pathname}?id=${data.id}&token=${data.editToken}`;
        window.history.replaceState({}, '', newUrl);
        
        setSheet(data.sheet);
        setIsEditable(true);
        setLocalActiveFormId(data.sheet.formaAtivaId || 'base');
        setToast("Ficha importada via JSON com sucesso!");
      } catch (err: any) {
        setError("Erro ao ler JSON: " + (err.message || "Arquivo inválido"));
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    
    // Clear input
    e.target.value = '';
  };

  const handleImportPDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setToast("Lendo arquivo PDF...");
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;

        // 1. Try to load and parse AcroForm fields locally
        setToast("Analisando campos do PDF...");
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        let fieldData: Record<string, string> = {};
        let hasInteractiveFields = false;

        fields.forEach(field => {
          const name = field.getName();
          let value = '';
          
          if (field instanceof PDFTextField) {
            value = field.getText() || '';
          } else if (field instanceof PDFCheckBox) {
            value = field.isChecked() ? '/Sim' : '/Off';
          }
          
          if (value !== '') {
            hasInteractiveFields = true;
          }
          fieldData[name] = value;
        });

        let parsedData: any = null;

        // If it is fillable PDF, parse it locally
        if (hasInteractiveFields && (fieldData['Nome'] || Object.keys(fieldData).some(k => k.startsWith('Check Box')))) {
          setToast("Mapeando ficha preenchível localmente...");
          parsedData = parseSavageWorldsPDFFields(fieldData);
        } else {
          // Fallback to Gemini AI if it is a flat PDF
          setToast("PDF plano detectado. Interpretando texto com IA...");
          
          // Convert arrayBuffer to base64 string
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunk = 8192;
          for (let i = 0; i < bytes.byteLength; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
          }
          const base64String = window.btoa(binary);

          const res = await fetch('/api/sheets/parse-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64: base64String })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Este PDF não é preenchível e a IA não conseguiu processá-lo.');
          }

          parsedData = await res.json();
        }

        // Apply parsedData to sheet (Merge vs New Sheet)
        if (sheet && isEditable) {
          const choice = window.confirm(
            `Ficha do PDF interpretada com sucesso!\n\n` +
            `Personagem: ${parsedData.nomePersonagem || 'Sem nome'}\n` +
            `Conceito: ${parsedData.conceito || 'Sem conceito'}\n\n` +
            `Deseja MESCLAR/SUBSTITUIR as informações na ficha atual?\n` +
            `(Clique em CANCELAR para abrir em uma NOVA ficha separada)`
          );

          if (choice) {
            updateSheet(prev => {
              const updatedFormas = prev.formas.map(f => {
                if (f.formId === localActiveFormId) {
                  // Merge parsed data into active form
                  const incomingForm = parsedData.formas ? parsedData.formas[0] : parsedData;
                  return {
                    ...f,
                    atributos: incomingForm.atributos || f.atributos,
                    pericias: incomingForm.pericias || f.pericias,
                    vantagens: incomingForm.vantagens || f.vantagens,
                    complicacoes: incomingForm.complicacoes || f.complicacoes,
                    poderes: incomingForm.poderes || f.poderes,
                    armas: incomingForm.armas || f.armas,
                    apararMod: incomingForm.apararMod ?? f.apararMod,
                    resistenciaMod: incomingForm.resistenciaMod ?? f.resistenciaMod
                  };
                }
                return f;
              });

              return {
                ...prev,
                nomePersonagem: parsedData.nomePersonagem || prev.nomePersonagem,
                jogador: parsedData.jogador || prev.jogador,
                campanha: parsedData.campanha || prev.campanha,
                raca: parsedData.raca || prev.raca,
                conceito: parsedData.conceito || prev.conceito,
                aparencia: parsedData.aparencia || prev.aparencia,
                historia: parsedData.historia || prev.historia,
                equipamentoGeral: parsedData.equipamentoGeral || prev.equipamentoGeral,
                pesoCarregado: parsedData.pesoCarregado || prev.pesoCarregado,
                pesoLimite: parsedData.pesoLimite || prev.pesoLimite,
                benes: parsedData.benes ?? prev.benes,
                ferimentos: parsedData.ferimentos ?? prev.ferimentos,
                fadiga: parsedData.fadiga ?? prev.fadiga,
                xp: parsedData.xp ?? prev.xp,
                xpTrack: parsedData.xpTrack || prev.xpTrack,
                formas: updatedFormas,
                lastUpdated: Date.now()
              };
            });
            setToast("Ficha atualizada com os dados do PDF!");
            setLoading(false);
            return;
          }
        }

        // Create new sheet
        setToast("Criando nova ficha com os dados do PDF...");
        const newSheetData = createDefaultSheet(parsedData.nomePersonagem, parsedData.conceito);
        newSheetData.jogador = parsedData.jogador || newSheetData.jogador;
        newSheetData.campanha = parsedData.campanha || newSheetData.campanha;
        newSheetData.raca = parsedData.raca || newSheetData.raca;
        newSheetData.aparencia = parsedData.aparencia || newSheetData.aparencia;
        newSheetData.historia = parsedData.historia || newSheetData.historia;
        newSheetData.equipamentoGeral = parsedData.equipamentoGeral || newSheetData.equipamentoGeral;
        newSheetData.pesoCarregado = parsedData.pesoCarregado || newSheetData.pesoCarregado;
        newSheetData.pesoLimite = parsedData.pesoLimite || newSheetData.pesoLimite;
        newSheetData.benes = parsedData.benes ?? newSheetData.benes;
        newSheetData.ferimentos = parsedData.ferimentos ?? newSheetData.ferimentos;
        newSheetData.fadiga = parsedData.fadiga ?? newSheetData.fadiga;
        newSheetData.xp = parsedData.xp ?? newSheetData.xp;
        newSheetData.xpTrack = parsedData.xpTrack || newSheetData.xpTrack;

        const incomingForm = parsedData.formas ? parsedData.formas[0] : parsedData;
        if (newSheetData.formas[0]) {
          newSheetData.formas[0].atributos = incomingForm.atributos || newSheetData.formas[0].atributos;
          newSheetData.formas[0].pericias = incomingForm.pericias || newSheetData.formas[0].pericias;
          newSheetData.formas[0].vantagens = incomingForm.vantagens || newSheetData.formas[0].vantagens;
          newSheetData.formas[0].complicacoes = incomingForm.complicacoes || newSheetData.formas[0].complicacoes;
          newSheetData.formas[0].poderes = incomingForm.poderes || newSheetData.formas[0].poderes;
          newSheetData.formas[0].armas = incomingForm.armas || newSheetData.formas[0].armas;
          newSheetData.formas[0].apararMod = incomingForm.apararMod ?? newSheetData.formas[0].apararMod;
          newSheetData.formas[0].resistenciaMod = incomingForm.resistenciaMod ?? newSheetData.formas[0].resistenciaMod;
        }

        const createRes = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSheetData)
        });

        if (!createRes.ok) throw new Error('Erro ao salvar nova ficha criada do PDF.');
        const result = await createRes.json();

        // Update URL
        const newUrl = `${window.location.origin}${window.location.pathname}?id=${result.id}&token=${result.editToken}`;
        window.history.replaceState({}, '', newUrl);

        setSheet(result.sheet);
        setIsEditable(true);
        setLocalActiveFormId('base');
        setToast("Nova ficha importada via PDF com sucesso!");
      } catch (err: any) {
        console.error(err);
        setError("Erro ao interpretar PDF: " + (err.message || "Estrutura do arquivo não suportada."));
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);

    // Clear input
    e.target.value = '';
  };

  const handleDuplicate = async () => {
    if (!sheet) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/sheets/${sheet.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSheet(data.sheet);
        setIsEditable(true);
        setLocalActiveFormId(data.sheet.formaAtivaId);
        const newUrl = `${window.location.origin}${window.location.pathname}?id=${data.id}&token=${data.editToken}`;
        window.history.replaceState({}, '', newUrl);
        setToast('Ficha clonada com sucesso!');
      }
    } catch {
      setToast('Erro ao clonar ficha.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sheet) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    if (window.confirm(`Tem certeza absoluta de que deseja EXCLUIR permanentemente a ficha de "${sheet.nomePersonagem || 'Personagem'}"? Esta ação não pode ser desfeita.`)) {
      try {
        setLoading(true);
        const res = await fetch(`/api/sheets/${sheet.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editToken: token })
        });
        if (res.ok) {
          // Remove from local storage backup and list
          try {
            localStorage.removeItem(`savage_sheet_data_${sheet.id}`);
          } catch (err) {}
          setSavedSheets(prev => {
            const updated = prev.filter(s => s.id !== sheet.id);
            localStorage.setItem('savage_saved_sheets', JSON.stringify(updated));
            return updated;
          });
          
          setToast('Ficha excluída com sucesso!');
          setSheet(null);
          setIsEditable(true);
          
          // Clear URL query parameters
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, '', cleanUrl);
        } else {
          const data = await res.json().catch(() => ({}));
          setToast(`Erro ao excluir: ${data.error || 'Erro desconhecido'}`);
        }
      } catch (err) {
        setToast('Erro de conexão ao tentar excluir.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!sheet) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="flex flex-col items-center space-y-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
              <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
              <h3 className="text-lg font-serif font-bold text-amber-100 text-center">Processando Arquivo</h3>
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                {toast || "Carregando informações..."}
              </p>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                Isso pode levar alguns segundos usando a IA do Gemini
              </p>
            </div>
          </div>
        )}

        {isTempStorage && (
          <div className="mb-6 max-w-md w-full bg-red-955/40 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 text-red-300 text-xs shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-450 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-200">Modo Temporário (Sem Banco de Dados)</p>
              <p className="leading-relaxed text-slate-400">
                Esta aplicação está rodando sem banco de dados persistente. Fichas compartilhadas expiram após inatividade. Recomendamos baixar o <strong>JSON</strong> para salvar seu progresso, ou usar a restauração automática.
              </p>
            </div>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-2xl" />

          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 mb-1">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-serif text-amber-100 tracking-wide font-bold">
              Ficha Savage Worlds
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Crie e gerencie sua ficha de personagem interativa de forma simples e rápida, com suporte a fichas e estados alternativos. Totalmente responsivo para celulares.
            </p>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isCreatingNew && savedSheets.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-amber-500" />
                Continuar Aventura
              </h2>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {savedSheets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      fetchSheet(s.id, s.editToken);
                      const newUrl = `${window.location.origin}${window.location.pathname}?id=${s.id}&token=${s.editToken}`;
                      window.history.replaceState({}, '', newUrl);
                    }}
                    className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-sm"
                  >
                    <div className="flex-1 truncate">
                      <h3 className="text-base font-bold text-amber-100 truncate">{s.nomePersonagem || 'Desconhecido'}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{s.conceito || 'Sem conceito'}</p>
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500/0 group-hover:text-amber-400 transition-colors flex items-center shrink-0">
                      Abrir Ficha <Check className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80 flex flex-col gap-2">
                <button 
                  onClick={() => setIsCreatingNew(true)}
                  disabled={loading}
                  className="w-full font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 py-3 rounded-lg text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar Nova Ficha
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <label className="w-full font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    JSON
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                  <label className="w-full font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <FileText className="w-4 h-4 text-amber-500" />
                    PDF (IA)
                    <input type="file" accept=".pdf" onChange={handleImportPDF} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {savedSheets.length > 0 && (
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 mb-2 cursor-pointer transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Voltar para Minhas Fichas
                </button>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Personagem</label>
                <input 
                  type="text" 
                  placeholder="Ex: Arthur Pendragon" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Conceito do Personagem</label>
                <input 
                  type="text" 
                  placeholder="Ex: Guerreiro, Mago, Ladino, etc." 
                  value={newConcept}
                  onChange={e => setNewConcept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button 
                onClick={handleCreate}
                disabled={loading}
                className="w-full font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-lg text-sm tracking-wide transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Gerar Ficha Interativa
              </button>

              <div className="pt-4 mt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                <label className="w-full font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Importar JSON
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
                <label className="w-full font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-lg text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Importar PDF (IA)
                  <input type="file" accept=".pdf" onChange={handleImportPDF} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans selection:bg-amber-500 selection:text-slate-950">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="flex flex-col items-center space-y-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
            <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
            <h3 className="text-lg font-serif font-bold text-amber-100 text-center">Processando Arquivo</h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              {toast || "Carregando informações..."}
            </p>
            <p className="text-[10px] text-slate-500 text-center font-mono">
              Isso pode levar alguns segundos usando a IA do Gemini
            </p>
          </div>
        </div>
      )}
      
      {/* Sinc & Share Control Panel */}
      <div className="bg-slate-900/90 border-b border-slate-850 px-4 py-2 text-xs sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEditable ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold tracking-wider text-[10px] uppercase">
                <Unlock className="w-3 h-3" /> Proprietário (Editar)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider text-[10px] uppercase">
                <Lock className="w-3 h-3" /> Visualizador (Sinc)
              </span>
            )}
            <span className="text-slate-400 text-[11px] font-mono hidden sm:inline">
              Herói: <strong className="text-amber-100">{sheet.nomePersonagem}</strong>
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {isEditable && (
              <div className="text-[10px] sm:text-xs font-medium px-2 py-1 bg-slate-900/80 border border-slate-800 rounded-md select-none font-sans min-w-[120px] flex justify-center shadow-inner">
                {saveStatus === 'saving' && <span className="text-amber-400 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-400 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Salvo online</span>}
                {saveStatus === 'modified' && <span className="text-slate-400 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Pendente...</span>}
              </div>
            )}
            
            {savedSheets.length > 0 && (
              <button onClick={() => setShowSavedList(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded transition text-[11px] cursor-pointer shadow flex items-center print:hidden">
                <History className="w-3.5 h-3.5 mr-1" /> Minhas Fichas
              </button>
            )}

            <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-slate-300 transition text-[11px] cursor-pointer print:hidden" title="Imprimir PDF">
              <Printer className="w-3 h-3 inline mr-1" /> Imprimir
            </button>
            
            <button onClick={handleExportJSON} className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-slate-300 transition text-[11px] cursor-pointer print:hidden" title="Exportar para JSON">
              <Download className="w-3 h-3 inline mr-1" /> Salvar JSON
            </button>

            <button onClick={handleShareLink} className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-amber-200 transition text-[11px] cursor-pointer print:hidden" title="Cópia para o Mestre">
              <Share2 className="w-3 h-3 inline mr-1" /> Partilhar Leitura
            </button>

            {isEditable && (
              <>
                <label className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-amber-200 transition text-[11px] cursor-pointer print:hidden flex items-center gap-1" title="Importar dados de um PDF de Ficha">
                  <FileText className="w-3 h-3 inline" /> Importar PDF
                  <input type="file" accept=".pdf" onChange={handleImportPDF} className="hidden" />
                </label>
                <label className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-slate-350 transition text-[11px] cursor-pointer print:hidden flex items-center gap-1" title="Importar dados de um arquivo JSON">
                  <Upload className="w-3 h-3 inline" /> Importar JSON
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
                <button onClick={handleEditorLink} className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-emerald-300 transition text-[11px] cursor-pointer print:hidden" title="Guarde este link privado">
                  <Lock className="w-3 h-3 inline mr-1" /> Salvar Link Editor
                </button>
                <button onClick={handleDelete} className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/35 font-semibold px-2.5 py-1 rounded text-red-300 transition text-[11px] cursor-pointer print:hidden flex items-center gap-1" title="Excluir esta ficha permanentemente">
                  <Trash2 className="w-3 h-3 inline" /> Excluir Ficha
                </button>
              </>
            )}

            <button onClick={handleDuplicate} className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-slate-300 transition text-[11px] cursor-pointer">
              <Copy className="w-3 h-3 inline mr-1" /> Clonar Ficha
            </button>
          </div>
        </div>
      </div>

      {copiedLink && (
        <div className="bg-amber-500 text-slate-950 text-center py-1.5 text-xs font-mono font-bold">
          Link copiado com sucesso! Guarde-o do seu lado.
        </div>
      )}

      {isTempStorage && (
        <div className="bg-red-950/30 border-b border-red-500/10 py-2.5 px-4 text-xs">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-red-300">
            <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
            <div className="flex-1 md:flex md:items-center md:justify-between gap-4">
              <p className="leading-relaxed">
                <strong>Atenção:</strong> Esta aplicação está rodando em armazenamento temporário. Fichas compartilhadas expiram após inatividade. Recomendamos baixar e salvar o arquivo <strong>JSON</strong> localmente.
              </p>
              <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider shrink-0 block mt-1 md:mt-0 max-w-fit">
                Sem Persistência
              </span>
            </div>
          </div>
        </div>
      )}

      <header className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Backdrop style character background image */}
          {activeForm?.tokenStyle === 'backdrop' && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img 
                src={getActiveFormImage()} 
                alt="Fundo do Personagem"
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${activeForm?.tokenScale ?? 1.1}) translateY(${(activeForm?.tokenOffsetY ?? 0) * 1.2}px)`,
                }}
                className="w-full h-full object-cover opacity-35 filter blur-[1px] transition-all duration-150"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/85 to-slate-900/40" />
            </div>
          )}

          <div className="absolute right-0 top-0 opacity-5 pointer-events-none translate-x-12 -translate-y-12 z-0">
            <Sword className="w-56 h-56 text-amber-500" />
          </div>

          <div className="w-full flex flex-col md:flex-row items-center gap-5 z-10">
            {/* Avatar upload / change area */}
            <div className="flex flex-col items-center gap-2.5 shrink-0 z-10 relative">
              {/* Token/Card Display Container */}
              {activeForm?.tokenStyle !== 'backdrop' && (
                <div className="relative group">
                  <div className={`${
                    activeForm?.tokenStyle === 'card' 
                      ? 'w-32 h-44 rounded-xl' 
                      : 'w-28 h-28 rounded-full'
                  } overflow-hidden relative shadow-lg bg-slate-950 transition-all duration-300 ${
                    activeForm?.tokenBorder ? getTokenFrameClass(activeForm.tokenBorder, activeForm?.tokenStyle === 'card') : 'border-4 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  }`}>
                    <img 
                      src={getActiveFormImage()} 
                      alt="Token do Personagem"
                      referrerPolicy="no-referrer"
                      style={{
                        transform: `scale(${activeForm?.tokenScale ?? 1}) translateY(${activeForm?.tokenOffsetY ?? 0}px)`,
                      }}
                      className="w-full h-full object-cover transition-all duration-150" 
                    />
                    
                    {/* Hover edit trigger button overlay */}
                    {isEditable && (
                      <button 
                        onClick={() => setShowImageConfig(true)}
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-[2px]"
                        title="Configurar Aparência"
                      >
                        <span className="bg-amber-500 text-slate-950 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-md scale-90 group-hover:scale-100 transition-transform duration-200">
                          <Camera className="w-3 h-3" /> Editar
                        </span>
                      </button>
                    )}
                  </div>
                  
                  {/* Small edit trigger for touch screens where hover isn't natural */}
                  {isEditable && (
                    <button 
                      onClick={() => setShowImageConfig(true)}
                      className="absolute -bottom-1 -right-1 md:hidden p-1.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400 shadow-md cursor-pointer"
                      title="Editar Retrato"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Customize background portrait trigger button (Only for backdrop style) */}
              {activeForm?.tokenStyle === 'backdrop' && isEditable && (
                <button
                  onClick={() => setShowImageConfig(true)}
                  className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-amber-200 font-bold px-3 py-1.5 rounded-lg transition-all text-[11px] cursor-pointer flex items-center gap-1.5 shadow-md"
                  title="Configurar Imagem de Fundo"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-500" /> Aparência de Fundo
                </button>
              )}

              {localActiveFormId !== 'base' && (!activeForm?.imageUrl || activeForm.imageUrl.trim() === '') && (
                <span className="text-[9px] text-amber-200 bg-amber-950/45 px-2 py-0.5 rounded border border-amber-900/40 font-sans font-medium text-center">
                  Usando foto herdada da Base
                </span>
              )}
            </div>

            <div className="w-full text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <input 
                  type="text" 
                  disabled={!isEditable}
                  placeholder="Nome do Personagem"
                  value={sheet.nomePersonagem}
                  onChange={e => updateSheet(prev => ({ ...prev, nomePersonagem: e.target.value }))}
                  style={{ textShadow: activeForm?.tokenStyle === 'backdrop' ? '0 2px 4px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)' : undefined }}
                  className="bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-xl font-serif font-bold text-amber-100 w-full text-center md:text-left"
                />
              </div>

              {/* Editable header details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-xs">
                {([
                  { label: 'Jogador', key: 'jogador' as const },
                  { label: 'Conceito', key: 'conceito' as const },
                  { label: 'Raça', key: 'raca' as const },
                  { label: 'Campanha', key: 'campanha' as const }
                ]).map(field => (
                  <div 
                    key={field.key} 
                    className={`p-2 rounded-lg border transition-all duration-300 ${
                      activeForm?.tokenStyle === 'backdrop' 
                        ? 'bg-slate-950/70 border-slate-800/80 backdrop-blur-md shadow-md' 
                        : 'bg-slate-950/40 border-slate-850'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-500 font-bold">{field.label}</span>
                    <input 
                      type="text" 
                      disabled={!isEditable}
                      value={sheet[field.key]}
                      onChange={e => updateSheet(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="bg-transparent w-full font-semibold focus:outline-none focus:border-b focus:border-amber-500 mt-0.5 text-slate-200 text-center md:text-left"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic / Expandable Weapon Forms Selector Bar */}
      <section className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-serif font-bold text-amber-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" /> Fichas e Estados Alternativos
              </h2>
              <p className="text-[11px] text-slate-400">
                Altere e gerencie fichas adicionais para estados alternativos, mechas, montarias, veículos ou transformações.
              </p>
            </div>

            {/* Forms select list and Add form button */}
            <div className="flex flex-wrap items-center gap-2">
              {sheet.formas.map((form) => {
                const isActive = localActiveFormId === form.formId;
                return (
                  <div key={form.formId} className="flex items-center gap-0.5 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => {
                        if (isEditable) {
                          updateSheet(prev => ({ ...prev, formaAtivaId: form.formId }));
                        } else {
                          setLocalActiveFormId(form.formId);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive 
                          ? 'bg-amber-500 text-slate-950 shadow-md scale-105' 
                          : 'bg-transparent text-slate-300 hover:text-white'
                      }`}
                    >
                      <Sword className="w-3 h-3" />
                      {form.nomeForma}
                    </button>
                    
                    {isEditable && form.formId !== 'base' && (
                      <button 
                        onClick={() => handleDeleteForm(form.formId)} 
                        className="p-1.5 text-slate-500 hover:text-red-400 transition"
                        title={`Remover ${form.nomeForma}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {isEditable && (
                <button 
                  onClick={() => setIsAddingForm(!isAddingForm)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-755 text-amber-300 border border-slate-700/50 flex items-center gap-1 cursor-pointer font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Ficha
                </button>
              )}
            </div>
          </div>

          {/* Form Creator UI */}
          {isEditable && isAddingForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
            >
              <h3 className="text-xs font-bold text-amber-200">Adicionar Nova Ficha / Estado</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">Nome da Nova Ficha / Estado</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Armadura Pesada, Modos, etc." 
                    value={newFormName}
                    onChange={e => setNewFormName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 font-sans">Copiar Conteúdo de outra ficha</label>
                  <select 
                    value={copyFormContentId} 
                    onChange={e => setCopyFormContentId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    {sheet.formas.map(f => (
                      <option key={f.formId} value={f.formId}>{f.nomeForma}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button 
                    onClick={handleCreateNewForm}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 rounded text-xs transition"
                  >
                    Criar Ficha
                  </button>
                  <button 
                    onClick={() => setIsAddingForm(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs border border-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isEditable && localActiveFormId !== 'base' && (
            <div className="bg-amber-500/10 p-2 rounded-lg text-[11px] text-amber-300 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 leading-relaxed">
              <span>
                <Unlock className="w-3.5 h-3.5 inline mr-1" />
                Deseja herdar dados das estatísticas? Você pode copiar as vantagens, perícias e atributos da Ficha Base para este estado alternativo instantaneamente.
              </span>
              <button 
                onClick={handleCopyBaseToActive}
                className="bg-slate-900 overflow-hidden hover:bg-slate-850 border border-slate-800 rounded text-[9px] font-bold text-amber-400 px-2.5 py-1 shrink-0 uppercase tracking-widest cursor-pointer"
              >
                Herdar da Base
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Container Grid and Mode Selectors */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Layout Control Tab Switchers (Desktop View Mode vs Mobile Tab Mode) */}
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setViewMode('tabs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${viewMode === 'tabs' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Abas Focadas (Celular)
            </button>
            <button 
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${viewMode === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Visão Completa
            </button>
          </div>

          <p className="text-[10px] text-slate-500 hidden md:inline-block font-mono">
            *Dica: Visualização de abas é perfeita para telas pequenas de smartphones.
          </p>
        </div>

        {/* Mobile / Tabs navigation menu */}
        {viewMode === 'tabs' && (
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 mb-6 gap-1 select-none overflow-x-auto scroller-hidden print:hidden">
            <button 
              onClick={() => setActiveTab('status')}
              className={`flex-1 min-w-[70px] text-center py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'status' ? 'bg-slate-950 text-amber-400 border border-slate-800/80 shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Shield className="w-3.5 h-3.5" />
              Status
            </button>
            <button 
              onClick={() => setActiveTab('pericias')}
              className={`flex-1 min-w-[70px] text-center py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'pericias' ? 'bg-slate-950 text-amber-400 border border-slate-800/80 shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Check className="w-3.5 h-3.5" />
              Perícias
            </button>
            <button 
              onClick={() => setActiveTab('combate')}
              className={`flex-1 min-w-[70px] text-center py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'combate' ? 'bg-slate-950 text-amber-400 border border-slate-800/80 shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Sword className="w-3.5 h-3.5" />
              Combates
            </button>
            <button 
              onClick={() => setActiveTab('global')}
              className={`flex-1 min-w-[70px] text-center py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'global' ? 'bg-slate-950 text-amber-400 border border-slate-800/80 shadow-inner' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <History className="w-3.5 h-3.5" />
              Biografia
            </button>
          </div>
        )}

        {/* Main Render Area */}
        {activeForm && (
          <div className={`grid grid-cols-1 ${viewMode === 'all' ? 'lg:grid-cols-12 gap-6' : 'space-y-6'} print:flex print:flex-col print:space-y-6 print:gap-0`}>
            
            {/* 1. STATUS & ATRIBUTOS SECTION (Span 4) */}
            <div className={`${viewMode === 'all' ? 'lg:col-span-4 space-y-6' : activeTab === 'status' ? 'block space-y-6' : 'hidden print:block'}`}>
              
              {/* PENALTIES & TRACKS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-serif font-bold text-amber-250 border-b border-slate-850 pb-2.5 flex items-center justify-between pl-2.5 border-l-2 border-amber-500">
                  <span>Modificadores e Ferimentos</span>
                  <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Mod Penal: {getPenalties()}
                  </span>
                </h3>

                {/* Ferimentos */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Skull className="w-3.5 h-3.5 text-red-500" /> Ferimentos (Max 3)
                    </span>
                    <span className="font-mono text-amber-300">-{Math.min(sheet.ferimentos, 3)} nas jogadas</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((val) => {
                      const isActive = sheet.ferimentos >= val;
                      return (
                        <button
                          key={val}
                          disabled={!isEditable}
                          onClick={() => updateSheet(prev => ({ ...prev, ferimentos: val }))}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                            isActive 
                              ? val === 0 
                                ? 'bg-gradient-to-r from-emerald-600/20 to-emerald-500/25 border-emerald-500/60 text-emerald-300 font-extrabold shadow-md shadow-emerald-500/5' 
                                : 'bg-gradient-to-r from-red-650 to-red-550 border-red-450 text-white font-extrabold shadow-lg shadow-red-500/30 scale-102'
                              : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800 hover:text-slate-350'
                          }`}
                        >
                          {val === 0 ? 'ILeso' : `${val}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fadiga */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Feather className="w-3.5 h-3.5 text-amber-500" /> Fadiga (Max 2)
                    </span>
                    <span className="font-mono text-amber-300">-{Math.min(sheet.fadiga, 2)} nas jogadas</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((val) => {
                      const isActive = sheet.fadiga >= val;
                      return (
                        <button
                          key={val}
                          disabled={!isEditable}
                          onClick={() => updateSheet(prev => ({ ...prev, fadiga: val }))}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                            isActive 
                              ? val === 0 
                                ? 'bg-gradient-to-r from-emerald-600/20 to-emerald-500/25 border-emerald-500/60 text-emerald-300 font-extrabold shadow-md shadow-emerald-500/5' 
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-450 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 scale-102'
                              : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-850 hover:text-slate-350'
                          }`}
                        >
                          {val === 0 ? 'Firme' : `${val}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SAVAGE ATTRIBUTES */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-850 pb-2">
                  Atributos da Forma ({activeForm.nomeForma})
                </h3>

                <div className="space-y-4">
                  {(['Agilidade', 'Astúcia', 'Espírito', 'Força', 'Vigor'] as AttributeKey[]).map((attr) => {
                    const attrData = activeForm.atributos[attr] || { dado: 'd6', mod: 0 };
                    
                    return (
                      <div key={attr} className="space-y-1.5 pb-3 border-b border-slate-850/30 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">{attr}</span>
                            {/* Visual die pips for Attributes */}
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((level) => {
                                const dieLevels = ['d4', 'd6', 'd8', 'd10', 'd12'];
                                const currentLevelIndex = dieLevels.indexOf(attrData.dado) + 1;
                                const active = level <= currentLevelIndex;
                                return (
                                  <div 
                                    key={level} 
                                    className={`h-0.5 rounded-sm w-3.5 transition-colors duration-300 ${
                                      active 
                                        ? 'bg-amber-500 shadow-sm shadow-amber-500/50' 
                                        : 'bg-slate-850'
                                    }`} 
                                  />
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Mod value */}
                          <div className="flex items-center gap-1.5">
                            {isEditable ? (
                              <div className="flex items-center bg-slate-950 rounded px-1.5 py-0.5 text-[10px] border border-slate-850 focus-within:border-amber-500/50 transition-colors">
                                <span className="text-[9px] text-slate-500 mr-1 uppercase font-bold">Mod:</span>
                                <input 
                                  type="number"
                                  value={attrData.mod}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateActiveForm(form => {
                                      const nextAttrs = { ...form.atributos };
                                      nextAttrs[attr] = { ...nextAttrs[attr], mod: val };
                                      return { ...form, atributos: nextAttrs };
                                    });
                                  }}
                                  className="w-7 bg-transparent text-center font-bold text-amber-400 focus:outline-none text-xs"
                                />
                              </div>
                            ) : (
                              attrData.mod !== 0 && (
                                <span className="bg-slate-950 font-mono text-[11px] px-1.5 rounded text-amber-400 font-bold border border-slate-800">
                                  {attrData.mod > 0 ? `+${attrData.mod}` : attrData.mod}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {/* Attribute Dice levels */}
                        <div className="grid grid-cols-5 gap-1 mt-1.5">
                          {(['d4', 'd6', 'd8', 'd10', 'd12'] as const).map((die) => {
                            const isSelected = attrData.dado === die;
                            return (
                              <button
                                key={die}
                                disabled={!isEditable}
                                onClick={() => {
                                  updateActiveForm(form => {
                                    const nextAttrs = { ...form.atributos };
                                    nextAttrs[attr] = { ...nextAttrs[attr], dado: die };
                                    return { ...form, atributos: nextAttrs };
                                  });
                                }}
                                className={`py-1 text-center font-mono font-bold text-[10px] rounded transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-400 text-slate-950 font-extrabold shadow-md shadow-amber-500/10 scale-105' 
                                    : 'bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-500 hover:text-slate-350'
                                }`}
                              >
                                {die}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PARRIES & TOUGHNESS BOX */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-serif font-bold text-amber-250 border-b border-slate-850 pb-2.5 pl-2.5 border-l-2 border-amber-500">
                  Estatísticas de Resiliência
                </h3>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/10 hover:border-amber-500/30 transition-all duration-300 text-center space-y-1.5 relative group shadow-inner">
                    <div className="flex justify-center text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.2)]"><Shield className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" /></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Aparar</span>
                    <span className="text-3xl font-serif font-extrabold text-amber-400 block drop-shadow-[0_0_6px_rgba(245,158,11,0.25)]">{getParry(activeForm)}</span>
                    <span className="text-[9px] text-slate-500 block font-mono">½ dLutar + 2 {activeForm.apararMod !== 0 && `(${activeForm.apararMod > 0 ? '+' : ''}${activeForm.apararMod})`}</span>
                    {isEditable && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 border-t border-slate-900/60 pt-2">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Ajuste:</span>
                        <input 
                          type="number" 
                          value={activeForm.apararMod}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updateActiveForm(form => ({ ...form, apararMod: val }));
                          }}
                          className="w-8 text-center bg-slate-900 border border-slate-800 text-[10px] text-amber-400 font-bold rounded py-0.5 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-red-500/10 hover:border-red-500/30 transition-all duration-300 text-center space-y-1.5 relative group shadow-inner">
                    <div className="flex justify-center text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.2)]"><Heart className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" /></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Resistência</span>
                    <span className="text-3xl font-serif font-extrabold text-red-400 block drop-shadow-[0_0_6px_rgba(239,68,68,0.25)]">{getToughness(activeForm)}</span>
                    <span className="text-[9px] text-slate-500 block font-mono">½ dVigor + 2 {activeForm.resistenciaMod !== 0 && `(${activeForm.resistenciaMod > 0 ? '+' : ''}${activeForm.resistenciaMod})`}</span>
                    {isEditable && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 border-t border-slate-900/60 pt-2">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Ajuste:</span>
                        <input 
                          type="number" 
                          value={activeForm.resistenciaMod}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updateActiveForm(form => ({ ...form, resistenciaMod: val }));
                          }}
                          className="w-8 text-center bg-slate-900 border border-slate-800 text-[10px] text-amber-400 font-bold rounded py-0.5 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850/80 space-y-2 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Bênes (Rerolls)</span>
                    <div className="flex items-center gap-1">
                      {isEditable && (
                        <button onClick={() => updateSheet(prev => ({ ...prev, benes: Math.max(0, prev.benes - 1) }))} className="bg-slate-800 w-5 h-5 rounded hover:bg-slate-700 font-bold cursor-pointer">-</button>
                      )}
                      <span className="px-2 text-amber-400 font-bold font-mono text-center">{sheet.benes}</span>
                      {isEditable && (
                        <button onClick={() => updateSheet(prev => ({ ...prev, benes: prev.benes + 1 }))} className="bg-slate-800 w-5 h-5 rounded hover:bg-slate-700 font-bold cursor-pointer">+</button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-900">
                    <span className="text-slate-400">XP Atual / Estágio</span>
                    <div className="flex items-center gap-1.5">
                      {isEditable && (
                        <button onClick={() => updateSheet(prev => {
                          const nXp = Math.max(0, prev.xp - 5);
                          return { ...prev, xp: nXp, xpTrack: nXp >= 80 ? 'Lendário' : nXp >= 60 ? 'Heroico' : nXp >= 40 ? 'Veterano' : nXp >= 20 ? 'Experiente' : 'Novato' };
                        })} className="bg-slate-800 w-4 h-4 rounded text-[10px] font-bold cursor-pointer">-</button>
                      )}
                      <span className="font-bold text-amber-200 font-mono">{sheet.xp}xp ({sheet.xpTrack})</span>
                      {isEditable && (
                        <button onClick={() => updateSheet(prev => {
                          const nXp = prev.xp + 5;
                          return { ...prev, xp: nXp, xpTrack: nXp >= 80 ? 'Lendário' : nXp >= 60 ? 'Heroico' : nXp >= 40 ? 'Veterano' : nXp >= 20 ? 'Experiente' : 'Novato' };
                        })} className="bg-slate-800 w-4 h-4 rounded text-[10px] font-bold cursor-pointer">+</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* 2. DYNAMIC SKILLS GRID SECTION (Span 8 in All View Mode) */}
            <div className={`${viewMode === 'all' ? 'lg:col-span-8 space-y-6' : activeTab === 'pericias' ? 'block space-y-6' : 'hidden print:block'}`}>
              
              {/* SKILLS CONTAINER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-850 pb-3 gap-2">
                  <h3 className="text-xs font-serif font-bold text-amber-200 flex items-center gap-1.5">
                    <Sword className="w-3.5 h-3.5 text-amber-500" /> Gráfico de Perícias Treinadas ({activeForm.nomeForma})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Modificados globais se aplicam instantaneamente</span>
                </div>

                {/* SKILLS CARDS (highly optimized for both small and large viewports) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeForm.pericias.map((skill, index) => {
                    const isCustom = !INITIAL_SKILLS.some(initial => initial.nome === skill.nome);
                    return (
                      <div 
                        key={skill.nome}
                        onClick={() => {
                          if (isEditable) {
                            updateActiveForm(form => {
                              const list = [...form.pericias];
                              list[index] = { ...list[index], possui: !skill.possui };
                              return { ...form, pericias: list };
                            });
                          }
                        }}
                        className={`p-3 px-4 rounded-xl border flex items-center justify-between transition-all duration-305 select-none cursor-pointer ${
                          skill.possui 
                            ? 'bg-slate-900/90 border-amber-500/20 shadow-md shadow-amber-500/5 hover:border-amber-500/40 hover:shadow-amber-500/10' 
                            : 'bg-slate-950/20 border-slate-900/60 text-slate-500 opacity-60 hover:opacity-85 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isEditable ? (
                            <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-all ${
                              skill.possui 
                                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm shadow-amber-500/30' 
                                : 'border-slate-850 bg-slate-950'
                            }`}>
                              {skill.possui && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                            </div>
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${skill.possui ? 'bg-amber-400 shadow shadow-amber-400/80 animate-pulse' : 'bg-slate-800'}`} />
                          )}
                          
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold transition-colors ${skill.possui ? 'text-amber-100' : 'text-slate-500'}`}>
                              {skill.nome}
                              <span className="text-[9px] text-slate-500 font-normal ml-1">({skill.atributoAssociado.substring(0, 3)})</span>
                            </span>
                            
                            {/* Visual die pips representing skill training tier */}
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((level) => {
                                const dieLevels = ['d4', 'd6', 'd8', 'd10', 'd12'];
                                const currentLevelIndex = dieLevels.indexOf(skill.dado) + 1;
                                const active = skill.possui && level <= currentLevelIndex;
                                return (
                                  <div 
                                    key={level} 
                                    className={`h-0.5 rounded-sm w-3.5 transition-colors duration-300 ${
                                      active 
                                        ? 'bg-amber-500 shadow-sm shadow-amber-500/50' 
                                        : 'bg-slate-850'
                                    }`} 
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Die / Value setup */}
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {skill.possui ? (
                            isEditable ? (
                              <>
                                <select 
                                  value={skill.dado} 
                                  onChange={e => {
                                    const nextd = e.target.value as any;
                                    updateActiveForm(form => {
                                      const list = [...form.pericias];
                                      list[index] = { ...list[index], dado: nextd };
                                      return { ...form, pericias: list };
                                    });
                                  }}
                                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-amber-400 font-bold rounded py-0.5 px-1.5 focus:outline-none cursor-pointer"
                                >
                                  {['d4', 'd6', 'd8', 'd10', 'd12'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                
                                <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-amber-500 font-bold">
                                  <span>+</span>
                                  <input 
                                    type="number" 
                                    value={skill.mod}
                                    onChange={e => {
                                      const nextm = parseInt(e.target.value) || 0;
                                      updateActiveForm(form => {
                                        const list = [...form.pericias];
                                        list[index] = { ...list[index], mod: nextm };
                                        return { ...form, pericias: list };
                                      });
                                    }}
                                    className="w-5 bg-transparent text-center focus:outline-none text-[10px] text-amber-400 font-bold"
                                  />
                                </div>
                              </>
                            ) : (
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {skill.dado}{skill.mod !== 0 && ` ${skill.mod > 0 ? '+' : ''}${skill.mod}`}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] italic text-slate-650">Não treinado (d4-2)</span>
                          )}

                          {isEditable && isCustom && (
                            <button 
                              onClick={() => handleRemoveCustomSkill(skill.nome)}
                              className="p-1 hover:text-red-400 text-slate-500 transition ml-1 cursor-pointer"
                              title="Deletar perícia personalizada"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* EXPANDABLE / NEW SKILL ADDER SECTION */}
                {isEditable && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 mt-4">
                    <h4 className="text-[10px] text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-amber-500" /> Adicionar Perícia Personalizada
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Sinta-se livre para registrar perícias exóticas da campanha (ex: Pilotar dragão, conjurar runas, etc).
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 align-end items-end">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Nome da Perícia</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Armadilhas"
                          value={newSkillName}
                          onChange={e => setNewSkillName(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded p-1.5 w-full text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Atributo Par</label>
                        <select 
                          value={newSkillAttr}
                          onChange={e => setNewSkillAttr(e.target.value as AttributeKey)}
                          className="bg-slate-900 border border-slate-800 text-slate-350 rounded p-1.5 w-full text-xs focus:outline-none"
                        >
                          {['Agilidade', 'Astúcia', 'Espírito', 'Força', 'Vigor'].map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Dado Inicial</label>
                        <select 
                          value={newSkillDie}
                          onChange={e => setNewSkillDie(e.target.value as any)}
                          className="bg-slate-900 border border-slate-800 text-slate-350 rounded p-1.5 w-full text-xs focus:outline-none"
                        >
                          {['d4', 'd6', 'd8', 'd10', 'd12'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <button 
                          onClick={handleAddCustomSkill}
                          className="w-full bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold py-1.5 rounded text-xs border border-slate-700 transition"
                        >
                          Inserir Perícia
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VANTAGENS TEMPORAIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl space-y-3 shadow-sm">
                  <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-850 pb-1.5">
                    Vantagens Ativas na Forma
                  </h3>
                  <textarea 
                    disabled={!isEditable} 
                    value={activeForm.vantagens} 
                    onChange={e => {
                      const txt = e.target.value;
                      updateActiveForm(form => ({ ...form, vantagens: txt }));
                    }}
                    placeholder="Adicione benefícios particulares que o herói ganha ao empunhar essa arma ativa..."
                    className="w-full bg-slate-950 text-xs text-slate-300 rounded border border-slate-850 p-2.5 min-h-[90px] focus:outline-none focus:border-amber-500 font-sans leading-relaxed" 
                  />
                </div>

                <div className="bg-slate-900 p-4 border border-slate-800 rounded-2xl space-y-3 shadow-sm">
                  <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-850 pb-1.5">
                    Complicações da Forma
                  </h3>
                  <textarea 
                    disabled={!isEditable} 
                    value={activeForm.complicacoes} 
                    onChange={e => {
                      const txt = e.target.value;
                      updateActiveForm(form => ({ ...form, complicacoes: txt }));
                    }}
                    placeholder="Efeitos nocivos, fraquezas, debilidades ou limitações associadas a este estado..."
                    className="w-full bg-slate-950 text-xs text-slate-300 rounded border border-slate-850 p-2.5 min-h-[90px] focus:outline-none focus:border-amber-500 font-sans leading-relaxed" 
                  />
                </div>
              </div>

            </div>

            {/* 3. COMBATE & ARMOR SECTION (Span 8 in All View Mode) */}
            <div className={`${viewMode === 'all' ? 'lg:col-span-8 space-y-6' : activeTab === 'combate' ? 'block space-y-6' : 'hidden print:block'}`}>
              
              {/* ARMAMENT / WEAPONS LIST */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <h3 className="text-xs font-serif font-bold text-amber-200 flex items-center gap-1.5">
                    <Sword className="w-4 h-4 text-amber-500 animate-pulse" /> Armas de Ataques ({activeForm.nomeForma})
                  </h3>
                  
                  {isEditable && (
                    <button 
                      onClick={handleAddWeapon}
                      className="bg-slate-800 hover:bg-slate-750 text-[10px] text-amber-400 font-bold px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition border border-slate-700/50"
                    >
                      <Plus className="w-3 h-3" /> Nova Arma
                    </button>
                  )}
                </div>

                {/* Mobile Responsive Weapons layout: lists as grid cards on mobile, tables on tablets/desktops */}
                <div className="block lg:hidden space-y-3">
                  {activeForm.armas.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 italic py-4">Nenhuma arma sintonizada. Defenda-se com as mãos!</p>
                  ) : (
                    activeForm.armas.map((weapon, index) => (
                      <div key={weapon.id} className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2.5 relative">
                        {isEditable && (
                          <button 
                            onClick={() => {
                              updateActiveForm(form => ({ ...form, armas: form.armas.filter(w => w.id !== weapon.id) }));
                            }}
                            className="absolute right-3 top-3 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="space-y-1.5">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">Arma / Nome</span>
                          <input 
                            type="text" 
                            disabled={!isEditable}
                            value={weapon.nome} 
                            onChange={e => {
                              const v = e.target.value;
                              updateActiveForm(form => {
                                const list = [...form.armas];
                                list[index] = { ...list[index], nome: v };
                                return { ...form, armas: list };
                              });
                            }}
                            className="bg-transparent text-amber-100 font-bold font-serif focus:outline-none focus:border-b focus:border-amber-500 w-[80%] text-xs" 
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div>
                            <span className="text-[8px] text-slate-500 block uppercase font-bold">Dano</span>
                            <input 
                              type="text" 
                              disabled={!isEditable}
                              value={weapon.dano} 
                              onChange={e => {
                                const v = e.target.value;
                                updateActiveForm(form => {
                                  const list = [...form.armas];
                                  list[index] = { ...list[index], dano: v };
                                  return { ...form, armas: list };
                                });
                              }}
                              className="bg-transparent font-mono text-slate-200 mt-0.5 focus:outline-none w-full border-b border-transparent focus:border-slate-800" 
                            />
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block uppercase font-bold">Alcance</span>
                            <input 
                              type="text" 
                              disabled={!isEditable}
                              value={weapon.alcance} 
                              onChange={e => {
                                const v = e.target.value;
                                updateActiveForm(form => {
                                  const list = [...form.armas];
                                  list[index] = { ...list[index], alcance: v };
                                  return { ...form, armas: list };
                                });
                              }}
                              className="bg-transparent text-slate-200 mt-0.5 focus:outline-none w-full border-b border-transparent focus:border-slate-800" 
                            />
                          </div>
                          <div className="text-center">
                            <span className="text-[8px] text-slate-500 block uppercase font-bold text-center">CdT</span>
                            <input 
                              type="text" 
                              disabled={!isEditable}
                              value={weapon.cdt} 
                              onChange={e => {
                                const v = e.target.value;
                                updateActiveForm(form => {
                                  const list = [...form.armas];
                                  list[index] = { ...list[index], cdt: v };
                                  return { ...form, armas: list };
                                });
                              }}
                              className="bg-transparent text-center text-slate-200 mt-0.5 focus:outline-none w-full border-b border-transparent focus:border-slate-800" 
                            />
                          </div>
                          <div className="text-center">
                            <span className="text-[8px] text-slate-500 block uppercase font-bold text-center">PA</span>
                            <input 
                              type="text" 
                              disabled={!isEditable}
                              value={weapon.pa} 
                              onChange={e => {
                                const v = e.target.value;
                                updateActiveForm(form => {
                                  const list = [...form.armas];
                                  list[index] = { ...list[index], pa: v };
                                  return { ...form, armas: list };
                                });
                              }}
                              className="bg-transparent text-center text-slate-200 mt-0.5 focus:outline-none w-full border-b border-transparent focus:border-slate-800" 
                            />
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block uppercase font-bold">Peso</span>
                            <input 
                              type="text" 
                              disabled={!isEditable}
                              value={weapon.peso} 
                              onChange={e => {
                                const v = e.target.value;
                                updateActiveForm(form => {
                                  const list = [...form.armas];
                                  list[index] = { ...list[index], peso: v };
                                  return { ...form, armas: list };
                                });
                              }}
                              className="bg-transparent text-slate-200 mt-0.5 focus:outline-none w-full border-b border-transparent focus:border-slate-800" 
                            />
                          </div>
                        </div>

                        <div className="space-y-0.5 pt-1 border-t border-slate-900 border-dashed">
                          <span className="block text-[8px] text-slate-650 uppercase font-bold">Anotações</span>
                          <input 
                            type="text" 
                            disabled={!isEditable}
                            placeholder="Anote regras especiais da arma..."
                            value={weapon.observacoes} 
                            onChange={e => {
                              const v = e.target.value;
                              updateActiveForm(form => {
                                const list = [...form.armas];
                                list[index] = { ...list[index], observacoes: v };
                                return { ...form, armas: list };
                              });
                            }}
                            className="bg-transparent text-slate-350 focus:outline-none text-[11px] w-full" 
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop layout for Weapons (Tidy table) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs leading-none">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                        <th className="py-2 pr-2">Arma / Recurso</th>
                        <th className="py-2 px-2">Dano</th>
                        <th className="py-2 px-2">Alcance</th>
                        <th className="py-2 px-2 text-center">CdT</th>
                        <th className="py-2 px-2 text-center">PA</th>
                        <th className="py-2 px-2">Peso</th>
                        <th className="py-2 px-2">Anotações</th>
                        {isEditable && <th className="py-2 pl-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeForm.armas.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-slate-500 italic">Lista de armas vazia nesta forma.</td>
                        </tr>
                      ) : (
                        activeForm.armas.map((weapon, index) => (
                          <tr key={weapon.id} className="border-b border-slate-900 last:border-0 hover:bg-slate-950/25">
                            <td className="py-2.5 pr-2 font-bold font-serif text-amber-200">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                value={weapon.nome} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], nome: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-full" 
                              />
                            </td>
                            <td className="py-2.5 px-2 font-mono">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                value={weapon.dano} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], dano: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-20 text-slate-205" 
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                value={weapon.alcance} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], alcance: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-20" 
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                value={weapon.cdt} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], cdt: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-8 text-center" 
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                value={weapon.pa} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], pa: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-8 text-center font-mono" 
                              />
                            </td>
                            <td className="py-2.5 px-2 text-slate-400">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                value={weapon.peso} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], peso: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-14 text-slate-400" 
                              />
                            </td>
                            <td className="py-2.5 px-2 text-slate-450 text-[11px]">
                              <input 
                                type="text" 
                                disabled={!isEditable}
                                placeholder="Notas rústicas..."
                                value={weapon.observacoes} 
                                onChange={e => {
                                  const v = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.armas];
                                    next[index] = { ...next[index], observacoes: v };
                                    return { ...form, armas: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-full text-slate-400 text-xs" 
                              />
                            </td>
                            {isEditable && (
                              <td className="py-2.5 pl-2">
                                <button 
                                  onClick={() => {
                                    updateActiveForm(form => {
                                      const next = form.armas.filter(w => w.id !== weapon.id);
                                      return { ...form, armas: next };
                                    });
                                  }}
                                  className="text-slate-500 hover:text-red-400 transition cursor-pointer"
                                  title="Remover Arma"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SAVAGE POWERS / SPELLS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <h3 className="text-xs font-serif font-bold text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Poderes / Habilidades Especiais
                  </h3>
                  
                  {isEditable && (
                    <button 
                      onClick={() => {
                        updateActiveForm(form => {
                          const nextPoderes = [...form.poderes, {
                            id: "pow_" + Math.random().toString(36).substring(2, 8),
                            nome: "Novo Poder / Habilidade",
                            estagio: "Novato",
                            custo: "1 PP",
                            distancia: "Si mesmo",
                            duracao: "Instantânea",
                            efeito: "Descrição detalhada dos efeitos do poder..."
                          }];
                          return { ...form, poderes: nextPoderes };
                        });
                      }}
                      className="bg-slate-800 hover:bg-slate-755 text-[10px] text-amber-400 font-bold px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition border border-slate-700/50"
                    >
                      <Plus className="w-3 h-3" /> Novo Poder
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {activeForm.poderes.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 italic py-4">Nenhum poder ou habilidade especial cadastrada para este estado.</p>
                  ) : (
                    activeForm.poderes.map((power, index) => (
                      <div key={power.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 relative space-y-3">
                        {isEditable && (
                          <button 
                            onClick={() => {
                              updateActiveForm(form => ({ ...form, poderes: form.poderes.filter(p => p.id !== power.id) }));
                            }}
                            className="absolute right-3 top-3 text-slate-500 hover:text-red-400 transition"
                            title="Remover Poder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs leading-tight">
                          <div className="col-span-1 md:col-span-2 space-y-1">
                            <span className="text-[9px] text-slate-500 block uppercase font-bold">Poder / Estágio</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                disabled={!isEditable}
                                value={power.nome}
                                onChange={e => {
                                  const val = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.poderes];
                                    next[index] = { ...next[index], nome: val };
                                    return { ...form, poderes: next };
                                  });
                                }}
                                className="bg-transparent font-bold text-amber-100 font-serif focus:outline-none w-full"
                              />
                              <input 
                                type="text"
                                disabled={!isEditable}
                                placeholder="Estágio"
                                value={power.estagio}
                                onChange={e => {
                                  const val = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.poderes];
                                    next[index] = { ...next[index], estagio: val };
                                    return { ...form, poderes: next };
                                  });
                                }}
                                className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 text-center rounded px-1.5 py-0.5 w-16"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 block uppercase font-bold">Custo / Alcance</span>
                            <div className="flex gap-1.5 text-slate-200">
                              <input 
                                type="text"
                                disabled={!isEditable}
                                value={power.custo}
                                onChange={e => {
                                  const val = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.poderes];
                                    next[index] = { ...next[index], custo: val };
                                    return { ...form, poderes: next };
                                  });
                                }}
                                className="bg-transparent font-mono focus:outline-none w-full"
                              />
                              <span className="text-slate-650">|</span>
                              <input 
                                type="text"
                                disabled={!isEditable}
                                value={power.distancia}
                                onChange={e => {
                                  const val = e.target.value;
                                  updateActiveForm(form => {
                                    const next = [...form.poderes];
                                    next[index] = { ...next[index], distancia: val };
                                    return { ...form, poderes: next };
                                  });
                                }}
                                className="bg-transparent focus:outline-none w-full"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 block uppercase font-bold">Duração</span>
                            <input 
                              type="text"
                              disabled={!isEditable}
                              value={power.duracao}
                              onChange={e => {
                                const val = e.target.value;
                                updateActiveForm(form => {
                                  const next = [...form.poderes];
                                  next[index] = { ...next[index], duracao: val };
                                  return { ...form, poderes: next };
                                });
                              }}
                              className="bg-transparent focus:outline-none text-slate-250 w-full"
                            />
                          </div>
                        </div>

                        {/* Description field */}
                        <div className="pt-2 border-t border-slate-900 leading-normal">
                          <textarea 
                            disabled={!isEditable}
                            placeholder="Anote detalhes da conjuração, alcance, efeitos secundários ou jogada do poder..."
                            value={power.efeito}
                            onChange={e => {
                              const val = e.target.value;
                              updateActiveForm(form => {
                                const next = [...form.poderes];
                                next[index] = { ...next[index], efeito: val };
                                return { ...form, poderes: next };
                              });
                            }}
                            className="bg-transparent text-slate-400 text-xs w-full min-h-[45px] resize-y focus:outline-none focus:border-b focus:border-slate-800"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* 4. STORY & GLOBAL GEAR SECTION (Span 8 in All View Mode) */}
            <div className={`${viewMode === 'all' ? 'lg:col-span-12 space-y-6' : activeTab === 'global' ? 'block space-y-6' : 'hidden print:block'}`}>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Historico */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-500" /> Biografia e Histórico do Personagem (Global)
                  </h3>
                  <textarea 
                    disabled={!isEditable} 
                    value={sheet.historia} 
                    onChange={e => {
                      const txt = e.target.value;
                      updateSheet(prev => ({ ...prev, historia: txt }));
                    }}
                    placeholder="Quem é seu personagem? Conte o histórico, motivações ou origens de sua jornada..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-xs text-slate-300 min-h-[140px] focus:outline-none focus:border-amber-500 font-normal leading-relaxed" 
                  />
                </div>

                {/* Backpack equipment */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-500" /> Mochila e Equipamento Geral (Global)
                    </h3>
                    <textarea 
                      disabled={!isEditable} 
                      value={sheet.equipamentoGeral} 
                      onChange={e => {
                        const txt = e.target.value;
                        updateSheet(prev => ({ ...prev, equipamentoGeral: txt }));
                      }}
                      placeholder="Mochila rúnica, pederneira mística, rações, cordas, tochas, pergaminhos..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-xs text-slate-300 min-h-[100px] focus:outline-none focus:border-amber-500 font-normal leading-relaxed" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Carga Carregada</span>
                      <input 
                        type="text" 
                        disabled={!isEditable}
                        value={sheet.pesoCarregado}
                        onChange={e => updateSheet(prev => ({ ...prev, pesoCarregado: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-205 w-full font-mono text-center"
                      />
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Carga Limite</span>
                      <input 
                        type="text" 
                        disabled={!isEditable}
                        value={sheet.pesoLimite}
                        onChange={e => updateSheet(prev => ({ ...prev, pesoLimite: e.target.value }))}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-205 w-full font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </div>

      <footer className="max-w-7xl mx-auto px-4 mt-12 text-center border-t border-slate-900 pt-6">
        <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
          Ficha Interativa Savage Worlds • Ficha de Personagem Multiuso
        </p>
        <p className="text-[10px] text-slate-650 mt-2 font-normal leading-relaxed max-w-md mx-auto">
          Savage Worlds é marca registrada da Pinnacle Entertainment Group. Este sistema é um utilitário Web independente criado voluntariamente por fãs.
        </p>
      </footer>

      <AnimatePresence>
        {showSavedList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-500" />
                  Minhas Fichas
                </h3>
                <button
                  onClick={() => setShowSavedList(false)}
                  className="text-slate-500 hover:text-slate-300 font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-2">
                {savedSheets.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhuma ficha recente encontrada.</p>
                ) : (
                  savedSheets.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        fetchSheet(s.id, s.editToken);
                        const newUrl = `${window.location.origin}${window.location.pathname}?id=${s.id}&token=${s.editToken}`;
                        window.history.replaceState({}, '', newUrl);
                        setShowSavedList(false);
                      }}
                      className="w-full bg-slate-950/50 hover:bg-slate-800 border border-slate-850 hover:border-amber-500/30 p-3 rounded-lg text-left transition flex items-center justify-between group space-x-3 cursor-pointer"
                    >
                      <div className="flex-1 truncate">
                        <h4 className="text-sm font-bold text-amber-100 truncate">{s.nomePersonagem || 'Desconhecido'}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{s.conceito || 'Sem conceito'}</p>
                      </div>
                      <div className="text-[10px] text-slate-600 group-hover:text-amber-400 transition flex items-center shrink-0">
                        {s.id === sheet.id ? "Atual" : "Abrir"} <Layers className="w-3 h-3 ml-1" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para Configuração da Imagem/Aparência do Personagem */}
      <AnimatePresence>
        {showImageConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] font-sans"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4.5 border-b border-slate-800/80 bg-slate-950/40">
                <h3 className="font-serif font-bold text-amber-100 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-500" />
                  Customizar Retrato & Aparência
                </h3>
                <button
                  onClick={() => setShowImageConfig(false)}
                  className="text-slate-500 hover:text-slate-355 font-bold px-2 py-0.5 rounded cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* 1. Live Preview Panel inside Modal */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-850/80 relative overflow-hidden h-44">
                  {/* Backdrop Preview */}
                  {activeForm?.tokenStyle === 'backdrop' && (
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={getActiveFormImage()} 
                        alt="Fundo"
                        className="w-full h-full object-cover opacity-40 filter blur-[1px]"
                        style={{
                          transform: `scale(${activeForm?.tokenScale ?? 1.1}) translateY(${(activeForm?.tokenOffsetY ?? 0) * 1.2}px)`,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      <div className="absolute bottom-2 left-3 z-10 text-[9px] font-bold text-amber-300/80 uppercase tracking-widest font-mono">Prévia do Fundo</div>
                    </div>
                  )}

                  {/* Token/Card Preview */}
                  {activeForm?.tokenStyle !== 'backdrop' && (
                    <div className={`${
                      activeForm?.tokenStyle === 'card' 
                        ? 'w-24 h-32 rounded-lg' 
                        : 'w-24 h-24 rounded-full'
                    } overflow-hidden relative shadow-lg bg-slate-950 ${
                      activeForm?.tokenBorder ? getTokenFrameClass(activeForm.tokenBorder, activeForm?.tokenStyle === 'card') : 'border-4 border-amber-500'
                    }`}>
                      <img 
                        src={getActiveFormImage()} 
                        alt="Preview"
                        style={{
                          transform: `scale(${activeForm?.tokenScale ?? 1}) translateY(${activeForm?.tokenOffsetY ?? 0}px)`,
                        }}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                </div>

                {/* 2. Controls Grid */}
                <div className="space-y-4">
                  {/* Select Token Style */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tipo de Retrato</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'circle', label: 'Token Redondo' },
                        { id: 'card', label: 'Cartão Retangular' },
                        { id: 'backdrop', label: 'Fundo Completo' }
                      ] as const).map(style => (
                        <button
                          key={style.id}
                          onClick={() => updateActiveForm(form => ({ ...form, tokenStyle: style.id }))}
                          className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            (activeForm?.tokenStyle || 'circle') === style.id 
                              ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/10' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Token Border Style */}
                  {activeForm?.tokenStyle !== 'backdrop' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estilo da Moldura</label>
                      <div className="grid grid-cols-5 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                        {([
                          { id: 'amber', color: 'bg-amber-500 border-amber-300', label: 'Âmbar' },
                          { id: 'gold', color: 'bg-yellow-400 border-amber-300 shadow-[0_0_5px_rgba(253,224,71,0.5)]', label: 'Ouro Rúnico' },
                          { id: 'iron', color: 'bg-slate-650 border-slate-400', label: 'Ferro Gótico' },
                          { id: 'neon', color: 'bg-cyan-400 border-cyan-200 animate-pulse', label: 'Cyber Neon' },
                          { id: 'fire', color: 'bg-orange-500 border-orange-300', label: 'Fogo Mágico' }
                        ] as const).map(b => (
                          <button
                            key={b.id}
                            onClick={() => updateActiveForm(form => ({ ...form, tokenBorder: b.id }))}
                            className={`py-1.5 rounded-md border flex flex-col items-center gap-1 cursor-pointer transition hover:scale-105 ${
                              (activeForm?.tokenBorder || 'amber') === b.id 
                                ? 'bg-slate-800 border-amber-500 text-amber-300' 
                                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350'
                            }`}
                            title={b.label}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full border ${b.color}`} />
                            <span className="text-[8px] font-medium leading-none">{b.label.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Zoom / Offset Adjustments */}
                  <div className="bg-slate-950/85 p-3.5 rounded-xl border border-slate-850 space-y-3.5 text-xs text-slate-400">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                        <span>Ajuste de Zoom</span>
                        <span className="font-mono text-amber-400 text-xs font-bold">{(activeForm?.tokenScale ?? 1).toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1"
                        value={activeForm?.tokenScale ?? 1}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          updateActiveForm(form => ({ ...form, tokenScale: val }));
                        }}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                        <span>Deslocamento Vertical</span>
                        <span className="font-mono text-amber-400 text-xs font-bold">{(activeForm?.tokenOffsetY ?? 0)}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-100" 
                        max="100" 
                        step="1"
                        value={activeForm?.tokenOffsetY ?? 0}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          updateActiveForm(form => ({ ...form, tokenOffsetY: val }));
                        }}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>

                  {/* Custom image options (Upload, URL, presets) */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Origem da Imagem</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {/* Presets */}
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Avatares Prontos</span>
                        <select
                          onChange={e => {
                            const val = e.target.value;
                            if (val) {
                              updateActiveForm(form => ({ 
                                ...form, 
                                imageUrl: val,
                                tokenScale: 1,
                                tokenOffsetY: 0
                              }));
                              setToast("Retrato pronto carregado!");
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-350 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Escolher --</option>
                          <option value="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=350&h=350&fit=crop&q=80">Guerreira / Exploradora</option>
                          <option value="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=350&h=350&fit=crop&q=80">Guerreiro / Ladino</option>
                          <option value="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=350&h=350&fit=crop&q=80">Maga / Elfa</option>
                          <option value="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=350&h=350&fit=crop&q=80">Bárbaro / Monge</option>
                          <option value="https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=350&h=350&fit=crop&q=80">Ciborgue / Tecnomago</option>
                          <option value="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=350&h=350&fit=crop&q=80">Pistoleiro / Caçador</option>
                        </select>
                      </div>

                      {/* File Upload */}
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Fazer Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer font-sans"
                        />
                      </div>
                    </div>

                    {/* URL Input */}
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Link URL da Imagem</span>
                      <input 
                        type="text"
                        placeholder="Cole link http/https de imagem..."
                        value={activeForm?.imageUrl && !activeForm.imageUrl.startsWith('data:') ? activeForm.imageUrl : ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateActiveForm(form => ({ ...form, imageUrl: val }));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-350 placeholder-slate-650 focus:outline-none focus:border-amber-500 font-sans"
                        title="Link de imagem da internet"
                      />
                    </div>
                  </div>

                  {/* Clear button if inherited */}
                  {localActiveFormId !== 'base' && activeForm?.imageUrl && activeForm.imageUrl.trim() !== '' && (
                    <button
                      onClick={() => {
                        updateActiveForm(form => ({ ...form, imageUrl: "" }));
                        setToast("Foto específica removida. Usando foto herdada da Base.");
                      }}
                      className="w-full py-2 text-xs text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/45 border border-red-900/30 rounded-lg text-center cursor-pointer transition font-bold"
                    >
                      Remover Imagem e Herdar da Base
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
                <button
                  onClick={() => setShowImageConfig(false)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-md"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-amber-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm text-xs font-semibold leading-relaxed font-sans"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
