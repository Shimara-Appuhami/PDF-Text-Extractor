import React, { useState, useCallback, useRef, useEffect } from 'react';
import Highlighter from 'react-highlight-words';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
try {
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  }
} catch (e) {
}

const PdfTextExtractor = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('extracted.txt');
  const [keywords, setKeywords] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);
  const [highlightCounts, setHighlightCounts] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [fileMeta, setFileMeta] = useState(null); 
  const fileInputRef = useRef();

  const processFile = async (file) => {
    if (!file) return;
    setFileName(file.name.replace(/\.pdf$/i, '') + '-extracted.txt');
    setFileMeta({ name: file.name, size: file.size, pages: null });
    setError(null);
    setText('');
    setLoading(true);
    setProgress({ current: 0, total: 0 });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      setProgress({ current: 0, total: pdf.numPages });
      setFileMeta(m => m ? { ...m, pages: pdf.numPages } : m);
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(' ') + '\n\n';
        setProgress(prev => ({ ...prev, current: pageNum }));
      }
      setText(fullText.trim());
    } catch (err) {
      console.error(err);
      setError('Failed to extract text from PDF.');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  // drag & drop
  const dropRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropRef.current) setIsDragOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /\.pdf$/i.test(file.name)) {
      processFile(file);
    } else if (file) {
      setError('Please drop a PDF file.');
    }
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }, [text]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [text, fileName]);

  const clearFile = () => {
    setText('');
    setError(null);
    setKeywords('');
    setProgress({ current: 0, total: 0 });
    setHighlightCounts({});
    setFileMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const keywordArray = keywords.split(',').map(k => k.trim()).filter(Boolean);

  useEffect(() => {
    try {
      const storedDark = localStorage.getItem('pte:dark');
      if (storedDark != null) setDark(storedDark === 'true');
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { try { localStorage.setItem('pte:dark', String(dark)); } catch(_){} }, [dark]);

  useEffect(() => {
    try {
      const hasStored = localStorage.getItem('pte:dark');
      if (!hasStored && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDark(true);
      }
    } catch(_){}
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 780px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!text || keywordArray.length === 0) { setHighlightCounts({}); return; }
    const lcText = text.toLowerCase();
    const counts = {};
    keywordArray.forEach(k => {
      const needle = k.toLowerCase();
      let idx = 0, c = 0;
      while ((idx = lcText.indexOf(needle, idx)) !== -1) { c++; idx += needle.length; }
      counts[k] = c;
    });
    setHighlightCounts(counts);
  }, [text, keywords]);

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;
  const pageCount = progress.total || (text ? undefined : 0);

  const modeClass = dark ? 'dark' : '';

  return (
  <div className={`${modeClass} font-sans text-slate-800 dark:text-slate-100 transition-colors min-h-screen bg-slate-50 dark:bg-slate-900`}> 
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <nav className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 px-4 py-3 shadow-panel text-white mb-4" role="navigation" aria-label="Main">
        <div className="flex items-center gap-2 font-semibold tracking-wide"><span aria-hidden className="text-xl">📄</span><span>PDF Extractor</span></div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-md bg-white/15 hover:bg-white/25 transition border border-white/30 backdrop-blur-sm"
            aria-pressed={sidebarOpen}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setSidebarOpen(o => !o)}
          >
            {sidebarOpen ? '⟨' : '⟩'}
          </button>
          <button
            type="button"
            onClick={() => setDark(d => !d)}
            aria-label="Toggle dark mode"
            className="inline-flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-white/15 hover:bg-white/25 transition border border-white/30"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
      </nav>
      <div className="flex gap-4 relative" >
        <aside className={`${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} ${isMobile ? 'fixed z-50 top-24 left-0 h-[calc(100vh-6rem)] w-72' : 'w-80'} transition-all duration-300 flex flex-col gap-4 bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 backdrop-blur-xl shadow-panel overflow-y-auto`} aria-label="Controls panel">
          <div
            ref={dropRef}
            className={`relative border-2 border-dashed rounded-lg p-4 text-center transition ${isDragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-300 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/40'} cursor-pointer`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <p className="text-sm font-medium"><strong>Drag & Drop</strong> PDF or choose</p>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={onFileChange} />
          </div>
          <div className="flex flex-wrap gap-2">
            {text && <button className="btn-tw disabled:opacity-50" onClick={handleCopy} disabled={!text}>{copied ? 'Copied!' : 'Copy All'}</button>}
            {text && <button className="btn-outline-tw disabled:opacity-50" onClick={handleDownload} disabled={!text}>Download</button>}
            {text && <button className="btn-ghost-tw" onClick={clearFile}>Clear</button>}
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">Highlight keywords</label>
            <input
              type="text"
              placeholder="contract, total, client"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 dark:focus:ring-indigo-500/60"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
            />
            {keywordArray.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-2 text-xs">
                {keywordArray.map(k => (
                  <li key={k} className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 font-medium">{k}: {highlightCounts[k] ?? 0}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">Stats</h3>
            <ul className="space-y-1 text-sm">
              {pageCount !== undefined && <li className="flex justify-between"><span>Pages</span><span className="font-medium">{progress.total || '—'}</span></li>}
              <li className="flex justify-between"><span>Words</span><span className="font-medium">{wordCount}</span></li>
              <li className="flex justify-between"><span>Characters</span><span className="font-medium">{charCount}</span></li>
            </ul>
          </div>
          {fileMeta && (
            <div className="space-y-2" aria-label="File information">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">File</h3>
              <ul className="text-sm space-y-1">
                <li title={fileMeta.name}><span className="font-medium">Name:</span> {fileMeta.name.length > 28 ? fileMeta.name.slice(0,25)+'…' : fileMeta.name}</li>
                <li><span className="font-medium">Size:</span> {(fileMeta.size/1024).toFixed(1)} KB</li>
                {fileMeta.pages && <li><span className="font-medium">Pages:</span> {fileMeta.pages}</li>}
              </ul>
            </div>
          )}
          {loading && (
            <div className="space-y-2">
              <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600 transition-all" style={{ width: progress.total ? `${(progress.current / progress.total) * 100}%` : '0%' }} />
              </div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Extracting page {progress.current} of {progress.total}…</span>
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2" role="alert">{error}</p>}
        </aside>
        {/* content area */}
        <main className="flex-1 flex flex-col gap-4" role="main" onClick={() => { if(isMobile && sidebarOpen) setSidebarOpen(false); }}>
          <h1 className="sr-only">PDF Text Extractor</h1>
          {!text && !loading && (
            <div className="flex items-center justify-center h-[55vh] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400">
              <p className="text-sm">No text extracted yet.</p>
            </div>
          )}
          {text && !loading && (
            <div className="panel scroll-thin max-h-[70vh] overflow-auto text-sm leading-relaxed font-mono whitespace-pre-wrap" data-testid="extracted-text">
              {keywordArray.length > 0 ? (
                <Highlighter
                  highlightClassName="highlight"
                  searchWords={keywordArray}
                  autoEscape={true}
                  textToHighlight={text}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words">{text}</pre>
              )}
            </div>
          )}
          {isMobile && text && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 backdrop-blur-xl rounded-full px-3 py-2 shadow-panel" aria-label="Quick actions">
              <button className="btn-tw !px-4 !py-2" onClick={handleCopy} disabled={!text}>{copied ? 'Copied!' : 'Copy'}</button>
              <button className="btn-outline-tw !px-4 !py-2" onClick={handleDownload} disabled={!text}>Download</button>
              <button className="btn-ghost-tw !px-4 !py-2" onClick={clearFile}>Clear</button>
              <button className="btn-outline-tw !px-3 !py-2" aria-label="Show sidebar" onClick={() => setSidebarOpen(true)}>☰</button>
            </div>
          )}
        </main>
      </div>
    </div>
  </div>
  );
};

export default PdfTextExtractor;
