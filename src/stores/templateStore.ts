import { create } from "zustand";
import type { RateTemplate } from "@/types";
import { generateInitialTemplates } from "@/data/initialTemplates";

interface TemplateState {
  templates: RateTemplate[];
  selectedCarrier: string;
  selectedCountry: string;
  searchQuery: string;
  setTemplates: (templates: RateTemplate[]) => void;
  addTemplate: (template: Omit<RateTemplate, "id">) => void;
  updateTemplate: (id: string, updates: Partial<RateTemplate>) => void;
  deleteTemplate: (id: string) => void;
  setSelectedCarrier: (carrier: string) => void;
  setSelectedCountry: (country: string) => void;
  setSearchQuery: (query: string) => void;
  getFilteredTemplates: () => RateTemplate[];
  resetToDefault: () => void;
}

const STORAGE_KEY = "logistics_templates_v2";

function loadTemplates(): RateTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return generateInitialTemplates();
}

function saveTemplates(templates: RateTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // ignore
  }
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: loadTemplates(),
  selectedCarrier: "",
  selectedCountry: "",
  searchQuery: "",

  setTemplates: (templates) => {
    set({ templates });
    saveTemplates(templates);
  },

  addTemplate: (template) => {
    const newTemplate: RateTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    const updated = [...get().templates, newTemplate];
    set({ templates: updated });
    saveTemplates(updated);
  },

  updateTemplate: (id, updates) => {
    const updated = get().templates.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ templates: updated });
    saveTemplates(updated);
  },

  deleteTemplate: (id) => {
    const updated = get().templates.filter((t) => t.id !== id);
    set({ templates: updated });
    saveTemplates(updated);
  },

  setSelectedCarrier: (carrier) => set({ selectedCarrier: carrier }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredTemplates: () => {
    const { templates, selectedCarrier, selectedCountry, searchQuery } = get();
    return templates.filter((t) => {
      if (selectedCarrier && t.carrierId !== selectedCarrier) return false;
      if (selectedCountry && t.countryCode !== selectedCountry) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.countryCode.toLowerCase().includes(q) ||
          t.carrierId.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },

  resetToDefault: () => {
    const defaultTemplates = generateInitialTemplates();
    set({ templates: defaultTemplates });
    saveTemplates(defaultTemplates);
  },
}));
