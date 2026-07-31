import React, { useEffect, useState } from 'react';
import { AlertCircle, Ban, Camera, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

interface AdminReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details?: string | null;
  status: string;
  created_at: string;
  reporter?: { name?: string; photos?: string[] } | null;
  reported_user?: { name?: string; photos?: string[]; suspended_at?: string | null } | null;
}

interface PhotoReview {
  id: string;
  user_id: string;
  status: string;
  note?: string | null;
  photo_url?: string;
  image_url?: string;
  url?: string;
  photos?: string[];
  user?: { name?: string; photos?: string[] } | null;
}

const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [photoReviews, setPhotoReviews] = useState<PhotoReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reportsData, photosData] = await Promise.all([
        apiRequest<{ reports: AdminReport[] }>('/api/admin/reports', { requireAuth: true }),
        apiRequest<{ reviews: PhotoReview[] }>('/api/admin/photo-reviews', { requireAuth: true })
      ]);
      setReports(reportsData.reports || []);
      setPhotoReviews(photosData.reviews || []);
    } catch (e: any) {
      showAlert('Erreur', e.message || 'Impossible de charger la moderation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resolveReport = async (reportId: string, suspendUser = false) => {
    const note = suspendUser ? 'Compte suspendu depuis les alertes admin.' : 'Signalement traite.';
    setProcessingId(reportId);
    try {
      await apiRequest(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ status: 'RESOLVED', note, suspendUser })
      });
      showAlert('Succes', suspendUser ? 'Signalement traite et utilisateur suspendu.' : 'Signalement traite.');
      fetchData();
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const reviewPhoto = async (reviewId: string, status: 'APPROVED' | 'REJECTED') => {
    const note = status === 'REJECTED' ? window.prompt('Motif du rejet ?') || '' : '';
    if (status === 'REJECTED' && !note.trim()) return;

    setProcessingId(reviewId);
    try {
      await apiRequest(`/api/admin/photo-reviews/${reviewId}/review`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ status, note })
      });
      showAlert('Succes', status === 'APPROVED' ? 'Photo approuvee.' : 'Photo rejetee.');
      fetchData();
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getPhotoUrl = (review: PhotoReview) =>
    review.photo_url || review.image_url || review.url || review.photos?.[0] || review.user?.photos?.[0] || 'https://placehold.co/400x500';

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RefreshCw className="animate-spin text-slate-300" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Alertes</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">Signalements et photos a moderer.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex w-fit items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm transition-colors"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      <section className="rounded-[2rem] border border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 p-4 shadow-xl dark:shadow-none sm:p-6 lg:p-8 transition-colors">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <AlertCircle className="text-red-500" size={20} />
            Signalements
          </h3>
          <span className="rounded-full bg-red-50 dark:bg-red-900/20 px-3 py-1 text-[10px] font-black text-red-500 dark:text-red-400">{reports.filter(r => r.status === 'PENDING').length} ouverts</span>
        </div>

        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6 text-center text-sm font-bold text-slate-400 dark:text-slate-500">Aucun signalement.</p>
          ) : reports.map(report => (
            <div key={report.id} className="rounded-2xl border border-slate-100 dark:border-white/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {report.reported_user?.name || report.reported_user_id}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{report.reason || 'GENERAL'} - {report.status}</p>
                  {report.details && <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">{report.details}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => resolveReport(report.id)}
                    disabled={processingId === report.id || report.status !== 'PENDING'}
                    className="rounded-xl bg-slate-900 dark:bg-white p-3 text-white dark:text-slate-900 disabled:opacity-40"
                    title="Marquer traite"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button
                    onClick={() => resolveReport(report.id, true)}
                    disabled={processingId === report.id || report.status !== 'PENDING'}
                    className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-red-500 disabled:opacity-40"
                    title="Suspendre"
                  >
                    <Ban size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 p-4 shadow-xl dark:shadow-none sm:p-6 lg:p-8 transition-colors">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Camera className="text-blue-500" size={20} />
            Photos en attente
          </h3>
          <span className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-[10px] font-black text-blue-500 dark:text-blue-400">{photoReviews.length}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photoReviews.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6 text-center text-sm font-bold text-slate-400 dark:text-slate-500 sm:col-span-2 xl:col-span-3">Aucune photo a moderer.</p>
          ) : photoReviews.map(review => (
            <div key={review.id} className="overflow-hidden rounded-2xl border border-slate-100 dark:border-white/5">
              <img src={getPhotoUrl(review)} className="aspect-[4/5] w-full object-cover" alt="" />
              <div className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{review.user?.name || review.user_id}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{review.status}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => reviewPhoto(review.id, 'REJECTED')}
                    disabled={processingId === review.id}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 disabled:opacity-40"
                  >
                    <XCircle size={16} />
                    Rejeter
                  </button>
                  <button
                    onClick={() => reviewPhoto(review.id, 'APPROVED')}
                    disabled={processingId === review.id}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white py-3 text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900 disabled:opacity-40"
                  >
                    <ShieldCheck size={16} />
                    Valider
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminReports;
