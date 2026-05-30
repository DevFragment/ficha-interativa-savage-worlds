/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sword, Shield, Heart, Sparkles, Copy, Plus, Trash, 
  Share2, Check, Skull, Feather, History, Package, Lock, Unlock, RefreshCw,
  AlertCircle, Upload, LayoutGrid, Layers, Trash2, Camera,
  Printer, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CharacterSheet, 
  CharacterFormState, 
  INITIAL_SKILLS, 
  AttributeKey, 
  SkillSetting
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
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [savedSheets, setSavedSheets] = useState<{id: string, editToken: string, nomePersonagem: string, conceito: string, lastAccessed: number}[]>([]);

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

  // Sincronizar banco
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
      const data = await res.json();
      setSheet(data.sheet);
      setSaveStatus('saved');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const updateSheet = (updater: (prev: CharacterSheet) => CharacterSheet) => {
    if (!sheet || !isEditable) return;
    setSaveStatus('modified');
    setSheet(prev => {
      const updated = updater(prev!);
      handleSave(updated);
      return updated;
    });
  };

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
    const lutar = form.pericias.find(p => p.nome === 'Lutar');
    if (!lutar || !lutar.possui) return 2 + form.apararMod;
    const dieValue = parseInt(lutar.dado.replace('d', '')) || 4;
    return 2 + Math.floor(dieValue / 2) + lutar.mod + form.apararMod;
  };

  const getToughness = (form: CharacterFormState): number => {
    const vigor = form.atributos.Vigor;
    const dieValue = parseInt(vigor.dado.replace('d', '')) || 6;
    return 2 + Math.floor(dieValue / 2) + vigor.mod + form.resistenciaMod;
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

  if (!sheet) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
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

              <div className="pt-4 mt-2 border-t border-slate-800/80">
                <button 
                  onClick={() => setIsCreatingNew(true)}
                  disabled={loading}
                  className="w-full font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mb-3"
                >
                  <Plus className="w-4 h-4" />
                  Criar Nova Ficha
                </button>
                <label className="w-full font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Importar de JSON
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
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

              <div className="pt-4 mt-2 border-t border-slate-800/80">
                <label className="w-full font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 py-3 rounded-lg text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Importar de JSON
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
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
              <button onClick={handleEditorLink} className="bg-slate-800 hover:bg-slate-750 font-semibold px-2.5 py-1 rounded text-emerald-300 transition text-[11px] cursor-pointer print:hidden" title="Guarde este link privado">
                <Lock className="w-3 h-3 inline mr-1" /> Salvar Link Editor
              </button>
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

      {/* Hero Metadata Header */}
      <header className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none translate-x-12 -translate-y-12">
            <Sword className="w-56 h-56 text-amber-500" />
          </div>

          <div className="w-full flex flex-col md:flex-row items-center gap-5">
            {/* Avatar upload / change area with Real base64 encoder and fallback URL input */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 rounded-full border-4 border-amber-500 overflow-hidden relative shadow-lg bg-slate-950">
                <img 
                  src={getActiveFormImage()} 
                  alt="Token do Personagem"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              </div>

              {localActiveFormId !== 'base' && (!activeForm?.imageUrl || activeForm.imageUrl.trim() === '') && (
                <span className="text-[9px] text-amber-200 bg-amber-950/45 px-2 py-0.5 rounded border border-amber-900/40 font-sans font-medium text-center">
                  Usando foto herdada da Base
                </span>
              )}
              
              {isEditable && (
                <div className="flex flex-col gap-1.5 w-full max-w-[170px]">
                  {/* Robust, direct native file input with custom file upload styling */}
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 flex flex-col gap-1">
                    <span className="text-[8px] text-slate-500 font-bold font-sans tracking-wide uppercase select-none text-center">Upload de Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="block w-full text-[9px] text-slate-400 file:mr-1 file:py-1 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer text-center font-sans"
                    />
                  </div>

                  {/* Manual URL input field to paste any web link seamlessly */}
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/80 flex flex-col gap-1">
                    <span className="text-[8px] text-slate-500 font-bold font-sans tracking-wide uppercase select-none text-center">Link URL da Imagem</span>
                    <input 
                      type="text"
                      placeholder="Cole link http/https..."
                      value={activeForm?.imageUrl && !activeForm.imageUrl.startsWith('data:') ? activeForm.imageUrl : ''}
                      onChange={e => {
                        const val = e.target.value;
                        updateActiveForm(form => ({ ...form, imageUrl: val }));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-center font-sans"
                      title="Insira o link de qualquer imagem da internet"
                    />
                  </div>

                  {/* Clear custom image if on alternative form */}
                  {localActiveFormId !== 'base' && activeForm?.imageUrl && activeForm.imageUrl.trim() !== '' && (
                    <button
                      onClick={() => {
                        updateActiveForm(form => ({ ...form, imageUrl: "" }));
                        setToast("Foto específica removida. Usando foto herdada da Base.");
                      }}
                      className="text-[9px] text-red-400 hover:text-red-300 transition-colors bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 font-sans py-0.5 px-1.5 rounded text-center cursor-pointer font-bold"
                    >
                      Remover e Herdar da Base
                    </button>
                  )}
                </div>
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
                  className="bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-xl font-serif font-bold text-amber-100 w-full text-center md:text-left"
                />
              </div>

              {/* Editable header details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-xs">
                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold">Jogador</span>
                  <input 
                    type="text" 
                    disabled={!isEditable}
                    value={sheet.jogador}
                    onChange={e => updateSheet(prev => ({ ...prev, jogador: e.target.value }))}
                    className="bg-transparent w-full font-semibold focus:outline-none focus:border-b focus:border-amber-500 mt-0.5 text-slate-200 text-center md:text-left"
                  />
                </div>
                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold">Conceito</span>
                  <input 
                    type="text" 
                    disabled={!isEditable}
                    value={sheet.conceito}
                    onChange={e => updateSheet(prev => ({ ...prev, conceito: e.target.value }))}
                    className="bg-transparent w-full font-semibold focus:outline-none focus:border-b focus:border-amber-500 mt-0.5 text-slate-200 text-center md:text-left"
                  />
                </div>
                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold">Raça</span>
                  <input 
                    type="text" 
                    disabled={!isEditable}
                    value={sheet.raca}
                    onChange={e => updateSheet(prev => ({ ...prev, raca: e.target.value }))}
                    className="bg-transparent w-full font-semibold focus:outline-none focus:border-b focus:border-amber-500 mt-0.5 text-slate-200 text-center md:text-left"
                  />
                </div>
                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                  <span className="block text-[10px] text-slate-500 font-bold">Campanha</span>
                  <input 
                    type="text" 
                    disabled={!isEditable}
                    value={sheet.campanha}
                    onChange={e => updateSheet(prev => ({ ...prev, campanha: e.target.value }))}
                    className="bg-transparent w-full font-semibold focus:outline-none focus:border-b focus:border-amber-500 mt-0.5 text-slate-200 text-center md:text-left"
                  />
                </div>
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
                <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Modificadores e Ferimentos</span>
                  <span className="text-[10px] bg-red-950 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Mod Penal: {getPenalties()}
                  </span>
                </h3>

                {/* Ferimentos */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Skull className="w-3.5 h-3.5 text-red-500" /> Ferimentos (Max 3)
                    </span>
                    <span className="font-mono text-amber-200">-{Math.min(sheet.ferimentos, 3)} nas jogadas</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((val) => {
                      const isActive = sheet.ferimentos >= val;
                      return (
                        <button
                          key={val}
                          disabled={!isEditable}
                          onClick={() => updateSheet(prev => ({ ...prev, ferimentos: val }))}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                            isActive 
                              ? val === 0 
                                ? 'bg-green-500/10 border-green-500 text-green-400' 
                                : 'bg-red-500/15 border-red-500 text-red-400 font-extrabold'
                              : 'bg-slate-950 border-slate-850 text-slate-600 hover:border-slate-800'
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
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Feather className="w-3.5 h-3.5 text-amber-500" /> Fadiga (Max 2)
                    </span>
                    <span className="font-mono text-amber-200">-{Math.min(sheet.fadiga, 2)} nas jogadas</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((val) => {
                      const isActive = sheet.fadiga >= val;
                      return (
                        <button
                          key={val}
                          disabled={!isEditable}
                          onClick={() => updateSheet(prev => ({ ...prev, fadiga: val }))}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                            isActive 
                              ? val === 0 
                                ? 'bg-green-500/10 border-green-500 text-green-400' 
                                : 'bg-amber-500/15 border-amber-500 text-amber-400'
                              : 'bg-slate-950 border-slate-850 text-slate-600 hover:border-slate-850'
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
                <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-800 pb-2">
                  Atributos da Forma ({activeForm.nomeForma})
                </h3>

                <div className="space-y-4">
                  {(['Agilidade', 'Astúcia', 'Espírito', 'Força', 'Vigor'] as AttributeKey[]).map((attr) => {
                    const attrData = activeForm.atributos[attr] || { dado: 'd6', mod: 0 };
                    
                    return (
                      <div key={attr} className="space-y-1 pb-3 border-b border-slate-850/30 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300">{attr}</span>
                          
                          {/* Mod value */}
                          <div className="flex items-center gap-1.5">
                            {isEditable ? (
                              <div className="flex items-center bg-slate-950 rounded px-1.5 py-0.5 text-[11px] border border-slate-850">
                                <span className="text-[10px] text-slate-500 mr-1">Mod:</span>
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
                                  className="w-7 bg-transparent text-center font-bold text-amber-400 focus:outline-none"
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
                        <div className="grid grid-cols-5 gap-1.5 mt-1">
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
                                className={`py-1 text-center font-mono font-bold text-[11px] rounded border transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-amber-500 border-amber-400 text-slate-950' 
                                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-800'
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
                <h3 className="text-xs font-serif font-bold text-amber-200 border-b border-slate-800 pb-2">
                  Estatísticas de Resiliência
                </h3>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-center space-y-1">
                    <div className="flex justify-center text-amber-400"><Shield className="w-5 h-5" /></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Aparar</span>
                    <span className="text-2xl font-serif font-bold text-amber-100 block">{getParry(activeForm)}</span>
                    <span className="text-[9px] text-slate-500 block">½ dLutar + 2 {activeForm.apararMod !== 0 && `(${activeForm.apararMod > 0 ? '+' : ''}${activeForm.apararMod})`}</span>
                    {isEditable && (
                      <div className="flex items-center justify-center gap-1 mt-1 border-t border-slate-900 pt-1.5">
                        <span className="text-[9px] text-slate-500">Aj:</span>
                        <input 
                          type="number" 
                          value={activeForm.apararMod}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updateActiveForm(form => ({ ...form, apararMod: val }));
                          }}
                          className="w-7 text-center bg-slate-900 border border-slate-800 text-[10px] text-amber-400 font-bold rounded focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-center space-y-1">
                    <div className="flex justify-center text-red-400"><Heart className="w-5 h-5" /></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Resistência</span>
                    <span className="text-2xl font-serif font-bold text-amber-100 block">{getToughness(activeForm)}</span>
                    <span className="text-[9px] text-slate-500 block">½ dVigor + 2 {activeForm.resistenciaMod !== 0 && `(${activeForm.resistenciaMod > 0 ? '+' : ''}${activeForm.resistenciaMod})`}</span>
                    {isEditable && (
                      <div className="flex items-center justify-center gap-1 mt-1 border-t border-slate-900 pt-1.5">
                        <span className="text-[9px] text-slate-500">Aj:</span>
                        <input 
                          type="number" 
                          value={activeForm.resistenciaMod}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updateActiveForm(form => ({ ...form, resistenciaMod: val }));
                          }}
                          className="w-7 text-center bg-slate-900 border border-slate-800 text-[10px] text-amber-400 font-bold rounded focus:outline-none"
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
                        className={`p-2 px-3 rounded-xl border flex items-center justify-between transition-all ${
                          skill.possui 
                            ? 'bg-slate-950 border-slate-800/80' 
                            : 'bg-slate-950/20 border-slate-900 text-slate-600 opacity-45'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isEditable ? (
                            <input 
                              type="checkbox"
                              checked={skill.possui}
                              onChange={e => {
                                const checked = e.target.checked;
                                updateActiveForm(form => {
                                  const list = [...form.pericias];
                                  list[index] = { ...list[index], possui: checked };
                                  return { ...form, pericias: list };
                                });
                              }}
                              className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer h-4 w-4"
                            />
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${skill.possui ? 'bg-amber-500 animate-pulse' : 'bg-slate-800'}`} />
                          )}
                          
                          <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                            {skill.nome}
                            <span className="text-[9px] text-slate-500 font-normal">({skill.atributoAssociado.substring(0, 3)})</span>
                          </span>
                        </div>

                        {/* Die / Value setup */}
                        <div className="flex items-center gap-1.5">
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
                                  className="bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-400 font-bold rounded py-0.5 px-1 focus:outline-none"
                                >
                                  {['d4', 'd6', 'd8', 'd10', 'd12'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                
                                <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[9px] text-amber-500 font-bold">
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
                            <span className="text-[10px] italic text-slate-600">Não treinado (d4-2)</span>
                          )}

                          {isEditable && isCustom && (
                            <button 
                              onClick={() => handleRemoveCustomSkill(skill.nome)}
                              className="p-1 hover:text-red-400 text-slate-500 transition ml-1"
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
