import React, { useState, useEffect } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Search, ShoppingCart, TrendingUp, ChevronLeft, Loader2, ArrowRight, ExternalLink, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  current_price: number;
  currency: string;
  image_url: string;
  source_url: string;
  is_real?: boolean;
}

const MarketPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<Product[]>([]);

  const fetchTrends = async () => {
    try {
      const res = await apiRequest<{ products: Product[] }>('/api/market/trends', { requireAuth: true });
      setTrends(res.products || []);
    } catch (e) {
      console.error('Trends error:', e);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await apiRequest<{ products: Product[] }>(`/api/market/search?q=${encodeURIComponent(query)}`, {
        requireAuth: true
      });
      setProducts(res.products || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/apps')}
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-[1000] italic tracking-tight text-slate-900 dark:text-white">Le Marché Galant</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Comparateur de prix intelligent</p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          <Search size={22} />
        </div>
        <input
          type="text"
          placeholder="Que recherchez-vous ? (ex: iPhone, Robe de soirée...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-[2rem] py-6 pl-14 pr-6 font-bold text-lg shadow-xl shadow-slate-200/50 dark:shadow-none focus:outline-none focus:border-primary/30 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-primary text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
        </button>
      </form>

      {/* Results or Trends */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            {products.length > 0 ? <Filter size={14} /> : <TrendingUp size={14} />}
            {products.length > 0 ? `${products.length} Résultats trouvés` : 'Tendances du moment'}
          </h3>
          <div className="h-px flex-1 bg-slate-100 dark:bg-white/5 ml-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(products.length > 0 ? products : trends).map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-white/5 flex gap-6 group hover:border-primary/20 transition-all relative overflow-hidden">
              {/* Badge Source */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border ${
                item.is_real
                  ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20'
                  : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20'
              }`}>
                <ShieldCheck size={10} className={item.is_real ? 'text-green-500' : 'text-amber-500'} />
                {item.is_real ? 'Vérifié Jumia' : 'Estimation Galant'}
              </div>

              <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight truncate">{item.name}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-[1000] text-primary tracking-tighter">
                    {item.current_price.toLocaleString()} {item.currency}
                  </span>
                </div>
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                >
                  Voir sur la boutique <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[3rem] text-white space-y-4 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
        <ShoppingCart className="text-primary mb-2" size={32} />
        <h3 className="text-2xl font-black italic">Le saviez-vous ?</h3>
        <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-md">
          Les membres **Privilège** peuvent créer des alertes de prix. Nous vous envoyons une notification dès que votre produit favori baisse de prix.
        </p>
        <button className="text-primary font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-2">
          Devenir Membre Privilège <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default MarketPage;
