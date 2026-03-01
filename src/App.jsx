import React, { useState, useEffect, useRef } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, provider, db } from "./firebase"; 
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, updateDoc, increment, query, where, orderBy, limit, onSnapshot } from "firebase/firestore"; 
import { GoogleGenerativeAI } from "@google/generative-ai"; 

// 🛑 IMPORTANT: Paste your actual Google AI Studio API key here
const GEMINI_API_KEY = "PASTE_YOUR_API_KEY_HERE"; 

// Initialize the official Google Gen AI SDK
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- MOCK DATA FOR FALLBACKS ---
const INDIAN_BOARDS = ["CBSE", "ICSE", "State Board (UP)", "State Board (MH)", "State Board (WB)"];
const CLASSES = ["Class 10", "Class 11", "Class 12", "Undergrad (B.Tech)", "Undergrad (B.Sc)", "Undergrad (B.A)"];
const DEFAULT_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "History", "English"];

const DEFAULT_CHANNELS = [
  { name: "Physics Wallah", subject: "JEE/NEET", url: "https://youtube.com" },
  { name: "CodeWithHarry", subject: "Computer Science", url: "https://youtube.com" },
  { name: "Aman Dhattarwal", subject: "Board Exams", url: "https://youtube.com" },
  { name: "Khan Academy", subject: "Universal", url: "https://youtube.com" }
];

