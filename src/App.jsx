import React, { useState, useEffect, useRef } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePage, setActivePage] = useState("home"); 
  const [activeSubject, setActiveSubject] = useState("Physics"); 
  
  // 📚 DATABASE STATE (Added pdfUrl support)
  const [roadmapItems, setRoadmapItems] = useState([
    { id: 1, category: "Class 12", subject: "Physics", chapter: "CHAPTER 01", title: "Kinematics & Motion", source: "Khan Academy", videoId: "8mhuGJUz2GU", notes: "Kinematics is the branch of mechanics concerned with the motion of objects without reference to the forces which cause the motion.", pdfUrl: "" },
    { id: 2, category: "College Tech", subject: "C Programming", chapter: "MODULE 01", title: "Pointers & Memory", source: "Study House Originals", videoId: "zuegQmMdy8M", notes: "A pointer is a variable that stores the memory address of another variable.", pdfUrl: "" }
  ]);

  // 🛠️ ADMIN STATE (Added pdfUrl field)
  const [newLecture, setNewLecture] = useState({ 
    category: "", subject: "", chapter: "", title: "", source: "", videoId: "", notes: "", pdfUrl: "" 
  });

  // 🗺️ SKILL TREE STATE (Gamified Career Paths)
  const [activeCareer, setActiveCareer] = useState("Web Developer");
  const skillTrees = {
    "Web Developer": [
      { id: 1, level: "LVL 1", title: "Frontend Foundation", desc: "HTML5, CSS3, JavaScript Basics", icon: "🌐", unlocked: true },
      { id: 2, level: "LVL 2", title: "Modern UI / Frameworks", desc: "React.js, Vite, Tailwind CSS", icon: "⚛️", unlocked: true },
      { id: 3, level: "LVL 3", title: "Backend & APIs", desc: "Node.js, Express, REST APIs", icon: "⚙️", unlocked: false },
      { id: 4, level: "LVL 4", title: "Database & Cloud", desc: "Firebase, MongoDB, AWS", icon: "☁️", unlocked: false }
    ],
    "Computer Applications": [
      { id: 1, level: "LVL 1", title: "C Programming Core", desc: "Variables, Loops, Pointers", icon: "💻", unlocked: true },
      { id: 2, level: "LVL 2", title: "Digital Electronics", desc: "Logic Gates, K-Maps", icon: "🔌", unlocked: false },
      { id: 3, level: "LVL 3", title: "Data Structures", desc: "Arrays, Linked Lists, Trees", icon: "🗄️", unlocked: false }
    ]
  };

  // ⚡ FLASH & MEMORY STATES
  const [aiTopicInput, setAiTopicInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFlashDeck, setActiveFlashDeck] = useState(null); 
  const [personalCards, setPersonalCards] = useState([
    { id: 1, question: "What is a Pointer in C?", answer: "A variable that stores the memory address of another variable." }
  ]);
  const [newCard, setNewCard] = useState({ question: "", answer: "" });
  const [flippedCards, setFlippedCards] = useState({}); 

  // 🎥 UI & OVERLAY STATES
  const [activeVideo, setActiveVideo] = useState(null); 
  const [activeNote, setActiveNote] = useState(null); 
  const [activePdf, setActivePdf] = useState(null); // 🌟 NEW: PDF Viewer State
  const [showChat, setShowChat] = useState(false); 
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([{ sender: "ai", text: "Ready to level up? Ask me anything." }]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const generateAIFlashcards = (topicName) => {
    if (!topicName.trim()) return alert("Enter a topic first!");
    setIsGenerating(true);
    setTimeout(() => {
      const generatedPoints = [
        `🧠 Core Concept: ${topicName} involves mastering foundational principles before advancing.`,
        `⚠️ Common Mistake: Many students misapply the standard formula here. Double-check your signs!`,
        `💡 Pro Tip: Isolate your variables before attempting to solve the entire equation.`,
        `🎯 Exam Focus: This specific topic appears in 85% of standard final exams.`
      ];
      setActiveFlashDeck({ title: topicName, points: generatedPoints });
      setIsGenerating(false);
    }, 1500);
  };

  const handleAddPersonalCard = (e) => {
    e.preventDefault();
    if (!newCard.question || !newCard.answer) return;
    setPersonalCards([{ ...newCard, id: Date.now() }, ...personalCards]);
    setNewCard({ question: "", answer: "" });
  };

  const toggleCardFlip = (id) => setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages([...messages, { sender: "user", text: chatInput }]);
    setChatInput("");
    setTimeout(() => setMessages(prev => [...prev, { sender: "ai", text: "Scanning the Mainframe... I found the exact concept you need to review!" }]), 1000);
  };

  const handleAddLecture = (e) => {
    e.preventDefault();
    if(!newLecture.title || !newLecture.category || !newLecture.subject) return alert("Fill required fields!");
    
    // 🌟 Format Google Drive links automatically to "preview" mode so they work in iframes
    let finalPdfUrl = newLecture.pdfUrl;
    if (finalPdfUrl && finalPdfUrl.includes("drive.google.com") && finalPdfUrl.includes("/view")) {
      finalPdfUrl = finalPdfUrl.replace("/view", "/preview").split("?")[0];
    }

    setRoadmapItems([...roadmapItems, { ...newLecture, pdfUrl: finalPdfUrl, id: Date.now() }]);
    setNewLecture({ category: "", subject: "", chapter: "", title: "", source: "", videoId: "", notes: "", pdfUrl: "" });
    setActivePage("hub"); 
  };

  const uniqueCategories = [...new Set(roadmapItems.map(item => item.category))];
  const [activeCategory, setActiveCategory] = useState(uniqueCategories[0] || "Class 12");

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
          * { box-sizing: border-box; }
          :root { color: #f8fafc !important; background-color: #09090b !important; }
          html, body { margin: 0 !important; padding: 0 !important; width: 100vw !important; background-color: #09090b; font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; }
          #root { max-width: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }

          .bg-glow { position: fixed; inset: 0; z-index: -1; background: #09090b; background-image: radial-gradient(circle at 15% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 40%), radial-gradient(circle at 85% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 40%); }
          .gaming-nav { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 1000px; background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 100px; padding: 12px 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5); z-index: 100; }
          .logo { font-size: 1.4rem; font-weight: 900; letter-spacing: -1px; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; }
          .logo span { color: #8b5cf6; }
          
          .btn-primary { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; border: none; padding: 10px 28px; border-radius: 50px; font-weight: 800; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; }
          .btn-primary:hover { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); transform: scale(1.05); }
          .btn-white { background: #ffffff !important; color: #09090b !important; border: none; padding: 14px 28px; border-radius: 50px; font-weight: 900; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; }
          .btn-white:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }

          .hero-container { padding: 160px 20px 60px; text-align: center; max-width: 800px; margin: 0 auto; }
          .hero-title { font-size: clamp(3rem, 10vw, 5rem); font-weight: 900; line-height: 1.1; letter-spacing: -2px; margin: 0 0 20px 0; color: #fff !important; }
          .hero-highlight { background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .search-wrapper { position: relative; max-width: 600px; margin: 40px auto 0; }
          .search-input { width: 100%; padding: 22px 30px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.1); background: rgba(24, 24, 27, 0.8); color: #fff; font-size: 1.1rem; outline: none; transition: 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
          .search-input:focus { border-color: #8b5cf6; box-shadow: 0 0 25px rgba(139, 92, 246, 0.2), inset 0 2px 4px rgba(0,0,0,0.5); }

          .bento-grid { display: grid; max-width: 1100px; margin: 0 auto 100px; padding: 0 20px; gap: 24px; grid-template-columns: repeat(3, 1fr); grid-auto-rows: minmax(180px, auto); }
          .neo-card { background: #18181b; border: 1px solid #27272a; border-radius: 32px; padding: 35px; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; display: flex; flex-direction: column; text-align: left; }
          .neo-card:hover { transform: translateY(-8px); border-color: #8b5cf6; box-shadow: 0 20px 40px -10px rgba(139, 92, 246, 0.15); }
          .xp-badge { position: absolute; top: 25px; right: 25px; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.2); }
          .card-icon { font-size: 2.5rem; margin-bottom: 20px; display: inline-block; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 20px; }
          .card-title { font-size: 1.6rem; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -0.5px; color: #fff !important; }
          .card-text { font-size: 1rem; color: #a1a1aa !important; line-height: 1.6; margin: 0; }
          .card-large { grid-column: span 2; grid-row: span 1; background: linear-gradient(145deg, #18181b, #09090b); }
          .card-medium { grid-column: span 1; grid-row: span 1; }
          .card-wide { grid-column: span 3; grid-row: span 1; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 30px; }

          .hub-container { max-width: 1100px; margin: 120px auto 100px; padding: 0 20px; }
          .back-btn { background: #18181b; color: #fff; border: 1px solid #27272a; padding: 10px 20px; border-radius: 50px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 30px; transition: 0.2s; }
          .back-btn:hover { background: #27272a; border-color: #3f3f46; }
          .subject-pills { display: flex; gap: 15px; margin-bottom: 40px; overflow-x: auto; padding-bottom: 10px; }
          .pill { padding: 12px 25px; border-radius: 50px; font-weight: 800; cursor: pointer; border: 1px solid #27272a; background: #18181b; color: #a1a1aa; transition: 0.3s; white-space: nowrap; }
          .pill.active { background: rgba(139, 92, 246, 0.1); color: #c4b5fd; border-color: #8b5cf6; box-shadow: 0 0 20px rgba(139, 92, 246, 0.2); }
          
          .roadmap-module { background: #18181b; border-radius: 24px; padding: 30px; border: 1px solid #27272a; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .roadmap-item { background: #09090b; border-radius: 16px; padding: 25px; margin-bottom: 15px; border: 1px solid #27272a; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; transition: 0.3s; }
          .roadmap-item:hover { border-color: #10b981; transform: translateX(5px); box-shadow: -5px 0 15px rgba(16, 185, 129, 0.1); }
          
          .btn-notes { background: #27272a; color: #fff; border: 1px solid #3f3f46; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
          .btn-notes:hover { background: #3f3f46; }
          .yt-btn { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; padding: 10px 20px; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
          .yt-btn:hover { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); transform: scale(1.05); }
          .speedrun-btn { background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 10px 20px; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
          .speedrun-btn:hover { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); transform: scale(1.05); }

          /* 🌟 NEW: SKILL TREE UI (RPG STYLE) */
          .tree-container { position: relative; display: flex; flex-direction: column; align-items: center; margin: 50px 0; }
          .tree-line { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: #27272a; transform: translateX(-50%); z-index: 0; }
          .tree-node-wrapper { display: flex; width: 100%; justify-content: center; position: relative; z-index: 1; margin-bottom: 40px; }
          .tree-card { width: 400px; background: #18181b; border: 2px solid #27272a; border-radius: 20px; padding: 25px; display: flex; align-items: center; gap: 20px; transition: 0.3s; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .tree-card.unlocked { border-color: #8b5cf6; box-shadow: 0 0 25px rgba(139, 92, 246, 0.15); }
          .tree-icon-box { font-size: 2.5rem; background: #09090b; padding: 20px; border-radius: 50%; border: 2px solid #27272a; display: flex; align-items: center; justify-content: center; }
          .tree-card.unlocked .tree-icon-box { border-color: #8b5cf6; box-shadow: inset 0 0 15px rgba(139, 92, 246, 0.3); }

          /* FLASH & MEMORY DASHBOARD */
          .flash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          .ai-generator-box { background: linear-gradient(145deg, #18181b, #09090b); border: 1px solid #8b5cf6; border-radius: 24px; padding: 30px; box-shadow: 0 0 30px rgba(139, 92, 246, 0.1); }
          .ai-input { width: 100%; padding: 15px 20px; border-radius: 12px; border: 1px solid #3f3f46; background: #09090b; color: #fff; font-size: 1.1rem; margin-bottom: 15px; outline: none; }
          .ai-input:focus { border-color: #8b5cf6; }
          .ai-generate-btn { width: 100%; padding: 15px; background: #8b5cf6; color: #fff; border: none; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; transition: 0.3s; }
          .ai-generate-btn:hover { background: #7c3aed; box-shadow: 0 10px 20px rgba(139, 92, 246, 0.4); }
          .memory-vault-box { background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 30px; }
          .memory-card { background: #09090b; border: 1px solid #3f3f46; border-radius: 16px; padding: 20px; margin-bottom: 15px; cursor: pointer; transition: 0.3s; position: relative; min-height: 100px; display: flex; align-items: center; justify-content: center; text-align: center; }
          .memory-card:hover { border-color: #10b981; }
          .card-front { font-size: 1.1rem; font-weight: 800; color: #fff; }
          .card-back { font-size: 1rem; color: #10b981; font-weight: 600; line-height: 1.5; }
          .add-card-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #27272a; }

          /* OVERLAYS & MODALS */
          .fullscreen-overlay { position: fixed; inset: 0; background: rgba(9,9,11,0.98); z-index: 3000; display: flex; flex-direction: column; overflow-y: auto; backdrop-filter: blur(10px); }
          .overlay-header { position: sticky; top: 0; background: rgba(9,9,11,0.9); backdrop-filter: blur(10px); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; z-index: 10; }
          .flash-card { background: #18181b; border: 2px solid #3f3f46; border-radius: 20px; padding: 30px; font-size: 1.25rem; font-weight: 600; color: #f8fafc; line-height: 1.6; margin-bottom: 20px; border-left: 5px solid #8b5cf6; }
          .reading-window { background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px; color: #e2e8f0; font-size: 1.15rem; line-height: 1.8; white-space: pre-wrap; font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
          .pdf-container { width: 100%; height: 80vh; border-radius: 20px; border: 1px solid #3f3f46; overflow: hidden; background: #fff; }
          
          /* ADMIN STYLES */
          .admin-form { background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
          .form-group { margin-bottom: 20px; text-align: left; }
          .form-label { display: block; color: #a1a1aa; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
          .form-input { width: 100%; padding: 15px; background: #09090b; border: 1px solid #3f3f46; color: #fff; border-radius: 12px; font-family: inherit; font-size: 1rem; outline: none; transition: 0.3s; }
          .form-input:focus { border-color: #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
          .form-textarea { width: 100%; padding: 15px; background: #09090b; border: 1px solid #3f3f46; color: #fff; border-radius: 12px; font-family: inherit; font-size: 1rem; outline: none; transition: 0.3s; min-height: 100px; resize: vertical; }
          .form-textarea:focus { border-color: #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
          .submit-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 12px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
          .submit-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); }

          /* VIDEO MODAL & CHATBOT */
          .video-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .iframe-container { width: 90%; max-width: 1000px; aspect-ratio: 16/9; border-radius: 24px; overflow: hidden; background: #000; border: 1px solid #3f3f46; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
          .close-video { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.2); padding: 10px 24px; border-radius: 50px; cursor: pointer; font-weight: 800; margin-bottom: 20px; transition: 0.2s; }
          .close-video:hover { background: #fff; color: #000; }

          .floating-chatbot { position: fixed; bottom: 30px; right: 30px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; padding: 16px 28px; border-radius: 50px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4); border: none; cursor: pointer; font-weight: 800; transition: 0.3s; z-index: 1000; text-transform: uppercase; font-size: 0.9rem; }
          .floating-chatbot:hover { transform: translateY(-5px) scale(1.05); }
          .chatbot-dot { width: 10px; height: 10px; background: #fff; border-radius: 50%; box-shadow: 0 0 10px #fff; animation: pulse 2s infinite; }
          .chat-window { position: fixed; bottom: 90px; right: 30px; width: 380px; height: 550px; background: #18181b; border-radius: 24px; box-shadow: 0 25px 50px rgba(0,0,0,0.8); border: 1px solid #27272a; display: flex; flex-direction: column; z-index: 1000; overflow: hidden; animation: slideUp 0.3s ease-out; }
          .chat-header { background: #09090b; color: #fff; padding: 20px; display: flex; justify-content: space-between; align-items: center; font-weight: 800; border-bottom: 1px solid #27272a; }
          .chat-messages { flex-grow: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
          .msg { padding: 14px 18px; border-radius: 16px; font-size: 0.95rem; max-width: 85%; line-height: 1.5; font-weight: 500; }
          .msg.ai { background: #27272a; color: #fff; align-self: flex-start; border-bottom-left-radius: 4px; border: 1px solid #3f3f46; }
          .msg.user { background: #8b5cf6; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
          .chat-input-area { padding: 15px; background: #09090b; border-top: 1px solid #27272a; display: flex; gap: 10px; }
          .chat-input { flex-grow: 1; padding: 14px 18px; border-radius: 12px; border: 1px solid #3f3f46; background: #18181b; color: #fff; outline: none; }
          .chat-input:focus { border-color: #8b5cf6; }
          .chat-send { background: #8b5cf6; color: #fff; border: none; padding: 0 20px; border-radius: 12px; font-weight: 800; cursor: pointer; }

          @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

          @media (max-width: 800px) { 
            .bento-grid, .flash-grid { grid-template-columns: 1fr; } 
            .card-large, .card-medium, .card-wide { grid-column: span 1; grid-row: span 1; } 
            .tree-card { width: 90%; }
          }
        `}
      </style>

      <div className="bg-glow"></div>

      <nav className="gaming-nav">
        <div className="logo" onClick={() => setActivePage("home")}>StudyHouse<span>.</span></div>
        {!user ? (
          <button className="btn-primary" onClick={() => signInWithPopup(auth, provider)}>Login</button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => setActivePage("flash")} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a5b4fc', border: '1px solid #8b5cf6', padding: '8px 16px', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>⚡ Speedrun Vault</button>
            <button onClick={() => setActivePage("admin")} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '8px 16px', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>+ Creator</button>
            <button onClick={() => signOut(auth)} style={{ background: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Exit</button>
          </div>
        )}
      </nav>

      {/* 🏠 PAGE 1: HOME */}
      {activePage === "home" && (
        <>
          <div className="hero-container">
            <h1 className="hero-title">Stop guessing. <br /> Start <span className="hero-highlight">Leveling Up.</span></h1>
            <div className="search-wrapper"><input type="text" className="search-input" placeholder="Search topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          </div>
          <div className="bento-grid">
            <div className="neo-card card-large" onClick={() => setActivePage("hub")}>
              <div className="xp-badge">⚡ DATABASE</div>
              <div className="card-icon">📚</div>
              <h2 className="card-title">The Mainframe Hub</h2>
              <p className="card-text">Access all curated video lectures, PDF notes, and roadmaps.</p>
              <div style={{ marginTop: 'auto', paddingTop: '20px' }}><span style={{ fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', fontSize: '0.9rem' }}>Enter Module →</span></div>
            </div>
            
            <div className="neo-card card-medium" onClick={() => setActivePage("flash")}>
              <div className="xp-badge" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>🤖 AI POWERED</div>
              <div className="card-icon">🧠</div>
              <h2 className="card-title">Speedrun Vault</h2>
              <p className="card-text">AI-generated flash summaries and your personal memory cards.</p>
              <div style={{ marginTop: 'auto', paddingTop: '20px' }}><span style={{ fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', fontSize: '0.9rem' }}>Enter Vault →</span></div>
            </div>
            
            {/* 🌟 CONNECTED: EXPLORE MAP NOW OPENS SKILL TREE */}
            <div className="neo-card card-wide">
              <div><h2 className="card-title">Interactive Skill Trees</h2><p className="card-text">From Web Developer to Data Science. Discover your ultimate path.</p></div>
              <button className="btn-white" onClick={() => setActivePage("careers")}>Explore Map</button>
            </div>
          </div>
        </>
      )}

      {/* 🗺️ PAGE 2: INTERACTIVE SKILL TREE (CAREER PATHS) */}
      {activePage === "careers" && (
        <div className="hub-container">
          <button className="back-btn" onClick={() => setActivePage("home")}>← Main Menu</button>
          <h1 className="hero-title" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '10px' }}>Career Skill Trees</h1>
          <p style={{ color: '#a1a1aa', marginBottom: '40px', fontSize: '1.1rem' }}>Map your journey. Unlock skills node by node until you achieve mastery.</p>
          
          <div className="subject-pills" style={{ borderBottom: '1px solid #27272a', marginBottom: '40px' }}>
            {Object.keys(skillTrees).map(career => (
              <div key={career} className={`pill ${activeCareer === career ? 'active' : ''}`} onClick={() => setActiveCareer(career)}>{career}</div>
            ))}
          </div>

          <div className="tree-container">
            <div className="tree-line"></div>
            {skillTrees[activeCareer].map((node) => (
              <div key={node.id} className="tree-node-wrapper">
                <div className={`tree-card ${node.unlocked ? 'unlocked' : ''}`}>
                  <div className="tree-icon-box">{node.icon}</div>
                  <div>
                    <span style={{ color: node.unlocked ? '#8b5cf6' : '#71717a', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>
                      {node.unlocked ? node.level + " • UNLOCKED" : node.level + " • LOCKED"}
                    </span>
                    <h3 style={{ margin: '5px 0', fontSize: '1.3rem', color: node.unlocked ? '#fff' : '#71717a' }}>{node.title}</h3>
                    <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.95rem' }}>{node.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📚 PAGE 3: ROADMAP HUB */}
      {activePage === "hub" && (
        <div className="hub-container">
          <button className="back-btn" onClick={() => setActivePage("home")}>← Main Menu</button>
          <h1 className="hero-title" style={{ fontSize: '3rem', textAlign: 'left' }}>The Mainframe Hub</h1>
          
          <div className="subject-pills" style={{ borderBottom: '1px solid #27272a', marginBottom: '20px' }}>
            {uniqueCategories.map(cat => (
              <div key={cat} className={`pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => { setActiveCategory(cat); setActiveSubject(roadmapItems.find(i => i.category === cat)?.subject || ""); }}>{cat}</div>
            ))}
          </div>
          <div className="subject-pills">
            {[...new Set(roadmapItems.filter(i => i.category === activeCategory).map(i => i.subject))].map(sub => (
              <div key={sub} className={`pill ${activeSubject === sub ? 'active' : ''}`} style={{ background: activeSubject === sub ? '#10b981' : '#18181b', color: activeSubject === sub ? '#fff' : '#a1a1aa' }} onClick={() => setActiveSubject(sub)}>{sub}</div>
            ))}
          </div>

          <div className="roadmap-module">
            <h2 style={{ margin: '0 0 25px 0', color: '#fff', fontSize: '1.8rem', fontWeight: 900 }}>{activeSubject} Modules</h2>
            {roadmapItems.filter(item => item.category === activeCategory && item.subject === activeSubject).map((item, index) => (
              <div key={item.id} className="roadmap-item">
                <div>
                  <span style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>{item.chapter || `MISSION 0${index + 1}`}</span>
                  <h3 style={{ margin: '8px 0', fontSize: '1.4rem', color: '#fff' }}>{item.title}</h3>
                  <p style={{ margin: 0, color: '#71717a', fontSize: '0.95rem' }}>Source: {item.source}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="speedrun-btn" onClick={() => generateAIFlashcards(item.title)}>⚡ Speedrun</button>
                  
                  {/* 🌟 LOGIC: If a PDF link exists, open the PDF viewer. Otherwise, open the text notes. */}
                  <button className="btn-notes" onClick={() => item.pdfUrl ? setActivePdf(item.pdfUrl) : setActiveNote(item.notes || "No intel provided for this module yet.")}>📄 Read Intel</button>
                  
                  {item.videoId && <button className="yt-btn" onClick={() => setActiveVideo(item.videoId)}>▶ Video</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🧠 PAGE 4: THE FLASH & MEMORY VAULT */}
      {activePage === "flash" && (
        <div className="hub-container">
          <button className="back-btn" onClick={() => setActivePage("home")}>← Main Menu</button>
          <h1 className="hero-title" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '10px' }}>Memory Vault</h1>
          <div className="flash-grid">
            <div className="ai-generator-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '2rem' }}>🤖</span><h2 style={{ margin: 0, color: '#fff' }}>AI Auto-Speedrun</h2>
              </div>
              <input type="text" className="ai-input" placeholder="e.g. OSI Model..." value={aiTopicInput} onChange={(e) => setAiTopicInput(e.target.value)} />
              <button className="ai-generate-btn" onClick={() => generateAIFlashcards(aiTopicInput)}>
                {isGenerating ? "Scanning Database..." : "Generate Speedrun ⚡"}
              </button>
            </div>
            <div className="memory-vault-box">
              <h2 style={{ margin: '0 0 20px 0', color: '#fff' }}>📝 My Custom Cards</h2>
              <form className="add-card-form" onSubmit={handleAddPersonalCard}>
                <input type="text" className="form-input" placeholder="Front: Question" value={newCard.question} onChange={(e) => setNewCard({...newCard, question: e.target.value})} style={{ marginBottom: '10px' }} required/>
                <input type="text" className="form-input" placeholder="Back: Answer" value={newCard.answer} onChange={(e) => setNewCard({...newCard, answer: e.target.value})} style={{ marginBottom: '10px' }} required/>
                <button type="submit" className="speedrun-btn" style={{ justifyContent: 'center' }}>+ Add to Deck</button>
              </form>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {personalCards.map((card) => (
                  <div key={card.id} className="memory-card" onClick={() => toggleCardFlip(card.id)}>
                    {flippedCards[card.id] ? <div className="card-back">{card.answer}</div> : <div className="card-front">{card.question} <br/><span style={{ fontSize: '0.8rem', color: '#71717a' }}>(Click to flip)</span></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛠️ PAGE 5: CREATOR STUDIO (Now with PDF Link field!) */}
      {activePage === "admin" && (
        <div className="hub-container" style={{ maxWidth: '800px' }}>
          <button className="back-btn" onClick={() => setActivePage("home")}>← Main Menu</button>
          <h1 className="hero-title" style={{ fontSize: '3rem', textAlign: 'left' }}>Creator Studio</h1>
          
          <form className="admin-form" onSubmit={handleAddLecture}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Category (e.g. Class 12) *</label>
                <input className="form-input" required value={newLecture.category} onChange={(e) => setNewLecture({...newLecture, category: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Subject (e.g. Physics) *</label>
                <input className="form-input" required value={newLecture.subject} onChange={(e) => setNewLecture({...newLecture, subject: e.target.value})} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Chapter / Module</label>
                <input className="form-input" placeholder="e.g. MODULE 02" value={newLecture.chapter} onChange={(e) => setNewLecture({...newLecture, chapter: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Topic Title *</label>
                <input className="form-input" placeholder="e.g. Functions & Recursion" required value={newLecture.title} onChange={(e) => setNewLecture({...newLecture, title: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Source / Author</label>
                <input className="form-input" placeholder="e.g. Study House Originals" value={newLecture.source} onChange={(e) => setNewLecture({...newLecture, source: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">YouTube ID</label>
                <input className="form-input" placeholder="e.g. dQw4w9WgXcQ" value={newLecture.videoId} onChange={(e) => setNewLecture({...newLecture, videoId: e.target.value})} />
              </div>
            </div>

            {/* 🌟 NEW: DIRECT PDF LINK INPUT */}
            <div className="form-group">
              <label className="form-label">Built-in PDF Link (Optional)</label>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#71717a' }}>Paste a Google Drive link here. Ensure the sharing setting is set to "Anyone with the link".</p>
              <input className="form-input" placeholder="https://drive.google.com/file/d/.../view" value={newLecture.pdfUrl} onChange={(e) => setNewLecture({...newLecture, pdfUrl: e.target.value})} />
            </div>

            <div className="form-group" style={{ textAlign: 'center', color: '#a1a1aa', fontWeight: 800 }}>- OR -</div>

            <div className="form-group">
              <label className="form-label">Text Notes</label>
              <textarea className="form-textarea" placeholder="If no PDF, type text notes here..." value={newLecture.notes} onChange={(e) => setNewLecture({...newLecture, notes: e.target.value})} />
            </div>

            <button type="submit" className="submit-btn">Deploy to Mainframe 🚀</button>
          </form>
        </div>
      )}

      {/* 🌟 NEW: FULLSCREEN PDF VIEWER OVERLAY */}
      {activePdf && (
        <div className="fullscreen-overlay" onClick={() => setActivePdf(null)}>
          <div className="overlay-header">
            <div>
              <div style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>📄 CLASSIFIED INTEL</div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>Secure Document Viewer</h2>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <a href={activePdf} target="_blank" rel="noreferrer" style={{ background: '#10b981', color: '#fff', padding: '8px 20px', borderRadius: '50px', fontWeight: 800, textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>Open in Tab ↗</a>
              <button style={{ background: 'transparent', color: '#fff', border: '1px solid #3f3f46', padding: '8px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: 700 }} onClick={() => setActivePdf(null)}>Exit ✕</button>
            </div>
          </div>
          <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
            <div className="pdf-container" onClick={(e) => e.stopPropagation()}>
              <iframe src={activePdf} width="100%" height="100%" frameBorder="0" allow="autoplay"></iframe>
            </div>
          </div>
        </div>
      )}

      {/* TEXT NOTES OVERLAY (Fallback if no PDF is provided) */}
      {activeNote && (
        <div className="fullscreen-overlay" onClick={() => setActiveNote(null)}>
          <div className="overlay-header">
            <div>
              <div style={{ color: '#8b5cf6', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>📄 CLASSIFIED INTEL</div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>Module Notes</h2>
            </div>
            <button style={{ background: 'transparent', color: '#fff', border: '1px solid #3f3f46', padding: '8px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveNote(null)}>Exit ✕</button>
          </div>
          <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
            <div className="reading-window" onClick={(e) => e.stopPropagation()}>{activeNote}</div>
          </div>
        </div>
      )}

      {/* AI SPEEDRUN OVERLAY */}
      {activeFlashDeck && (
        <div className="fullscreen-overlay">
          <div className="overlay-header">
            <div>
              <div style={{ color: '#10b981', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>🤖 AI EXTRACTED CORE DATA</div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>{activeFlashDeck.title}</h2>
            </div>
            <button style={{ background: 'transparent', color: '#fff', border: '1px solid #3f3f46', padding: '8px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveFlashDeck(null)}>Exit ✕</button>
          </div>
          <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', width: '100%' }}>
            {activeFlashDeck.points.map((point, i) => <div key={i} className="flash-card">{point}</div>)}
            <button className="btn-primary" style={{ marginTop: '20px', width: '100%', background: '#10b981' }} onClick={() => setActiveFlashDeck(null)}>Finish Speedrun 🏆</button>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {activeVideo && (
        <div className="video-overlay" onClick={() => setActiveVideo(null)}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <button className="close-video" onClick={() => setActiveVideo(null)}>✕ Close Player</button>
            <a href={`https://www.youtube.com/watch?v=${activeVideo}`} target="_blank" rel="noreferrer" style={{ background: '#10b981', color: '#fff', padding: '10px 24px', borderRadius: '50px', fontWeight: 800, textDecoration: 'none' }}>Watch on YouTube ↗</a>
          </div>
          <div className="iframe-container" onClick={(e) => e.stopPropagation()}>
            <iframe style={{ width: '100%', height: '100%' }} src={`https://www.youtube-nocookie.com/embed/${activeVideo}?rel=0`} title="Video" frameBorder="0" allowFullScreen></iframe>
          </div>
        </div>
      )}

      {/* CHATBOT */}
      {showChat && (
        <div className="chat-window">
          <div className="chat-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="chatbot-dot" style={{animation: 'none'}}></div> AI Tutor</span>
            <span style={{ cursor: 'pointer', fontSize: '1.2rem', color: '#71717a' }} onClick={() => setShowChat(false)}>✕</span>
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => <div key={index} className={`msg ${msg.sender}`}>{msg.text}</div>)}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input type="text" className="chat-input" placeholder="Type your question..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit" className="chat-send">Send</button>
          </form>
        </div>
      )}

      {!showChat && (
        <div className="floating-chatbot" onClick={() => setShowChat(true)}>
          <div className="chatbot-dot"></div><span>Engage AI Tutor</span>
        </div>
      )}
    </>
  );
}

export default App;