import { useState, useMemo, useEffect } from 'react';
import { Search, Gamepad2, X, Maximize2, ExternalLink, Clock, Flame, LayoutGrid, Home as HomeIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gamesData from './games.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'games' | 'proxy'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle');
  const [formData, setFormData] = useState({ title: '', url: '', message: '' });
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [useProxy, setUseProxy] = useState(true);
  const [isProxyFullscreen, setIsProxyFullscreen] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [activeProxyUrl, setActiveProxyUrl] = useState('');

  // Load recently played from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentlyPlayed');
    if (saved) {
      try {
        setRecentlyPlayed(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recently played', e);
      }
    }
  }, []);

  // Automatically load DuckDuckGo when entering proxy tab
  useEffect(() => {
    if (activeTab === 'proxy' && !activeProxyUrl) {
      setActiveProxyUrl('https://duckduckgo.com');
    }
  }, [activeTab, activeProxyUrl]);

  const filteredGames = useMemo(() => {
    return gamesData.filter((game) =>
      game.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const featuredGames = useMemo(() => {
    return gamesData.slice(0, 4);
  }, []);

  const handleGameSelect = (game) => {
    setSelectedGame(game);
    
    // Update recently played
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((p) => p.id !== game.id);
      const updated = [game, ...filtered].slice(0, 4);
      localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setRequestStatus('submitting');
    
    // Sanitize URL
    let sanitizedUrl = formData.url.trim();
    if (sanitizedUrl && !sanitizedUrl.startsWith('http')) {
      sanitizedUrl = `https://${sanitizedUrl}`;
    }

    try {
      const response = await fetch('https://formspree.io/f/xvgzpbrq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'ps604712@gmail.com', 
          ...formData,
          url: sanitizedUrl 
        })
      });

      if (response.ok) {
        setRequestStatus('success');
        setFormData({ title: '', url: '', message: '' });
        setTimeout(() => {
          setIsRequestModalOpen(false);
          setRequestStatus('idle');
        }, 2000);
      } else {
        setRequestStatus('error');
      }
    } catch (error) {
      setRequestStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-blue-900/30">
      {/* Navigation Rail / Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="bg-blue-950 p-2.5 rounded-xl shadow-lg shadow-black/60 group-hover:scale-110 transition-transform border border-blue-900/30">
                <Gamepad2 className="w-6 h-6 text-blue-100" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic">Artice Rooted</span>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'home' ? 'bg-blue-950 text-blue-100 shadow-lg shadow-black/60 border border-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <HomeIcon className="w-4 h-4" /> Home
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'games' ? 'bg-blue-950 text-blue-100 shadow-lg shadow-black/60 border border-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Games
              </button>
              <button
                onClick={() => setActiveTab('proxy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'proxy' ? 'bg-blue-950 text-blue-100 shadow-lg shadow-black/60 border border-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ExternalLink className="w-4 h-4" /> Proxy
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative max-w-xs hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Find a game..."
                className="w-64 pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-950/50 transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'games') setActiveTab('games');
                }}
              />
            </div>
            <button 
              onClick={() => setIsRequestModalOpen(true)}
              className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-blue-100 text-sm font-bold rounded-xl transition-all shadow-lg shadow-black/60 active:scale-95 border border-blue-900/30"
            >
              Request
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-16"
            >
              {/* Hero Section */}
              <section className="relative py-16 sm:py-24 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-950 to-slate-950 border border-blue-950/50 flex flex-col items-center text-center">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="relative z-10 px-8 sm:px-12 max-w-3xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-950/80 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6 border border-blue-900/60">
                      Unblocked & Ready
                    </span>
                    <h2 className="text-5xl sm:text-8xl font-black tracking-tight mb-8 leading-[0.85]">
                      PLAY WITHOUT <br />
                      <span className="text-blue-900">LIMITS.</span>
                    </h2>
                    <p className="text-slate-400 text-lg sm:text-xl mb-12 max-w-xl mx-auto leading-relaxed">
                      Experience the ultimate collection of unblocked games. Fast, free, and always accessible from anywhere.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <button 
                        onClick={() => setActiveTab('games')}
                        className="px-10 py-5 bg-blue-950 hover:bg-blue-900 text-blue-100 font-black rounded-2xl transition-all flex items-center gap-2 group shadow-xl shadow-black/60 border border-blue-900/30"
                      >
                        BROWSE ALL <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-950/10 blur-[120px] rounded-full -z-10"></div>
                <div className="absolute -bottom-12 -right-12 opacity-10 hidden lg:block">
                  <Gamepad2 className="w-80 h-80 text-blue-900 -rotate-12" />
                </div>
                <div className="absolute -top-12 -left-12 opacity-10 hidden lg:block">
                  <Gamepad2 className="w-80 h-80 text-blue-900 rotate-45" />
                </div>
              </section>

              {/* Recently Played */}
              {recentlyPlayed.length > 0 && (
                <section className="space-y-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="bg-blue-950/80 p-3 rounded-2xl border border-blue-900/60">
                      <Clock className="w-6 h-6 text-blue-800" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight uppercase italic">Recently Played</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {recentlyPlayed.map((game) => (
                      <GameCard key={`recent-${game.id}`} game={game} onClick={() => handleGameSelect(game)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Featured Games */}
              <section className="space-y-8">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20">
                    <Flame className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight uppercase italic">Trending Now</h3>
                  <button onClick={() => setActiveTab('games')} className="text-blue-800 hover:text-blue-700 text-sm font-bold flex items-center gap-1 transition-colors">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {featuredGames.map((game) => (
                    <GameCard key={`featured-${game.id}`} game={game} onClick={() => handleGameSelect(game)} />
                  ))}
                </div>
              </section>
            </motion.div>
          ) : activeTab === 'games' ? (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-12"
            >
              <div className="flex flex-col items-center justify-center gap-6 text-center">
                <h2 className="text-5xl font-black tracking-tight uppercase italic">ALL GAMES</h2>
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search library..."
                    className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-950/50 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredGames.map((game) => (
                  <GameCard key={game.id} game={game} onClick={() => handleGameSelect(game)} />
                ))}
              </div>

              {filteredGames.length === 0 && (
                <div className="text-center py-32 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                  <Gamepad2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 text-xl font-medium">No games found matching your search.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="proxy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="h-[calc(100vh-160px)]"
            >
              <div className={`w-full h-full bg-black overflow-hidden border border-slate-800 shadow-2xl transition-all duration-500 ${isProxyFullscreen ? 'fixed inset-0 z-[100] rounded-0' : 'rounded-3xl'}`}>
                <div className="bg-slate-900/90 border-b border-slate-800 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-950 p-1 rounded-lg border border-blue-900/30">
                      <ExternalLink className="w-3 h-3 text-blue-100" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[300px]">
                      {activeProxyUrl || 'DuckDuckGo Search'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveProxyUrl('https://duckduckgo.com')}
                      className="px-2 py-1 hover:bg-slate-800 rounded-lg text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all border border-slate-800"
                    >
                      Home
                    </button>
                    <button 
                      onClick={() => setIsProxyFullscreen(!isProxyFullscreen)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <iframe 
                  src={`/api/proxy/${activeProxyUrl || 'https://duckduckgo.com'}`} 
                  className="w-full h-[calc(100%-40px)] border-none" 
                  title="Proxy Browser"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Game Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md"
          >
            <motion.div
              layoutId={selectedGame.id}
              className={`bg-[#0f172a] w-full h-full flex flex-col overflow-hidden shadow-2xl border border-slate-800 ${
                isFullscreen ? 'sm:p-0' : 'sm:rounded-3xl sm:max-w-6xl sm:max-h-[90vh]'
              }`}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700">
                    <img src={selectedGame.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white truncate max-w-[180px] sm:max-w-md uppercase italic">
                    {selectedGame.title}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 mr-2 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proxy</span>
                    <button 
                      onClick={() => setUseProxy(!useProxy)}
                      className={`w-8 h-4 rounded-full relative transition-colors ${useProxy ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${useProxy ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                  <button onClick={toggleFullscreen} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <a href={selectedGame.url} target="_blank" rel="noopener noreferrer" className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button onClick={() => { setSelectedGame(null); setIsFullscreen(false); }} className="p-2.5 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-400 transition-all active:scale-90">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-black relative">
                <iframe src={useProxy ? `/api/proxy/${selectedGame.url}` : selectedGame.url} className="w-full h-full border-none" title={selectedGame.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>

              {!isFullscreen && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-800/50 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>Artice Rooted Engine</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span>Source: {new URL(selectedGame.url).hostname}</span>
                  </div>
                  <div className="hidden sm:block">Enjoy your session</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] w-full max-w-md rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
            >
              <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight uppercase italic">Request Game</h2>
                <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleRequestSubmit} className="p-8 space-y-6">
                {requestStatus === 'success' ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                      <Gamepad2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic">Sent!</h3>
                    <p className="text-slate-400">Your request is in the queue.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-900/40 px-5 py-3 rounded-2xl border border-blue-500/30 text-blue-100 text-xs font-bold text-center mb-2 shadow-lg">
                      ⚠️ IMPORTANT: You MUST include <span className="text-cyan-400 underline">https://</span> before the link (e.g. <span className="italic">https://google.com</span>)
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Game Title</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-950 outline-none transition-all" placeholder="e.g. Minecraft" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">URL (Optional)</label>
                      <input type="text" className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-950 outline-none transition-all" placeholder="https://..." value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Message</label>
                      <textarea rows={3} className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:ring-2 focus:ring-blue-950 outline-none transition-all resize-none" placeholder="Details..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
                    </div>
                    
                    {requestStatus === 'error' && <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Error. Try again.</p>}

                    <button type="submit" disabled={requestStatus === 'submitting'} className="w-full py-5 bg-blue-950 hover:bg-blue-900 disabled:bg-blue-950 text-blue-100 font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/60 active:scale-95 border border-blue-900/30">
                      {requestStatus === 'submitting' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
                    </button>
                  </>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-blue-950 p-2 rounded-lg border border-blue-900/30">
              <Gamepad2 className="w-5 h-5 text-blue-100" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic">Artice Rooted</span>
          </div>
          <p className="text-slate-500 max-w-md mx-auto mb-10 leading-relaxed">
            The premier destination for unblocked entertainment. Built for speed, designed for gamers.
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            <button onClick={() => setActiveTab('home')} className="hover:text-blue-800 transition-colors">Home</button>
            <button onClick={() => setActiveTab('games')} className="hover:text-blue-700 transition-colors">Library</button>
            <button onClick={() => setIsRequestModalOpen(true)} className="hover:text-blue-800 transition-colors">Request</button>
          </div>
          <div className="mt-20 pt-8 border-t border-slate-900 text-[10px] uppercase tracking-[0.3em] text-slate-700">
            © 2026 Artice Rooted. Engineered for Excellence.
          </div>
        </div>
      </footer>
    </div>
  );
}

function GameCard({ game, onClick }) {
  return (
    <motion.div
      layoutId={game.id}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.96 }}
      className="group relative bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-800/50 cursor-pointer transition-all hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10"
      onClick={onClick}
    >
      <div className="aspect-[16/10] w-full overflow-hidden relative">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-900 p-2 rounded-xl shadow-lg">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-slate-100 truncate uppercase tracking-tight italic group-hover:text-blue-600 transition-colors">{game.title}</h3>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">Unblocked</span>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-blue-950/40 text-blue-700 border border-blue-900/40">HTML5</span>
        </div>
      </div>
    </motion.div>
  );
}
