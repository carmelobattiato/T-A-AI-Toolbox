import React, { useState } from 'react';
import { Item, Phase, Attachment } from '../../types/index.ts';
import { getItemIcon } from '../../utils/icons.tsx';
import { getOwnerInitials } from '../../utils/owner.ts';
import {
  X,
  ExternalLink,
  Github,
  Globe,
  Edit3,
  Trash2,
  Upload,
  Image as ImageIcon,
  User,
  CheckCircle2,
  Layers,
  FileText
} from 'lucide-react';

interface ItemDrawerProps {
  item: Item;
  phases: Phase[];
  onClose: () => void;
  onFocusPhase: (phaseId: string) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onAddAttachment: (itemId: string, fileData: { fileName: string; mimeType: string; data: string }) => Promise<void>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
}

export const ItemDrawer: React.FC<ItemDrawerProps> = ({
  item,
  phases,
  onClose,
  onFocusPhase,
  onEditItem,
  onDeleteItem,
  onAddAttachment,
  onDeleteAttachment,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'phases' | 'screenshots' | 'notes'>('details');
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const coveredPhases = phases.filter(p => item.phaseIds.includes(p.id));
  const attachments = item.attachments || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (attachments.length >= 3) {
      alert('Massimo 3 allegati consentiti per elemento');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Il file supera il limite di 5 MB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Sono consentiti solo file PNG, JPG o JPEG');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        await onAddAttachment(item.id, {
          fileName: file.name,
          mimeType: file.type,
          data: base64Data,
        });
      } catch (err: any) {
        alert(err.message || 'Errore nel caricamento allegato');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getThemeColor = () => {
    if (item.type === 'TOOL') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    if (item.type === 'IDEA') return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  };

  const theme = getThemeColor();

  return (
    <div className="w-[380px] md:w-[420px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
        <div className="flex items-start gap-3 min-w-0 pr-2">
          <div className="p-2.5 rounded-xl bg-white shadow-2xs border border-slate-200 shrink-0 mt-0.5">
            {getItemIcon(item.type, item.title)}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
              {item.title}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${theme.bg} ${theme.text} ${theme.border}`}>
                {item.type === 'TOOL' ? 'Tool esistente' : item.type === 'IDEA' ? 'Idea' : 'Esigenza'}
              </span>
              {item.generalizationRequired && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Da generalizzare
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEditItem(item)}
            title="Modifica"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Chiudi"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-4 bg-white shrink-0">
        <div className="flex items-center gap-2 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 pt-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Dettagli
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('phases')}
            className={`pb-2.5 pt-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'phases'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fasi ({item.phaseIds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('screenshots')}
            className={`pb-2.5 pt-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'screenshots'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Screenshot ({attachments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 pt-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Note
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Sintesi / Breve */}
            {item.summary && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrizione breve
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {item.summary}
                </p>
              </div>
            )}

            {/* Descrizione Completa */}
            {item.description && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrizione completa
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>
            )}

            {/* Fasi Coperte Chips */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Fasi coperte
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {coveredPhases.map(ph => (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() => onFocusPhase(ph.id)}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <span>{ph.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Specific fields for TOOL */}
            {item.type === 'TOOL' && (
              <>
                {/* URLs */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Link e Repository
                  </h4>
                  <div className="space-y-1.5">
                    {item.githubUrl && (
                      <a
                        href={item.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 border border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4 text-slate-800" />
                          <span className="font-medium">GitHub Repository</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}
                    {item.catalogUrl && (
                      <a
                        href={item.catalogUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 border border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Enterprise Catalog URL</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}
                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 border border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium">Demo Online</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Specific fields for IDEA */}
            {item.type === 'IDEA' && (
              <>
                {item.problem && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Problema
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                      {item.problem}
                    </p>
                  </div>
                )}
                {item.requirements && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Requisiti tecnici
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {item.requirements}
                    </p>
                  </div>
                )}
                {item.expectedBenefit && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Beneficio atteso
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      {item.expectedBenefit}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Specific fields for NEED */}
            {item.type === 'NEED' && (
              <>
                {item.currentProcess && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Come viene gestita oggi
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {item.currentProcess}
                    </p>
                  </div>
                )}
                {item.desiredTool && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tool immaginato
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                      {item.desiredTool}
                    </p>
                  </div>
                )}
                {item.desiredOutcome && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Risultato desiderato
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      {item.desiredOutcome}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Owner (all types, label matches the edit form) */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {item.type === 'TOOL' ? 'Owner / POC' : item.type === 'IDEA' ? 'Proponente / Autore' : 'Owner / Referente'}
              </h4>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                  {getOwnerInitials(item.owner)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{item.owner || 'Team T&A'}</div>
                  <div className="text-[10px] text-slate-500">
                    {/* Owner may already be an email (SSO username from x-forwarded-user) */}
                    {item.owner
                      ? item.owner.includes('@')
                        ? item.owner.toLowerCase()
                        : `${item.owner.toLowerCase().replace(/\s+/g, '.')}@accenture.com`
                      : 'team.ta@accenture.com'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fasi Tab */}
        {activeTab === 'phases' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-2">
              Questo elemento supporta {coveredPhases.length} fasi del processo T&A. Clicca su una fase per metterla a fuoco nella mappa.
            </p>
            {coveredPhases.map(ph => (
              <div
                key={ph.id}
                onClick={() => onFocusPhase(ph.id)}
                className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {ph.position}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                      {ph.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {ph.description}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Visualizza →
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Screenshot Tab */}
        {activeTab === 'screenshots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Immagini e schemi ({attachments.length}/3)
              </span>
              {attachments.length < 3 && (
                <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Caricamento...' : 'Carica immagine'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">Nessuno screenshot caricato</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Puoi caricare fino a 3 immagini (PNG, JPG, max 5MB ciascuna)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                    <img
                      src={att.data}
                      alt={att.fileName}
                      className="w-full h-28 object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setLightboxImage(att.data)}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 p-1.5 flex items-center justify-between text-white text-[10px]">
                      <span className="truncate max-w-[100px]">{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteAttachment(att.id)}
                        className="text-red-300 hover:text-red-100 p-0.5"
                        title="Elimina immagine"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note Tab */}
        {activeTab === 'notes' && (
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Note operative
            </h4>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed min-h-[120px] whitespace-pre-line">
              {item.notes || 'Nessuna nota aggiuntiva memorizzata.'}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-red-700">Eliminare?</span>
            <button
              type="button"
              onClick={() => {
                onDeleteItem(item.id);
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Sì, elimina
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Elimina</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onEditItem(item)}
          className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Modifica elemento</span>
        </button>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden p-2">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