const NAV_SYSTEMS = [
  { id: "home", label: "Spaceport (Home)", icon: "🌌", color: "from-purple-500 to-indigo-500" },
  { id: "academics", label: "Academics Hub", icon: "📚", color: "from-blue-500 to-cyan-500" },
  { id: "ai", label: "Nova AI", icon: "✨", color: "from-cyan-400 to-teal-400" },
  { id: "exams", label: "Exam Simulator", icon: "🎯", color: "from-green-500 to-emerald-500" },
  { id: "notebook", label: "Neural Notebook", icon: "📓", color: "from-pink-500 to-rose-500" },
  { id: "vault", label: "Document Vault", icon: "🗄️", color: "from-indigo-500 to-blue-500" },
  { id: "careers", label: "Career Roadmaps", icon: "🚀", color: "from-yellow-500 to-orange-500" },
  { id: "channels", label: "Creator Grid", icon: "📺", color: "from-red-500 to-orange-500" },
  { id: "admin", label: "Creator Studio", icon: "🛠️", color: "from-gray-500 to-gray-400" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("home"); 
  const [userXP, setUserXP] = useState(0); 
  const [pageHistory, setPageHistory] = useState(["home"]);
  const [toast, setToast] = useState(null);
  
  // Sidebar State
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  const [personalNotes, setPersonalNotes] = useState([]);
  const [careerPaths, setCareerPaths] = useState({}); 
  const [leaderboard, setLeaderboard] = useState([]); 
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [syllabusData, setSyllabusData] = useState([]);

  const [academicsParams, setAcademicsParams] = useState({ board: "", grade: "", subject: "" });
  const [studyPlan, setStudyPlan] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([{ sender: "ai", text: "Hello! I am Nova. Your neural network is synced. What complex system shall we decode today?" }]);
  
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeFlashcards, setActiveFlashcards] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const chatEndRef = useRef(null);

  const [adminTab, setAdminTab] = useState("syllabus");
  const [newSyllabus, setNewSyllabus] = useState({ board: "", grade: "", subject: "", chapter: "", content: "", pdfUrl: "" });
  const [newNote, setNewNote] = useState({ title: "", content: "" }); 

  const [showTimer, setShowTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    setUser({ uid: "local-user-123", email: "student@studyhouse.edu" });

    setCareerPaths({
      "Engineering": [{ id: 1, title: "JEE Mains Prep", desc: "Physics, Chem, Math mastery.", icon: "⚙️", reqXp: 0 }, { id: 2, title: "Advanced Problem Solving", desc: "Mock tests and PYQs.", icon: "🚀", reqXp: 500 }],
      "Medical": [{ id: 1, title: "NEET Basics", desc: "Biology focus.", icon: "🩺", reqXp: 0 }],
      "Software Dev": [{ id: 1, title: "Web Fundamentals", desc: "HTML, CSS, JS", icon: "💻", reqXp: 0 }, { id: 2, title: "React & Node", desc: "Fullstack mastery", icon: "🌐", reqXp: 300 }]
    });

    setLeaderboard([
      { email: "arjun.s@gmail.com", xp: 3450 },
      { email: "priya.m@yahoo.com", xp: 2800 },
      { email: "rahul_dev@outlook.com", xp: 2100 }
    ]);
    
    // Auto-hide sidebar on mobile screens
    if (window.innerWidth < 1024) setIsSidebarHidden(true);
  }, []);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const showNotification = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navigateTo = (page) => { 
    setPageHistory(prev => [...prev, page]); 
    setActivePage(page); 
    if (window.innerWidth < 1024) setIsSidebarHidden(true); // Close sidebar on mobile
  };
  
  const goBack = () => { 
    if(pageHistory.length > 1) {
      const h = [...pageHistory]; 
      h.pop(); 
      setPageHistory(h); 
      setActivePage(h[h.length - 1]); 
    } else {
      setActivePage("home");
    }
  };

  const addXP = (amount) => {
    setUserXP(prev => prev + amount);
    showNotification(`+${amount} XP Gained!`, "success");
  };

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      showNotification("Focus Session Complete! +100 XP", "success");
      addXP(100);
      setTimeLeft(25 * 60);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- AI LOGIC ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setIsGenerating(true);

    try {
      if(GEMINI_API_KEY === "PASTE_YOUR_API_KEY_HERE" || !GEMINI_API_KEY) {
        throw new Error("API Key Missing! Please paste your key at the top of App.jsx");
      }
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `You are Nova, an extremely advanced, friendly, and genius AI tutor for Indian students. Answer accurately and keep it engaging.\n\nStudent Query: "${userMsg}"`;
      const result = await model.generateContent(prompt);
      setMessages(prev => [...prev, { sender: "ai", text: result.response.text() }]);
    } catch (error) { 
      setMessages(prev => [...prev, { sender: "ai", text: `Error: ${error.message}` }]); 
    }
    setIsGenerating(false);
  };

  const generateAIQuiz = async (topicName) => {
    if (!topicName.trim()) return showNotification("Please enter a topic!", "error");
    setIsGenerating(true);
    showNotification("Simulating testing environment...", "info");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Create a 3-question multiple-choice quiz about "${topicName}" for a student. Return ONLY a valid JSON array using this exact schema: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "Exact text of correct option"}]`;
      const result = await model.generateContent(prompt);
      setActiveQuiz({ topic: topicName, questions: JSON.parse(result.response.text()), currentIndex: 0, score: 0 });
      navigateTo("exam_active");
    } catch (error) { showNotification("Failed to generate quiz. Check API Key.", "error"); }
    setIsGenerating(false);
  };

  const generateAIFlashcards = async (topicName) => {
    if (!topicName.trim()) return showNotification("Please enter a topic!", "error");
    setIsGenerating(true);
    showNotification("Crafting flashcards...", "info");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const prompt = `Create 5 high-yield study flashcards about "${topicName}". Return ONLY a valid JSON array using this exact schema: [{"front": "Question or Concept", "back": "Answer or Detailed Definition"}]`;
      const result = await model.generateContent(prompt);
      setActiveFlashcards({ topic: topicName, cards: JSON.parse(result.response.text()) });
      setFlashcardIndex(0);
      setIsFlipped(false);
      navigateTo("flashcards_active");
    } catch (error) { showNotification("Failed to generate flashcards.", "error"); }
    setIsGenerating(false);
  };

  const generateStudyPlan = async (subject, grade) => {
    setIsGenerating(true);
    showNotification("Drafting your spatial study plan...", "info");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Create a 7-day intensive study plan for a ${grade} student preparing for ${subject}. Format the response using HTML tags (like <b>, <ul>, <li>, <h3>) so it renders beautifully in a web page. Make it highly actionable, structured by day, and motivating. Keep it concise.`;
      const result = await model.generateContent(prompt);
      setStudyPlan(result.response.text());
      showNotification("Study plan generated! ✨", "success");
    } catch (error) { showNotification("Failed to generate plan.", "error"); }
    setIsGenerating(false);
  };

  const polishNoteWithAI = async () => {
    if (!newNote.content.trim()) return showNotification("Write some rough notes first!", "error");
    setIsGenerating(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Rewrite and structure these notes to be highly professional, well-formatted, and easy to study from:\n"${newNote.content}"`;
      const result = await model.generateContent(prompt);
      setNewNote({ ...newNote, content: result.response.text() });
      showNotification("Notes polished beautifully! ✨", "success");
    } catch (error) { showNotification("AI Error", "error"); }
    setIsGenerating(false);
  };

  const simplifyNoteWithAI = async () => {
    if (!newNote.content.trim()) return showNotification("Write some rough notes first!", "error");
    setIsGenerating(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Explain the following concepts as if I am 5 years old. Use simple words, fun analogies, and short sentences:\n"${newNote.content}"`;
      const result = await model.generateContent(prompt);
      setNewNote({ ...newNote, content: result.response.text() });
      showNotification("Notes simplified! ✨", "success");
    } catch (error) { showNotification("AI Error", "error"); }
    setIsGenerating(false);
  };

  const handleQuizAnswer = (selectedOption) => {
    if (!activeQuiz) return;
    const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
    const isCorrect = selectedOption === currentQ.answer;
    
    if (isCorrect) {
      showNotification("Correct! +50 XP", "success");
      addXP(50);
      setActiveQuiz(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      showNotification(`Incorrect. The answer was: ${currentQ.answer}`, "error");
    }

    setTimeout(() => {
      if (activeQuiz.currentIndex + 1 < activeQuiz.questions.length) {
        setActiveQuiz(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      } else {
        showNotification(`Simulation Complete! Score: ${activeQuiz.score + (isCorrect ? 1 : 0)}/${activeQuiz.questions.length}`, "success");
        addXP(200); 
        setActivePage("exams");
        setActiveQuiz(null);
      }
    }, 1500);
  };

  const saveNote = () => {
    if (!newNote.title || !newNote.content) return showNotification("Title and content required", "error");
    setPersonalNotes(prev => [{ id: Date.now(), ...newNote, date: new Date().toLocaleDateString() }, ...prev]);
    setNewNote({ title: "", content: "" });
    showNotification("Note uploaded to Neural Notebook.", "success");
    addXP(10);
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (adminTab === "syllabus") {
      setSyllabusData(prev => [...prev, { id: Date.now(), ...newSyllabus }]);
      showNotification("Syllabus material published!", "success");
      setNewSyllabus({ board: "", grade: "", subject: "", chapter: "", content: "", pdfUrl: "" });
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderHome = () => (
    <div className="animate-fade-in w-full">
      <div className="text-center relative z-10 mb-12">
        <div className="inline-block p-1 px-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium mb-6 backdrop-blur-md">
          v3.0 Spatial Interface Online
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-none drop-shadow-2xl text-white">
          Limitless <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-pulse">Dimensions.</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-400 leading-relaxed font-light max-w-3xl mx-auto px-4">
          The all-in-one spatial educational universe. Enter the simulator, decode your syllabus, and let Nova AI guide your path.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 pb-20">
        {NAV_SYSTEMS.slice(1, 7).map((system, idx) => (
          <div key={idx} onClick={() => navigateTo(system.id)} className="group relative cursor-pointer flex flex-col h-full min-h-[16rem]">
            <div className={`absolute inset-0 bg-gradient-to-br ${system.color} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}></div>
            
            <div className="relative flex-1 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 lg:p-8 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 text-9xl transition-transform group-hover:scale-110 pointer-events-none select-none">
                {system.icon}
              </div>
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 bg-gradient-to-br ${system.color} bg-opacity-20 shadow-lg shrink-0`}>
                {system.icon}
              </div>
              <div className="relative z-10 flex-1 flex flex-col">
                <h2 className="text-2xl lg:text-3xl font-bold mb-3 text-white break-words">{system.label}</h2>
                <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed">
                  Enter the {system.label.toLowerCase()} to expand your neural knowledge base.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAcademics = () => (
    <div className="animate-fade-in relative">
      <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-gray-800 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">📚</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 break-words">Academics Hub</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Select your parameters to access the mainframe.</p>
        </div>
      </div>
      
      {studyPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-gray-900 border border-purple-500/50 rounded-3xl p-6 md:p-10 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-[0_0_100px_rgba(168,85,247,0.2)]">
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
              <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Strategic Plan Generated</h2>
              <button onClick={() => setStudyPlan(null)} className="text-gray-400 hover:text-white text-3xl transition-transform hover:scale-110">✕</button>
            </div>
            <div className="prose prose-invert prose-base md:prose-lg prose-purple max-w-none text-gray-300 font-light leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: studyPlan }} />
            <div className="mt-8 text-center">
              <button onClick={() => setStudyPlan(null)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/30">Initialize Protocol</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl">
          <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-300 flex items-center gap-3"><span className="text-blue-500">01.</span> Select Board</h3>
          <div className="flex flex-wrap gap-3 md:gap-4">
            {INDIAN_BOARDS.map(b => (
              <button key={b} onClick={() => setAcademicsParams({...academicsParams, board: b})} 
                className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.board === b ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                {b}
              </button>
            ))}
            <button onClick={() => setAcademicsParams({...academicsParams, board: "University"})} 
              className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.board === "University" ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              University
            </button>
          </div>
        </div>

        {academicsParams.board && (
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl animate-fade-in">
            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-300 flex items-center gap-3"><span className="text-cyan-500">02.</span> Select Grade</h3>
            <div className="flex flex-wrap gap-3 md:gap-4">
              {CLASSES.map(c => (
                <button key={c} onClick={() => setAcademicsParams({...academicsParams, grade: c})} 
                  className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.grade === c ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {academicsParams.grade && (
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl animate-fade-in">
            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-300 flex items-center gap-3"><span className="text-teal-500">03.</span> Select Subject</h3>
            <div className="flex flex-wrap gap-3 md:gap-4">
              {DEFAULT_SUBJECTS.map(s => (
                <button key={s} onClick={() => setAcademicsParams({...academicsParams, subject: s})} 
                  className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.subject === s ? 'bg-teal-600 text-white shadow-[0_0_20px_rgba(20,184,166,0.4)] scale-105' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {academicsParams.subject && (
          <div className="pt-6 animate-fade-in">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 p-6 md:p-10 rounded-3xl shadow-2xl">
              <h2 className="text-2xl md:text-4xl font-black mb-8 text-white break-words">{academicsParams.subject} <span className="text-gray-500 text-lg md:text-2xl font-normal ml-2">| {academicsParams.grade}</span></h2>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-10">
                <div className="min-w-0">
                  <h4 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400"><span>📑</span> Official Syllabus</h4>
                  {syllabusData.filter(s => s.board === academicsParams.board && s.subject === academicsParams.subject).length > 0 ? (
                    <ul className="space-y-4 text-gray-300">
                      {syllabusData.filter(s => s.board === academicsParams.board && s.subject === academicsParams.subject).map(item => (
                         <li key={item.id} className="bg-gray-800/80 border border-gray-700 p-5 md:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors hover:border-blue-500">
                            <div className="min-w-0"><strong className="text-lg md:text-xl text-blue-300 break-words block">{item.chapter}</strong><p className="text-sm md:text-base mt-2 text-gray-400 break-words">{item.content}</p></div>
                            {item.pdfUrl && <button onClick={()=>window.open(item.pdfUrl)} className="bg-blue-600/20 text-blue-400 border border-blue-500/50 px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all shrink-0">PDF</button>}
                         </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-12 text-gray-500 border border-dashed border-gray-700 rounded-3xl bg-gray-900/30">
                      <p className="text-base md:text-lg">No chapters added yet.</p>
                      <p className="text-sm mt-2">Use Creator Studio to inject data.</p>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3 text-purple-400"><span>🤖</span> AI Directives</h4>
                  <div className="space-y-4">
                    <button onClick={() => generateStudyPlan(academicsParams.subject, academicsParams.grade)} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-500/30 text-left px-5 py-5 md:px-8 md:py-6 rounded-2xl transition-all font-bold text-sm md:text-lg flex justify-between items-center group shadow-lg text-white">
                      <span className="truncate pr-4">Generate 7-Day Plan</span> <span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">→</span>
                    </button>
                    <button onClick={() => { setChatInput(`Teach me the most important concepts of ${academicsParams.subject} for ${academicsParams.grade} ${academicsParams.board}.`); navigateTo("ai"); }} className="w-full bg-gradient-to-r from-cyan-900/80 to-blue-900/80 hover:from-cyan-600 hover:to-blue-600 border border-cyan-500/30 text-left px-5 py-5 md:px-8 md:py-6 rounded-2xl transition-all font-bold text-sm md:text-lg flex justify-between items-center group shadow-lg text-white">
                      <span className="truncate pr-4">Initiate AI Crash Course</span> <span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">→</span>
                    </button>
                    <button onClick={() => generateAIQuiz(`${academicsParams.subject} class ${academicsParams.grade}`)} className="w-full bg-gradient-to-r from-teal-900/80 to-emerald-900/80 hover:from-teal-600 hover:to-emerald-600 border border-teal-500/30 text-left px-5 py-5 md:px-8 md:py-6 rounded-2xl transition-all font-bold text-sm md:text-lg flex justify-between items-center group shadow-lg text-white">
                      <span className="truncate pr-4">Enter Mock Simulator</span> <span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="animate-fade-in flex flex-col h-full min-h-[75vh] max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-gray-800 pb-4 shrink-0">
        <span className="text-4xl md:text-5xl">✨</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 truncate">Nova AI Core</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-1">Your personal neural tutor.</p>
        </div>
      </div>
      
      <div className="flex-1 bg-gray-900/80 border border-gray-700/50 rounded-3xl overflow-hidden flex flex-col backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] relative">
        <div className="bg-gradient-to-b from-gray-800/80 to-transparent p-6 border-b border-gray-800/50 flex flex-col items-center justify-center shrink-0">
          <div className="relative">
            <div className={`absolute inset-0 bg-cyan-500 rounded-full blur-3xl opacity-20 transition-transform ${isGenerating ? 'scale-125' : ''}`}></div>
            <svg viewBox="0 0 100 100" className={`w-20 h-20 md:w-24 md:h-24 relative z-10 transition-all duration-700 ${isGenerating ? 'scale-110 drop-shadow-[0_0_30px_rgba(6,182,212,1)]' : 'drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]'}`}>
              <circle cx="50" cy="50" r="45" fill="#0f172a" stroke="#06b6d4" strokeWidth="2"/>
              <circle cx="35" cy="40" r="5" fill="#22d3ee" className={isGenerating ? "animate-ping" : ""}/>
              <circle cx="65" cy="40" r="5" fill="#22d3ee" className={isGenerating ? "animate-ping" : ""}/>
              <path d={isGenerating ? "M 35 60 Q 50 75 65 60" : "M 40 65 Q 50 65 60 65"} stroke="#22d3ee" strokeWidth="4" fill="transparent" strokeLinecap="round" className="transition-all duration-300"/>
            </svg>
          </div>
          <p className="text-cyan-400 font-mono text-[10px] md:text-xs mt-4 tracking-widest uppercase">{isGenerating ? 'Computing Response...' : 'System Idle'}</p>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] md:max-w-[80%] p-4 md:p-6 rounded-3xl shadow-lg transition-all ${m.sender === 'user' ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'}`}>
                <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-light break-words">{m.text}</p>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-3xl rounded-tl-sm flex gap-3 shadow-lg">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#22d3ee]"></div>
                <div className="w-2 h-2 md:w-3 md:h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#22d3ee]" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 md:w-3 md:h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#22d3ee]" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-2" />
        </div>

        <div className="p-4 md:p-6 bg-gray-900 border-t border-gray-800 z-20 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-4 max-w-5xl mx-auto">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              placeholder="Query the Nova system..." 
              className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-sm md:text-lg text-white focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
              disabled={isGenerating}
            />
            <button type="submit" disabled={isGenerating || !chatInput.trim()} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white p-3 md:p-4 px-5 md:px-8 rounded-xl md:rounded-2xl transition-all hover:scale-105 shadow-lg flex items-center justify-center font-bold shrink-0">
              SEND <span className="ml-2 text-xl hidden sm:inline">↗</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderExams = () => (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-gray-800 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">🎯</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 break-words">Exam Simulator</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Generate infinite test scenarios and 3D flashcards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
        
        {/* Quiz Box */}
        <div className="group relative flex flex-col">
          <div className="absolute inset-0 bg-green-500 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
          <div className="relative flex-1 bg-gray-900/80 border border-gray-800 p-6 md:p-10 rounded-3xl backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-green-500/50 shadow-2xl flex flex-col justify-between">
            <div className="text-5xl md:text-6xl mb-6 text-center drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">📝</div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">Mock Simulator</h3>
              <input 
                id="quiz-topic"
                placeholder="e.g., Thermodynamics Class 11" 
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-sm md:text-base text-white mb-6 focus:border-green-500 outline-none shadow-inner transition-colors"
              />
            </div>
            <button 
              onClick={() => generateAIQuiz(document.getElementById("quiz-topic").value)} 
              disabled={isGenerating}
              className="w-full mt-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-2xl text-base md:text-lg transition-all hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] disabled:opacity-50">
              {isGenerating ? "Initializing..." : "Generate Test Sequence"}
            </button>
          </div>
        </div>

        {/* Flashcards Box */}
        <div className="group relative flex flex-col">
          <div className="absolute inset-0 bg-yellow-500 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
          <div className="relative flex-1 bg-gray-900/80 border border-gray-800 p-6 md:p-10 rounded-3xl backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-yellow-500/50 shadow-2xl flex flex-col justify-between">
            <div className="text-5xl md:text-6xl mb-6 text-center drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">⚡</div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">Neural Flashcards</h3>
              <input 
                id="flashcard-topic"
                placeholder="e.g., Organic Chemistry Reactions" 
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-sm md:text-base text-white mb-6 focus:border-yellow-500 outline-none shadow-inner transition-colors"
              />
            </div>
            <button 
              onClick={() => generateAIFlashcards(document.getElementById("flashcard-topic").value)} 
              disabled={isGenerating}
              className="w-full mt-auto bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-4 rounded-2xl text-base md:text-lg transition-all hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] disabled:opacity-50">
              {isGenerating ? "Synthesizing..." : "Generate Deck"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  const renderActiveQuiz = () => {
    if (!activeQuiz || !activeQuiz.questions) return null;
    const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
    const progress = ((activeQuiz.currentIndex) / activeQuiz.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto py-8 md:py-12 animate-fade-in">
        <div className="mb-8 flex flex-wrap gap-4 justify-between items-center text-gray-400 font-bold text-xs md:text-sm uppercase tracking-widest">
          <span>Question {activeQuiz.currentIndex + 1} // {activeQuiz.questions.length}</span>
          <span className="text-green-400 bg-green-900/30 px-4 py-2 rounded-full border border-green-500/30">Score: {activeQuiz.score}</span>
        </div>
        
        <div className="bg-gray-800 h-2 md:h-3 rounded-full mb-8 overflow-hidden shadow-inner">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(74,222,128,0.8)]" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="bg-gray-900 border border-gray-700/50 p-6 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl md:text-3xl font-black mb-8 md:mb-10 leading-snug text-white break-words">{currentQ.question}</h2>
          <div className="grid grid-cols-1 gap-4">
            {currentQ.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleQuizAnswer(opt)}
                className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-green-500 p-5 md:p-6 rounded-2xl transition-all font-medium text-base md:text-lg hover:translate-x-1 shadow-lg flex items-start gap-4">
                <span className="text-green-500 font-black shrink-0">{String.fromCharCode(65 + i)}.</span>
                <span className="break-words">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveFlashcards = () => {
    if (!activeFlashcards || !activeFlashcards.cards) return null;
    const currentCard = activeFlashcards.cards[flashcardIndex];
    
    return (
      <div className="max-w-4xl mx-auto py-8 md:py-10 animate-fade-in text-center flex flex-col items-center min-h-[70vh] justify-center">
        <h2 className="text-2xl md:text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 break-words">Neural Deck Online</h2>
        <p className="text-gray-400 mb-8 md:mb-10 font-medium text-sm md:text-lg bg-gray-900 px-4 py-2 rounded-full border border-gray-800 break-words">{activeFlashcards.topic}</p>
        
        {/* Simple Flip Card Container */}
        <div className="w-full min-h-[300px] md:min-h-[350px] mb-10 cursor-pointer group relative" onClick={() => setIsFlipped(!isFlipped)}>
          {!isFlipped ? (
            <div className="w-full h-full min-h-[300px] md:min-h-[350px] bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-yellow-500/50 rounded-3xl p-6 md:p-12 flex flex-col items-center justify-center shadow-2xl animate-fade-in">
              <div className="absolute top-4 left-6 text-gray-500 font-bold tracking-widest text-[10px] md:text-xs uppercase">Card {flashcardIndex + 1}/{activeFlashcards.cards.length}</div>
              <h3 className="break-words text-xl md:text-4xl font-black text-white text-center leading-snug mt-6 mb-8 w-full">{currentCard.front}</h3>
              <p className="mt-auto text-yellow-500/70 text-[10px] md:text-xs font-bold tracking-widest uppercase animate-pulse">Click to reveal answer</p>
            </div>
          ) : (
            <div className="w-full h-full min-h-[300px] md:min-h-[350px] bg-gradient-to-br from-yellow-900/40 to-gray-900 border border-yellow-500/30 rounded-3xl p-6 md:p-12 flex flex-col items-center justify-center shadow-2xl animate-fade-in">
               <div className="absolute top-4 left-6 text-yellow-500/50 font-bold tracking-widest text-[10px] md:text-xs uppercase">Answer</div>
              <p className="break-words text-base md:text-2xl font-medium text-gray-200 text-center leading-relaxed mt-6 mb-8 w-full">{currentCard.back}</p>
              <p className="mt-auto text-gray-500 text-[10px] md:text-xs font-bold tracking-widest uppercase">Click to view question</p>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-6">
          <button 
            disabled={flashcardIndex === 0} 
            onClick={() => { setFlashcardIndex(prev => prev - 1); setIsFlipped(false); }} 
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 border border-gray-700 text-white py-4 rounded-xl font-bold text-sm md:text-lg transition-all shadow-lg">
            ← Previous
          </button>
          
          {flashcardIndex === activeFlashcards.cards.length - 1 ? (
             <button 
               onClick={() => { addXP(100); showNotification("Deck Finished! +100 XP", "success"); setActivePage("exams"); }} 
               className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-gray-900 py-4 rounded-xl font-black text-sm md:text-lg transition-all shadow-lg">
               COMPLETE DECK 🏆
             </button>
          ) : (
             <button 
               onClick={() => { setFlashcardIndex(prev => prev + 1); setIsFlipped(false); }} 
               className="flex-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white py-4 rounded-xl font-bold text-sm md:text-lg transition-all shadow-lg">
               Next →
             </button>
          )}
        </div>
      </div>
    );
  };

  const renderNotebook = () => (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-gray-800 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">📓</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 break-words">Neural Notebook</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Document and refine your data with AI.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor */}
        <div className="lg:col-span-1 bg-gray-900/80 border border-gray-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl h-fit lg:sticky top-6 shadow-2xl flex flex-col">
          <h3 className="text-xl md:text-2xl font-bold mb-6 text-white border-b border-gray-800 pb-4">New Entry</h3>
          <input 
            placeholder="Topic Header..." 
            value={newNote.title} 
            onChange={e => setNewNote({...newNote, title: e.target.value})} 
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 md:py-4 mb-4 md:mb-6 text-sm md:text-base text-white focus:border-pink-500 outline-none transition-colors"
          />
          <textarea 
            placeholder="Input raw data here..." 
            value={newNote.content} 
            onChange={e => setNewNote({...newNote, content: e.target.value})} 
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 md:py-4 mb-4 md:mb-6 text-sm md:text-base text-white focus:border-pink-500 outline-none min-h-[150px] md:min-h-[200px] resize-y transition-colors leading-relaxed"
          />
          
          <div className="flex flex-col gap-3 md:gap-4">
            <button onClick={saveNote} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 md:py-4 rounded-xl transition-all shadow-lg text-sm md:text-base">Save to Storage</button>
            <div className="flex gap-3 md:gap-4">
              <button onClick={polishNoteWithAI} disabled={isGenerating} className="flex-1 bg-gray-800 hover:bg-gray-700 border border-pink-500/30 text-white font-bold py-3 md:py-4 rounded-xl transition-all flex justify-center items-center gap-2 group text-xs md:text-sm">
                {isGenerating ? "..." : <><span className="group-hover:animate-spin">✨</span> Polish</>}
              </button>
              <button onClick={simplifyNoteWithAI} disabled={isGenerating} className="flex-1 bg-gray-800 hover:bg-gray-700 border border-teal-500/30 text-white font-bold py-3 md:py-4 rounded-xl transition-all flex justify-center items-center gap-2 group text-xs md:text-sm" title="Explain Like I'm 5">
                {isGenerating ? "..." : <><span className="group-hover:animate-bounce">👶</span> ELI5</>}
              </button>
            </div>
          </div>
        </div>

        {/* Saved Notes */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8 flex flex-col">
          {personalNotes.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/30 border border-dashed border-gray-800 rounded-3xl">
              <p className="text-5xl md:text-6xl mb-4 md:mb-6 opacity-50">📂</p>
              <p className="text-base md:text-lg text-gray-500 font-medium">Storage is empty. Input data to begin.</p>
            </div>
          ) : (
            personalNotes.map(note => (
              <div key={note.id} className="bg-gray-900/80 border border-gray-800 p-6 md:p-8 rounded-3xl hover:border-pink-500/40 transition-colors shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                  <h3 className="break-words text-xl md:text-2xl font-black text-white leading-tight">{note.title}</h3>
                  <span className="text-[10px] md:text-xs font-bold tracking-widest text-pink-500 bg-pink-900/20 px-3 py-1.5 rounded-full border border-pink-500/20 shrink-0">{note.date}</span>
                </div>
                <div className="break-words text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none text-sm md:text-base" dangerouslySetInnerHTML={{ __html: note.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderVault = () => (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-10 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4 min-w-[200px]">
          <span className="text-4xl md:text-5xl">🗄️</span>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 break-words">Document Vault</h1>
            <p className="text-gray-400 text-sm md:text-lg mt-2">Secure access to vital academic resources.</p>
          </div>
        </div>
        <button onClick={() => navigateTo("admin")} className="w-full sm:w-auto bg-gray-800 border border-gray-700 hover:border-blue-500 px-6 py-3 rounded-xl font-bold transition-all shadow-md text-white text-sm md:text-base">Upload Data</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {["Mathematics Matrix", "Physics Core PYQ", "Chemistry Synthesis", "Bio Systems Map", "Historical Timelines", "CS Algorithm Logs"].map((doc, i) => (
          <div key={i} className="group relative cursor-pointer flex flex-col min-h-[12rem] md:min-h-[14rem]">
             <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
             <div className="relative flex-1 bg-gray-900/80 border border-gray-800 group-hover:border-blue-500/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 group-hover:-translate-y-2 shadow-xl backdrop-blur-md">
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-md">📄</div>
              <h4 className="break-words font-bold text-gray-200 text-base md:text-lg leading-tight mb-4">{doc}</h4>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-900/20 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">Decrypt PDF</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCareers = () => (
    <div className="animate-fade-in">
       <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-gray-800 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">🚀</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 break-words">Career Roadmaps</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Unlock skill trees and navigate your future.</p>
        </div>
      </div>
      
      {Object.entries(careerPaths).map(([pathName, nodes]) => (
        <div key={pathName} className="mb-16">
          <h2 className="text-2xl md:text-3xl font-black mb-8 text-white flex items-center gap-3">
             <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_10px_#eab308] shrink-0"></span> 
             <span className="break-words">{pathName} Protocol</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {nodes.map(node => {
              const unlocked = userXP >= node.reqXp;
              return (
                <div key={node.id} className={`group relative flex flex-col min-h-[14rem] md:min-h-[16rem] ${!unlocked ? 'opacity-70' : ''}`}>
                  <div className={`relative flex-1 bg-gray-900/80 border rounded-3xl p-6 md:p-8 overflow-hidden transition-all duration-300 flex flex-col ${unlocked ? 'border-gray-700 hover:border-yellow-500/50 shadow-xl hover:-translate-y-2' : 'border-gray-800'}`}>
                    
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-3xl md:text-4xl mb-3">🔒</span>
                        <span className="bg-gray-900 border border-gray-700 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-[10px] md:text-xs text-gray-400 tracking-widest uppercase shadow-2xl break-words">Requires {node.reqXp} XP</span>
                      </div>
                    )}

                    <div className="absolute top-0 right-0 p-6 text-6xl opacity-[0.03] transform rotate-12 select-none pointer-events-none">{node.icon}</div>
                    <div className="text-3xl md:text-4xl mb-4 md:mb-6 bg-gray-800/80 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border border-gray-700 shadow-inner shrink-0">{node.icon}</div>
                    <h3 className="break-words text-lg md:text-xl font-black mb-2 md:mb-3 text-white z-10 relative">{node.title}</h3>
                    <p className="break-words text-gray-400 text-xs md:text-sm leading-relaxed z-10 relative">{node.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderChannels = () => (
    <div className="animate-fade-in">
       <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-gray-800 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">📺</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 break-words">Creator Grid</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Direct feeds to top educational nodes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {channels.map((ch, i) => (
          <div key={i} className="group relative cursor-pointer">
            <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-5 md:p-8 flex items-center gap-4 md:gap-6 transition-all duration-300 hover:border-red-500/50 hover:-translate-y-1 md:hover:-translate-y-2 shadow-xl backdrop-blur-md" onClick={()=>window.open(ch.url)}>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shrink-0 group-hover:scale-110 transition-transform shadow-inner">▶️</div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg md:text-xl font-bold text-white mb-1">{ch.name}</h3>
                <p className="truncate text-gray-400 font-medium uppercase tracking-wider text-[10px] md:text-xs">{ch.subject}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-gray-800 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">🛠️</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-gray-500 break-words">Creator Studio</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">System administration and data injection.</p>
        </div>
      </div>
      
      <div className="bg-gray-900/80 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row border-b border-gray-800">
          <button onClick={() => setAdminTab("syllabus")} className={`flex-1 py-4 md:py-6 font-bold text-sm md:text-base transition-all ${adminTab === 'syllabus' ? 'bg-gray-800 text-white border-b-2 sm:border-b-4 border-gray-400' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>Inject Syllabus Data</button>
          <button onClick={() => setAdminTab("channels")} className={`flex-1 py-4 md:py-6 font-bold text-sm md:text-base transition-all ${adminTab === 'channels' ? 'bg-gray-800 text-white border-b-2 sm:border-b-4 border-gray-400' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>Manage Creator Nodes</button>
        </div>

        <div className="p-6 md:p-10">
          {adminTab === "syllabus" && (
            <form onSubmit={handleAdminSubmit} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <input placeholder="Board ID (e.g., CBSE)" value={newSyllabus.board} onChange={e => setNewSyllabus({...newSyllabus, board: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-white focus:border-gray-400 outline-none transition-colors" required/>
                <input placeholder="Grade Level (e.g., Class 10)" value={newSyllabus.grade} onChange={e => setNewSyllabus({...newSyllabus, grade: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-white focus:border-gray-400 outline-none transition-colors" required/>
              </div>
              <input placeholder="Subject Domain" value={newSyllabus.subject} onChange={e => setNewSyllabus({...newSyllabus, subject: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-white focus:border-gray-400 outline-none transition-colors" required/>
              <input placeholder="Chapter Designation" value={newSyllabus.chapter} onChange={e => setNewSyllabus({...newSyllabus, chapter: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-white focus:border-gray-400 outline-none transition-colors" required/>
              <textarea placeholder="Data Payload (Content)..." value={newSyllabus.content} onChange={e => setNewSyllabus({...newSyllabus, content: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-white focus:border-gray-400 outline-none min-h-[120px] md:min-h-[150px] transition-colors" required/>
              <input placeholder="External PDF Link (Optional)" value={newSyllabus.pdfUrl} onChange={e => setNewSyllabus({...newSyllabus, pdfUrl: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 md:px-6 py-3 md:py-4 text-sm md:text-base text-white focus:border-gray-400 outline-none transition-colors"/>
              <button type="submit" className="w-full bg-gray-200 hover:bg-white text-gray-900 font-black tracking-widest uppercase py-4 md:py-5 rounded-xl transition-transform hover:scale-[1.02] shadow-xl mt-4 text-sm md:text-base">Execute Injection</button>
            </form>
          )}
          {adminTab === "channels" && (
            <div className="text-center py-16 md:py-20 text-gray-500 text-base md:text-xl font-medium">
              <p>Node management interface locked in preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // MAIN RETURN 
  // ==========================================
  return (
    <div className="flex h-screen bg-[#02000a] text-white overflow-hidden relative">
      
      {/* GLOBAL STYLES & TAILWIND */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        /* REQUIRED FLEXBOX CSS RESETS */
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow-x: hidden;
          background-color: #02000a;
        }
        body { font-family: 'Space Grotesk', sans-serif; }
        
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #02000a; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #374151; }

        /* FIXED BACKGROUND BUG: Animated Position */
        .space-grid {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
          animation: slideGrid 15s linear infinite;
          pointer-events: none;
        }
        @keyframes slideGrid {
          0% { background-position: 0px 0px; }
          100% { background-position: 50px 50px; }
        }
      `}</style>
      
      <script src="https://cdn.tailwindcss.com"></script>

      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#02000a] to-[#02000a] pointer-events-none z-0"></div>
      <div className="space-grid"></div>

      {/* Mobile Backdrop Overlay */}
      {!isSidebarHidden && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={() => setIsSidebarHidden(true)}></div>
      )}

      {/* 🧭 SIDEBAR NAVIGATION */}
      {!isSidebarHidden && (
        <aside className="fixed lg:static top-0 left-0 h-full w-72 shrink-0 bg-gray-900/90 backdrop-blur-2xl border-r border-gray-800/80 z-[100] flex flex-col shadow-2xl">
          {/* Brand */}
          <div className="p-6 border-b border-gray-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo("home")}>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.5)]">S</div>
              <div>
                <span className="text-xl font-black tracking-tighter block leading-none text-white">StudyHouse</span>
                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">OS v3.0</span>
              </div>
            </div>
            {/* Close Sidebar Button for Mobile */}
            <button className=" text-gray-400 text-2xl hover:text-white" onClick={() => setIsSidebarHidden(true)}>✕</button>
          </div>

          {/* User Stats Node */}
          <div className="p-4 m-4 bg-gray-800/50 rounded-2xl border border-gray-700/50 flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center border border-gray-600 overflow-hidden shrink-0">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full"/>
            </div>
            <div className="truncate">
               <span className="block text-xs text-gray-400 font-medium">Student Node</span>
               <span className="text-yellow-400 font-black text-sm">⭐ {userXP} <span className="text-[10px] text-gray-500">XP</span></span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scroll-smooth">
            {NAV_SYSTEMS.map(sys => (
               <button 
                  key={sys.id} 
                  onClick={() => navigateTo(sys.id)} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${activePage === sys.id ? `bg-gray-800/80 text-white shadow-md border border-gray-700` : `text-gray-400 hover:bg-gray-800/40 hover:text-gray-200`}`}>
                  <span className={`text-xl w-8 text-center shrink-0 ${activePage === sys.id ? 'scale-110' : 'opacity-80'}`}>{sys.icon}</span>
                  <span className="truncate">{sys.label}</span>
               </button>
            ))}
          </div>
        </aside>
      )}

      {/* 🚀 MAIN CONTENT AREA (FLEX-1 AUTO SCROLL) */}
      <main id="main-scroll-area" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative scroll-smooth z-10">
        
        {/* FLOATING MENU BUTTON */}
        {isSidebarHidden && (
          <button 
            onClick={() => setIsSidebarHidden(false)} 
            className="fixed top-4 md:top-6 left-4 md:left-6 z-[60] w-10 h-10 md:w-12 md:h-12 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 text-white rounded-xl flex items-center justify-center hover:border-indigo-500/50 transition-colors shadow-2xl text-lg md:text-xl">
            ☰
          </button>
        )}

        <div className={`w-full max-w-[1536px] mx-auto p-4 md:p-8 lg:p-12 pb-32 min-h-full ${isSidebarHidden ? 'pt-20 md:pt-12' : ''}`}>
          {activePage === "home" && renderHome()}
          {activePage === "academics" && renderAcademics()}
          {activePage === "ai" && renderAI()}
          {activePage === "exams" && renderExams()}
          {activePage === "exam_active" && renderActiveQuiz()}
          {activePage === "flashcards_active" && renderActiveFlashcards()}
          {activePage === "notebook" && renderNotebook()}
          {activePage === "vault" && renderVault()}
          {activePage === "channels" && renderChannels()}
          {activePage === "careers" && renderCareers()}
          {activePage === "admin" && renderAdmin()}
        </div>
      </main>

      {/* FLOATING FOCUS TIMER */}
      <div className="absolute bottom-6 right-6 z-50">
        {!showTimer ? (
          <button onClick={() => setShowTimer(true)} className="w-12 h-12 md:w-14 md:h-14 bg-gray-900 border border-indigo-500/50 rounded-full flex items-center justify-center text-xl md:text-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-transform hover:scale-110 backdrop-blur-xl">
            ⏱️
          </button>
        ) : (
          <div className="bg-gray-900/95 border border-gray-700 p-5 md:p-6 rounded-3xl shadow-2xl backdrop-blur-2xl animate-fade-in flex flex-col items-center w-64 md:w-72">
            <div className="flex justify-between w-full mb-4 items-center">
              <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest border border-gray-700 px-3 py-1 rounded-full bg-gray-800">Focus</span>
              <button onClick={() => setShowTimer(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <h2 className="text-3xl md:text-4xl font-black font-mono tracking-wider mb-5 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{formatTime(timeLeft)}</h2>
            <div className="flex gap-2 w-full">
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 md:py-2.5 rounded-xl font-bold transition-all shadow-lg text-xs md:text-sm">
                {isTimerRunning ? "Pause" : "Start"}
              </button>
              <button onClick={() => { setIsTimerRunning(false); setTimeLeft(25*60); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all font-bold text-xs md:text-sm">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL TOAST NOTIFICATIONS */}
      {toast && (
        <div className="absolute top-6 md:top-10 left-1/2 transform -translate-x-1/2 z-[200] animate-fade-in w-[90%] md:w-auto max-w-sm">
          <div className={`px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs md:text-sm border ${
            toast.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(74,222,128,0.2)]' :
            toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
            'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
          }`}>
            <span className="text-lg md:text-xl shrink-0">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span className="truncate w-full">{toast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}