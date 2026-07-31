import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { ShieldCheck, XCircle, CheckCircle2, Eye, ExternalLink, Clock, AlertCircle, Camera } from 'lucide-react';
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

  if (loading) return <div className="flex justify-center py-20 animate-pulse"><div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-full"></div></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Vérifications KYC</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-lg">Validez l'authenticité des membres Galant.</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 transition-colors">
          <Clock size={14} />
          {requests.filter(r => r.status === 'PENDING').length} en attente
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des Demandes */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl dark:shadow-none border border-slate-50 dark:border-white/5 overflow-hidden flex flex-col h-[70vh] transition-colors">
          <div className="p-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 dark:text-slate-500">File d'attente</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left border ${
                  selectedRequest?.id === req.id
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 shadow-sm'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                  <img src={req.user.photos?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{req.user.name}</p>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{req.document_type}</p>
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
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl dark:shadow-none border border-slate-50 dark:border-white/5 overflow-hidden transition-colors">
              <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
                    <img src={selectedRequest.user.photos?.[0]} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{selectedRequest.user.name}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{selectedRequest.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedRequest.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Documents */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Pièce d'identité ({selectedRequest.document_type})
                  </h4>
                  <div className="space-y-3">
                    <a href={selectedRequest.document_url} target="_blank" rel="noreferrer" className="block group relative aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-sm">
                      <img src={selectedRequest.document_url} className="w-full h-full object-cover" alt="Recto" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                        CLIQUEZ POUR AGRANDIR
                      </div>
                    </a>
                    {selectedRequest.document_back_url && (
                      <a href={selectedRequest.document_back_url} target="_blank" rel="noreferrer" className="block group relative aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-sm">
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
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} /> Selfie Live
                  </h4>
                  <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-sm">
                    <img src={selectedRequest.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-white/5 space-y-6">
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Motif du rejet (uniquement en cas de refus)..."
                    className="w-full p-6 rounded-2xl bg-white dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary/10 font-medium text-sm text-slate-600 dark:text-slate-300 shadow-inner dark:shadow-none"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleReview('REJECTED')}
                      disabled={processing}
                      className="py-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/30 transition-all active:scale-95"
                    >
                      Refuser le dossier
                    </button>
                    <button
                      onClick={() => handleReview('APPROVED')}
                      disabled={processing}
                      className="py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {processing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Approuver & Certifier
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-700 gap-4 py-20 transition-colors">
              <ShieldCheck size={80} strokeWidth={1} className="opacity-20" />
              <p className="font-bold italic">Sélectionnez une demande pour l'examiner.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminKyc;
