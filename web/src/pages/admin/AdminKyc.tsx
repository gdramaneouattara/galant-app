import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { ShieldCheck, XCircle, CheckCircle2, Eye, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';

interface KycRequest {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  document_back_url?: string;
  selfie_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  user: {
    name: string;
    email: string;
    photos: string[];
  };
}

const AdminKyc: React.FC = () => {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ requests: KycRequest[] }>('/api/admin/kyc/requests', { requireAuth: true });
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest || processing) return;
    if (status === 'REJECTED' && !rejectionNote.trim()) {
      showAlert('Note requise', 'Veuillez saisir un motif de rejet.');
      return;
    }

    setProcessing(true);
    try {
      await apiRequest(`/api/admin/kyc/requests/${selectedRequest.id}/review`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ status, note: rejectionNote })
      });

      showAlert('Succès', status === 'APPROVED' ? 'Profil certifié ! L\'IA Concierge a été notifiée.' : 'Dossier rejeté.');
      setSelectedRequest(null);
      setRejectionNote('');
      fetchRequests();
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 animate-pulse"><div className="h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Vérifications KYC</h2>
          <p className="text-slate-500 font-medium mt-1 text-lg">Validez l'authenticité des membres Galant.</p>
        </div>
        <div className="bg-amber-50 text-amber-600 px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border border-amber-100 flex items-center gap-2">
          <Clock size={14} />
          {requests.filter(r => r.status === 'PENDING').length} en attente
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des Demandes */}
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">File d'attente</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left border ${
                  selectedRequest?.id === req.id
                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                    : 'bg-white border-slate-50 hover:border-slate-200 shadow-sm'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  <img src={req.user.photos?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{req.user.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{req.document_type}</p>
                </div>
                {req.status === 'PENDING' && <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>}
                {req.status === 'APPROVED' && <CheckCircle2 className="text-green-500" size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* Détails et Actions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRequest ? (
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                    <img src={selectedRequest.user.photos?.[0]} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedRequest.user.name}</h3>
                    <p className="text-sm font-medium text-slate-500">{selectedRequest.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedRequest.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Documents */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Pièce d'identité ({selectedRequest.document_type})
                  </h4>
                  <div className="space-y-3">
                    <a href={selectedRequest.document_url} target="_blank" rel="noreferrer" className="block group relative aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      <img src={selectedRequest.document_url} className="w-full h-full object-cover" alt="Recto" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                        CLIQUEZ POUR AGRANDIR
                      </div>
                    </a>
                    {selectedRequest.document_back_url && (
                      <a href={selectedRequest.document_back_url} target="_blank" rel="noreferrer" className="block group relative aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 shadow-sm">
                        <img src={selectedRequest.document_back_url} className="w-full h-full object-cover" alt="Verso" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                          VERSO
                        </div>
                      </a>
                    )}
                  </div>
                </div>

                {/* Selfie */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} /> Selfie Live
                  </h4>
                  <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={selectedRequest.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6">
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Motif du rejet (uniquement en cas de refus)..."
                    className="w-full p-6 rounded-2xl bg-white border-none outline-none focus:ring-2 focus:ring-primary/10 font-medium text-sm text-slate-600 shadow-inner"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleReview('REJECTED')}
                      disabled={processing}
                      className="py-4 rounded-2xl bg-white border-2 border-red-100 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95"
                    >
                      Refuser le dossier
                    </button>
                    <button
                      onClick={() => handleReview('APPROVED')}
                      disabled={processing}
                      className="py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {processing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Approuver & Certifier
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300 gap-4 py-20">
              <ShieldCheck size={80} strokeWidth={1} className="opacity-20" />
              <p className="font-bold italic">Sélectionnez une demande pour l'examiner.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { FileText, Loader2 } from 'lucide-react';
export default AdminKyc;
