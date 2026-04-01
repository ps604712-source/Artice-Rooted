import { useState, useMemo } from 'react';
import { Search, Gamepad2, X, Maximize2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gamesData from './games.json';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filteredGames = useMemo(() => {
    return gamesData.filter((game) =>
      game.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Unblocked Games
            </h1>
          </div>

          <div className="relative max-w-md w-full ml-4 hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-full bg-slate-800/50 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all sm:text-sm"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Mobile Search */}
      <div className="sm:hidden p-4 border-b border-slate-800 bg-[#0f172a]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-full bg-slate-800/50 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredGames.map((game) => (
            <motion.div
              key={game.id}
              layoutId={game.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 cursor-pointer shadow-lg hover:shadow-indigo-500/10 transition-all"
              onClick={() => setSelectedGame(game)}
            >
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-100 truncate">{game.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">Unblocked</span>
                  <span className="text-xs px-2 py-1 rounded bg-indigo-900/30 text-indigo-400 border border-indigo-500/20">HTML5</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
            <p className="text-slate-400 text-lg">No games found matching "{searchQuery}"</p>
          </div>
        )}
      </main>

      {/* Game Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              layoutId={selectedGame.id}
              className={`bg-slate-900 w-full h-full flex flex-col overflow-hidden shadow-2xl ${
                isFullscreen ? 'sm:p-0' : 'sm:rounded-2xl sm:max-w-5xl sm:max-h-[90vh]'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white truncate max-w-[200px] sm:max-w-md">
                    {selectedGame.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <a
                    href={selectedGame.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => {
                      setSelectedGame(null);
                      setIsFullscreen(false);
                    }}
                    className="p-2 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Game Iframe Container */}
              <div className="flex-1 bg-black relative">
                <iframe
                  src={selectedGame.url}
                  className="w-full h-full border-none"
                  title={selectedGame.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Modal Footer */}
              {!isFullscreen && (
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <p>Playing on Unblocked Games Portal</p>
                  <p>Source: {new URL(selectedGame.url).hostname}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 mt-12 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gamepad2 className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-slate-300">Unblocked Games</span>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            A simple portal for playing your favorite unblocked games directly in your browser.
          </p>
          <div className="flex justify-center gap-8 text-slate-400 text-sm">
            <a href="#" className="hover:text-indigo-400 transition-colors">Home</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">New Games</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Popular</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Request a Game</a>
          </div>
          <p className="mt-12 text-slate-600 text-xs">
            © 2026 Unblocked Games Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
