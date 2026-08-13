import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface Message {
  role: 'user' | 'ai';
  content: string | React.ReactNode;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('leadhunter_chats');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch(e) {
            console.error("Failed to parse chats", e);
        }
    }
    return [{ id: '1', title: 'New Session', messages: [], updatedAt: Date.now() }];
  });

  const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastNiche, setLastNiche] = useState<string>('');
  
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    const saved = localStorage.getItem('leadhunter_api_base');
    if (!saved || saved.includes('5173')) return 'http://localhost:3000';
    return saved;
  });

  const [lhCreds, setLhCreds] = useState(() => {
    const saved = localStorage.getItem('leadhunter_lh_auth');
    return saved ? JSON.parse(saved) : { user: 'noble@shopnoble@shop', pass: 'strong' };
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat.messages, loading]);

  useEffect(() => { localStorage.setItem('leadhunter_api_base', apiBaseUrl); }, [apiBaseUrl]);
  useEffect(() => { localStorage.setItem('leadhunter_lh_auth', JSON.stringify(lhCreds)); }, [lhCreds]);
  useEffect(() => {
    const serializable = chats.map(c => ({
      ...c,
      messages: c.messages.map(m => ({ ...m, content: typeof m.content === 'string' ? m.content : '[Dynamic Content]' }))
    }));
    localStorage.setItem('leadhunter_chats', JSON.stringify(serializable));
  }, [chats]);

  const industryKeywords: Record<string, string[]> = {
    'dentist': ['Dental Clinic', 'Orthodontist', 'Dental Surgery', 'Cosmetic Dentistry', 'Teeth Whitening'],
    'plumber': ['Emergency Plumber', 'Drain Cleaning', 'Heating Engineer', 'Plumbing Contractor'],
    'realtor': ['Real Estate Agency', 'Property Management', 'Letting Agents', 'Commercial Real Estate'],
    'gym': ['Fitness Center', 'Crossfit Box', 'Personal Trainer', 'Yoga Studio', 'Health Club'],
    'restaurant': ['Fine Dining', 'Italian Restaurant', 'Fast Food', 'Cafe', 'Bistro']
  };

  const createNewChat = () => {
    const newChat: Chat = { id: Date.now().toString(), title: 'New Session', messages: [], updatedAt: Date.now() };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== id);
    if (newChats.length === 0) {
        createNewChat();
        return;
    }
    setChats(newChats);
    if (activeChatId === id) setActiveChatId(newChats[0].id);
  };

  const handleDirectCommand = (cmd: string) => {
    handleSubmit(undefined, cmd);
  };

  const processCommand = async (prompt: string): Promise<Message> => {
    const p = prompt.toLowerCase();

    // 1. SCRAPE
    if (p.includes('scrape') || p.includes('find')) {
      const match = prompt.match(/(?:scrape|find)\s+(.+?)\s+in\s+(.+)/i);
      if (match) {
        const niche = match[1].toLowerCase().trim();
        const location = match[2].trim();
        setLastNiche(niche);
        const keywords = industryKeywords[niche] || [niche];
        
        try {
          const res = await fetch(`${apiBaseUrl}/api/scraper/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ niche, location, keywords, credentials: lhCreds })
          });
          if (!res.ok) throw new Error('Offline');
          return generateScrapeResponse(niche, location, keywords);
        } catch (e) {
          return generateScrapeResponse(niche, location, keywords, true);
        }
      }
    }

    // 2. RUN CAMPAIGN
    if (p.includes('run campaign')) {
      try {
        const campaignName = lastNiche ? `${lastNiche.charAt(0).toUpperCase() + lastNiche.slice(1)} Outreach` : "Lead Outreach";
        const res = await fetch(`${apiBaseUrl}/api/sender/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: campaignName, 
            subject: `Partnership for ${lastNiche || 'your business'}`, 
            html: `<p>Hello, we have some leads for ${lastNiche || 'you'}.</p>`, 
            recipients: ["user@example.com"], 
            smtpAccountIds: ["default-id"],
            credentials: lhCreds
          })
        });
        if (!res.ok) throw new Error('Offline');
        return { role: 'ai', content: '🚀 Campaign triggered on LeadHunter! The outreach process has started in the background.' };
      } catch (e) {
        return { role: 'ai', content: '🚀 [SIMULATION] Campaign triggered! Backend link simulated.' };
      }
    }

    return {
      role: 'ai',
      content: (
        <div>
          <p>I didn't recognize that command. Use:</p>
          <ul style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
            <li><code>scrape [niche] in [location]</code></li>
            <li><code>run campaign</code></li>
          </ul>
        </div>
      )
    };
  };

  const generateScrapeResponse = (niche: string, location: string, keywords: string[], isSimulated = false) => {
    return {
      role: 'ai',
      content: (
        <div className="ai-response-container">
          <p>🚀 <strong>Scraper Triggered on LeadHunter!</strong></p>
          <div style={{background: 'rgba(0,0,0,0.03)', padding: '0.75rem', borderRadius: '8px', margin: '0.5rem 0'}}>
            <p style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Keywords used:</p>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem'}}>
              {keywords.map((k, i) => (
                <span key={i} style={{fontSize: '0.7rem', background: 'white', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ddd'}}>{k}</span>
              ))}
            </div>
          </div>
          <p style={{fontSize: '0.85rem'}}>Searching <strong>{location}</strong>. Process running in background.</p>
          <div style={{marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
             <p style={{fontSize: '0.8rem', marginBottom: '0.5rem'}}>Start outreach for these leads?</p>
             <button className="primary-action-btn" style={{padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginTop: 0}} onClick={() => handleDirectCommand('run campaign')}>
               🚀 Yes, Run Campaign
             </button>
          </div>
          {isSimulated && <p className="small-text" style={{color: '#f59e0b'}}>Backend offline. Trigger simulated.</p>}
        </div>
      )
    } as Message;
  };

  const handleSubmit = async (e?: React.FormEvent, overrideMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = (overrideMsg || input).trim();
    if (!userMsg || loading) return;

    setChats(prev => prev.map(c => 
      c.id === activeChatId 
        ? { ...c, messages: [...c.messages, { role: 'user', content: userMsg }], updatedAt: Date.now() } 
        : c
    ));
    
    if (!overrideMsg) setInput('');
    setLoading(true);

    const aiMessage = await processCommand(userMsg);

    setChats(prev => prev.map(c => 
      c.id === activeChatId 
        ? { ...c, messages: [...c.messages, aiMessage], updatedAt: Date.now() } 
        : c
    ));
    setLoading(false);
  };

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewChat}><span className="plus-icon">+</span> New Session</button>
        </div>
        <div className="chat-history">
          <div className="history-label">Session History</div>
          {chats.map(chat => (
            <div key={chat.id} className={`history-item ${chat.id === activeChatId ? 'active' : ''}`} onClick={() => setActiveChatId(chat.id)}>
              <span className="chat-icon">⚡</span>
              <span className="chat-title">{chat.title === 'New Session' && chat.messages.length > 0 ? (typeof chat.messages[0].content === 'string' ? chat.messages[0].content : 'Scrape Task') : chat.title}</span>
              <button className="delete-chat" onClick={(e) => deleteChat(e, chat.id)}>×</button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="lh-auth-card">
            <h4>🔑 LeadHunter Portal</h4>
            <div className="mini-form">
              <input type="text" placeholder="Username" value={lhCreds.user} onChange={e => setLhCreds({...lhCreds, user: e.target.value})} />
              <input type="password" placeholder="Password" value={lhCreds.pass} onChange={e => setLhCreds({...lhCreds, pass: e.target.value})} />
            </div>
          </div>
          <div className="webhook-config" style={{marginTop: '1rem'}}>
            <label>API Base URL</label>
            <input type="text" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} placeholder="http://localhost:3000" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem', borderRadius: '4px', fontSize: '0.7rem', width: '100%'}} />
          </div>
          <div className="status-badge"><span className="dot active"></span> Backend Sync Ready</div>
        </div>
      </aside>

      <main className="main-content">
        <nav className="navbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '⇠' : '⇢'}</button>
          <div className="brand"><span className="brand-text">LeadHunter <span className="text-gradient">Automator</span></span></div>
        </nav>
        <div className="chat-container">
          <div className="chat-window" ref={scrollRef}>
            {activeChat.messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-content">
                  <div className="bot-avatar">LH</div>
                  <h1>Direct Command Center</h1>
                  <p>Bina AI ke, direct API triggers ke zariye LeadHunter manage karein.</p>
                  <div className="command-box-grid">
                    <div className="command-card">
                      <h5>🔍 Lead Scraping</h5>
                      <p><code>scrape [niche] in [location]</code></p>
                      <button onClick={() => handleDirectCommand('scrape dentists in London')}>Try: "scrape dentists"</button>
                    </div>
                    <div className="command-card">
                      <h5>🚀 Launch Campaign</h5>
                      <p><code>run campaign</code></p>
                      <button onClick={() => handleDirectCommand('run campaign')}>Try: "run campaign"</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {activeChat.messages.map((msg, i) => (
                  <div key={i} className={`message-row ${msg.role}`}>
                    <div className="message-bubble">{typeof msg.content === 'string' ? msg.content : msg.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="message-row ai">
                    <div className="message-bubble loading"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="input-area">
            <form className="input-wrapper" onSubmit={(e) => handleSubmit(e)}>
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type your command..." disabled={loading} />
              <button type="submit" disabled={!input.trim() || loading} className="send-btn">{loading ? '...' : '↑'}</button>
            </form>
            <p className="chat-disclaimer">LeadHunter Session Active: {lhCreds.user}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
