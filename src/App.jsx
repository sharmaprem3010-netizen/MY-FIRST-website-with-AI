import React, { useState, useEffect, useRef } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider
} from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "./firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyBxKXXVrfbK0XN5yYB_hWjEDk6zzjae5cg";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const googleProvider = new GoogleAuthProvider();

const DEFAULT_ACADEMICS_TREE = {
  "CBSE": {
    "Class 10": ["Mathematics", "Science", "Social Science", "English", "Hindi"],
    "Class 11": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "English"],
    "Class 12": ["Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Business Studies"]
  },
  "ICSE": {
    "Class 10": ["Mathematics", "Physics", "Chemistry", "Biology", "History & Civics", "Geography"],
    "Class 12": ["Mathematics", "Physics", "Chemistry", "Biology", "Commerce"]
  },
  "State Board (WB)": {
    "Class 10": ["Mathematics", "Physical Science", "Life Science", "History", "Geography", "Bengali", "English"],
    "Class 12": ["Physics", "Chemistry", "Mathematics", "Biological Sciences"]
  },
  "University": {
    "Undergrad (B.Tech)": ["Engineering Mathematics", "Engineering Physics", "Data Structures", "Engineering Graphics"],
    "Undergrad (B.Sc)": ["Mechanics", "Electromagnetism", "Organic Chemistry", "Botany"],
    "Undergrad (B.A)": ["English Literature", "Political Science", "Sociology", "History"],
    "Undergrad (B.Com)": ["Financial Accounting", "Business Law", "Economics", "Taxation"]
  }
};

const DEFAULT_CHANNELS = [
  { name: "Physics Wallah", subject: "JEE/NEET", url: "https://www.youtube.com/results?search_query=Physics+Wallah" },
  { name: "CodeWithHarry", subject: "Computer Science", url: "https://www.youtube.com/results?search_query=CodeWithHarry" },
  { name: "Aman Dhattarwal", subject: "Board Exams", url: "https://www.youtube.com/results?search_query=Aman+Dhattarwal" },
  { name: "Khan Academy", subject: "Universal", url: "https://www.youtube.com/results?search_query=Khan+Academy" }
];

const DEFAULT_VAULT_DOCS = [
  { id: "default-1", title: "Mathematics Matrix" },
  { id: "default-2", title: "Physics Core PYQ" },
  { id: "default-3", title: "Chemistry Synthesis" },
  { id: "default-4", title: "Bio Systems Map" }
];

const NAV_SYSTEMS = [
  { id: "home", label: "Spaceport (Home)", icon: "🌌" },
  { id: "academics", label: "Academics Hub", icon: "📚" },
  { id: "ai", label: "Nova AI", icon: "✨" },
  { id: "exams", label: "Exam Simulator", icon: "🎯" },
  { id: "notebook", label: "Neural Notebook", icon: "📓" },
  { id: "vault", label: "Document Vault", icon: "🗄️" },
  { id: "careers", label: "Career Roadmaps", icon: "🚀" },
  { id: "channels", label: "Creator Grid", icon: "📺" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [userXP, setUserXP] = useState(0);
  const [toast, setToast] = useState(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isCreatorMode, setIsCreatorMode] = useState(true);
  const [activePdf, setActivePdf] = useState(null);

  const [personalNotes, setPersonalNotes] = useState([]);
  const [careerPaths, setCareerPaths] = useState({});
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [vaultDocs, setVaultDocs] = useState(DEFAULT_VAULT_DOCS);
  const [academicTree, setAcademicTree] = useState(DEFAULT_ACADEMICS_TREE);
  const [syllabusPDFs, setSyllabusPDFs] = useState({});

  const [academicsParams, setAcademicsParams] = useState({ board: "", grade: "", subject: "" });
  const [studyPlan, setStudyPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hello! I am Nova. Your neural network is synced. What complex system shall we decode today?" }
  ]);

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeFlashcards, setActiveFlashcards] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quickChannel, setQuickChannel] = useState({ name: "", subject: "" });
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [newBoardInput, setNewBoardInput] = useState("");
  const [newGradeInput, setNewGradeInput] = useState("");
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const chatEndRef = useRef(null);
  const userXPRef = useRef(0);
  const unsubscribeRefs = useRef([]);

  // ==========================================
  // 🔐 AUTH
  // ==========================================

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeRefs.current.forEach(fn => fn());
      unsubscribeRefs.current = [];

      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserData(firebaseUser.uid);
      } else {
        setUser(null);
        setPersonalNotes([]);
        setChannels(DEFAULT_CHANNELS);
        setVaultDocs(DEFAULT_VAULT_DOCS);
        setAcademicTree(DEFAULT_ACADEMICS_TREE);
        setSyllabusPDFs({});
        setUserXP(0);
        userXPRef.current = 0;
      }
      setAuthLoading(false);
    });

    if (window.innerWidth < 1024) setIsSidebarHidden(true);
    return () => {
      unsubAuth();
      unsubscribeRefs.current.forEach(fn => fn());
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotification("Welcome! Neural link established.", "success");
    } catch (error) {
      showNotification("Sign-in failed: " + error.message, "error");
    }
  };

  const handleGuestSignIn = async () => {
    try {
      await signInAnonymously(auth);
      showNotification("Guest session started. Data won't persist long-term.", "info");
    } catch (error) {
      showNotification("Guest sign-in failed.", "error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showNotification("Neural link disconnected.", "info");
  };

  // ==========================================
  // 💾 LOAD USER DATA
  // ==========================================

  const loadUserData = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.xp !== undefined) {
          setUserXP(data.xp);
          userXPRef.current = data.xp;
        }
        if (data.academicTree) setAcademicTree(data.academicTree);
        if (data.channels) setChannels(data.channels);
        // ✅ Load saved syllabus PDF URLs from Firestore
        if (data.syllabi) setSyllabusPDFs(data.syllabi);
      }

      // ✅ Real-time notes listener (cleaned up properly)
      const notesRef = collection(db, "users", uid, "notes");
      const notesQuery = query(notesRef, orderBy("createdAt", "desc"));
      const unsubNotes = onSnapshot(notesQuery, (snap) => {
        setPersonalNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // ✅ Real-time vault listener (cleaned up properly)
      const vaultRef = collection(db, "users", uid, "vault");
      const unsubVault = onSnapshot(vaultRef, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setVaultDocs(docs.length > 0 ? docs : DEFAULT_VAULT_DOCS);
      });

      // ✅ Store unsub functions for cleanup
      unsubscribeRefs.current = [unsubNotes, unsubVault];

      const careerRef = doc(db, "users", uid, "data", "careers");
      const careerSnap = await getDoc(careerRef);
      if (careerSnap.exists()) {
        setCareerPaths(careerSnap.data().paths || {});
      } else {
        setCareerPaths({
          "Engineering": [
            { id: 1, title: "JEE Mains Prep", desc: "Physics, Chem, Math mastery.", icon: "⚙️", reqXp: 0 },
            { id: 2, title: "Advanced Problem Solving", desc: "Mock tests and PYQs.", icon: "🚀", reqXp: 500 }
          ],
          "Medical": [{ id: 1, title: "NEET Basics", desc: "Biology focus.", icon: "🩺", reqXp: 0 }],
          "Software Dev": [
            { id: 1, title: "Web Fundamentals", desc: "HTML, CSS, JS", icon: "💻", reqXp: 0 },
            { id: 2, title: "React & Node", desc: "Fullstack mastery", icon: "🌐", reqXp: 300 }
          ]
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showNotification("Failed to sync data. Check Firestore rules.", "error");
    }
  };

  const saveUserMeta = async (updatedXP, updatedTree, updatedChannels) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        xp: updatedXP,
        academicTree: updatedTree,
        channels: updatedChannels,
        email: user.email || "anonymous",
        displayName: user.displayName || "Student",
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to save meta:", e);
    }
  };

  // ==========================================
  // 🗒️ NOTES
  // ==========================================

  const saveNote = async () => {
    if (!newNote.title || !newNote.content) return showNotification("Title and content required", "error");
    if (!user) return showNotification("Please sign in to save notes!", "error");
    try {
      await addDoc(collection(db, "users", user.uid, "notes"), {
        title: newNote.title,
        content: newNote.content,
        date: new Date().toLocaleDateString(),
        createdAt: serverTimestamp()
      });
      setNewNote({ title: "", content: "" });
      showNotification("Note uploaded to Neural Notebook.", "success");
      addXP(10);
    } catch (e) {
      showNotification("Failed to save note.", "error");
    }
  };

  const deleteNote = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "notes", id));
      showNotification("Note deleted.", "info");
    } catch (e) {
      showNotification("Failed to delete note.", "error");
    }
  };

  // ==========================================
  // 🗄️ VAULT — Firebase Storage (PERMANENT)
  // ==========================================

  const handleVaultUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!user) return showNotification("Please sign in to upload!", "error");

    setIsUploading(true);
    showNotification("Uploading PDF to vault...", "info");
    try {
      // ✅ Upload file to Firebase Storage — permanent URL
      const storageRef = ref(storage, `users/${user.uid}/vault/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // ✅ Save permanent URL + storage path to Firestore
      await addDoc(collection(db, "users", user.uid, "vault"), {
        title: file.name,
        url: downloadURL,
        storagePath: snapshot.ref.fullPath,
        uploadedAt: serverTimestamp()
      });

      showNotification("PDF uploaded permanently! ✅", "success");
    } catch (e) {
      console.error(e);
      showNotification("Failed to upload PDF.", "error");
    }
    setIsUploading(false);
  };

  const deleteVaultDoc = async (id) => {
    if (!user) return;
    if (id.startsWith("default-")) {
      setVaultDocs(prev => prev.filter(item => item.id !== id));
      return;
    }
    try {
      const docToDelete = vaultDocs.find(d => d.id === id);
      // ✅ Delete from Firebase Storage too
      if (docToDelete?.storagePath) {
        const storageRef = ref(storage, docToDelete.storagePath);
        await deleteObject(storageRef);
      }
      await deleteDoc(doc(db, "users", user.uid, "vault", id));
      showNotification("PDF deleted.", "info");
    } catch (e) {
      console.error(e);
      showNotification("Failed to delete.", "error");
    }
  };

  // ==========================================
  // 📄 SYLLABUS — Firebase Storage (PERMANENT)
  // ==========================================

  const handleSyllabusUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setIsUploading(true);
    showNotification("Uploading syllabus...", "info");
    try {
      const key = `${academicsParams.board}__${academicsParams.grade}__${academicsParams.subject}`;
      // ✅ Upload to Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/syllabus/${key}.pdf`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // ✅ Save permanent URL to Firestore user doc
      await setDoc(doc(db, "users", user.uid), {
        syllabi: { [key]: downloadURL }
      }, { merge: true });

      setSyllabusPDFs(prev => ({ ...prev, [key]: downloadURL }));
      showNotification("Syllabus uploaded permanently! ✅", "success");
    } catch (e) {
      console.error(e);
      showNotification("Failed to upload syllabus.", "error");
    }
    setIsUploading(false);
  };

  const handleRemoveSyllabus = async () => {
    if (!user) return;
    const key = `${academicsParams.board}__${academicsParams.grade}__${academicsParams.subject}`;
    try {
      // ✅ Delete from Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/syllabus/${key}.pdf`);
      await deleteObject(storageRef).catch(() => {}); // ignore if not found

      // ✅ Remove from Firestore
      const updated = { ...syllabusPDFs };
      delete updated[key];
      await setDoc(doc(db, "users", user.uid), { syllabi: updated }, { merge: true });
      setSyllabusPDFs(updated);
      showNotification("Syllabus PDF Removed", "info");
    } catch (e) {
      showNotification("Failed to remove syllabus.", "error");
    }
  };

  // ==========================================
  // 📡 CHANNELS & ACADEMIC TREE
  // ==========================================

  const handleAddChannel = async () => {
    if (!quickChannel.name || !quickChannel.subject) return showNotification("Name & Subject required", "error");
    const smartUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(quickChannel.name)}`;
    const updated = [...channels, { name: quickChannel.name, subject: quickChannel.subject, url: smartUrl }];
    setChannels(updated);
    setQuickChannel({ name: "", subject: "" });
    showNotification("Creator Node Added", "success");
    await saveUserMeta(userXPRef.current, academicTree, updated);
  };

  const deleteChannel = async (index) => {
    const updated = channels.filter((_, i) => i !== index);
    setChannels(updated);
    await saveUserMeta(userXPRef.current, academicTree, updated);
  };

  const persistAcademicTree = async (newTree) => {
    setAcademicTree(newTree);
    await saveUserMeta(userXPRef.current, newTree, channels);
  };

  const handleAddBoard = async () => {
    const b = newBoardInput.trim();
    if (b && !academicTree[b]) {
      await persistAcademicTree({ ...academicTree, [b]: {} });
      setNewBoardInput("");
      showNotification("Board Added!", "success");
    }
  };

  const handleDeleteBoard = async (board) => {
    const next = { ...academicTree };
    delete next[board];
    await persistAcademicTree(next);
    if (academicsParams.board === board) setAcademicsParams({ board: "", grade: "", subject: "" });
  };

  const handleAddGrade = async () => {
    const g = newGradeInput.trim();
    if (g && !academicTree[academicsParams.board][g]) {
      const next = { ...academicTree };
      next[academicsParams.board] = { ...next[academicsParams.board], [g]: [] };
      await persistAcademicTree(next);
      setNewGradeInput("");
      showNotification("Grade Added to Board!", "success");
    }
  };

  const handleDeleteGrade = async (grade) => {
    const next = { ...academicTree };
    const boardNode = { ...next[academicsParams.board] };
    delete boardNode[grade];
    next[academicsParams.board] = boardNode;
    await persistAcademicTree(next);
    if (academicsParams.grade === grade) setAcademicsParams({ ...academicsParams, grade: "", subject: "" });
  };

  const handleAddSubject = async () => {
    const s = newSubjectInput.trim();
    if (s && !academicTree[academicsParams.board][academicsParams.grade].includes(s)) {
      const next = { ...academicTree };
      next[academicsParams.board][academicsParams.grade] = [...next[academicsParams.board][academicsParams.grade], s];
      await persistAcademicTree(next);
      setNewSubjectInput("");
      showNotification("Subject Added to Grade!", "success");
    }
  };

  const handleDeleteSubject = async (subject) => {
    const next = { ...academicTree };
    next[academicsParams.board][academicsParams.grade] = next[academicsParams.board][academicsParams.grade].filter(x => x !== subject);
    await persistAcademicTree(next);
    if (academicsParams.subject === subject) setAcademicsParams({ ...academicsParams, subject: "" });
  };

  // ==========================================
  // ⭐ XP SYSTEM
  // ==========================================

  const addXP = async (amount) => {
    // ✅ Use ref to avoid stale closure
    const newXP = userXPRef.current + amount;
    userXPRef.current = newXP;
    setUserXP(newXP);
    showNotification(`+${amount} XP Gained!`, "success");
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { xp: newXP }, { merge: true });
      } catch (e) { console.error("XP save failed", e); }
    }
  };

  // ==========================================
  // UTILS
  // ==========================================

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const showNotification = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const navigateTo = (page) => {
    setActivePage(page);
    if (window.innerWidth < 1024) setIsSidebarHidden(true);
    document.getElementById('main-scroll-area')?.scrollTo(0, 0);
  };

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
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

  // ==========================================
  // AI LOGIC
  // ==========================================

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setIsGenerating(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(`You are Nova, an extremely advanced, friendly, and genius AI tutor for Indian students. Answer accurately and keep it engaging.\n\nStudent Query: "${userMsg}"`);
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
      const result = await model.generateContent(`Create a 3-question multiple-choice quiz about "${topicName}" for a student. Return ONLY a valid JSON array: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "Exact text of correct option"}]`);
      setActiveQuiz({ topic: topicName, questions: JSON.parse(result.response.text()), currentIndex: 0, score: 0 });
      navigateTo("exam_active");
    } catch (error) {
      showNotification("Failed to generate quiz. Check API Key.", "error");
    }
    setIsGenerating(false);
  };

  const generateAIFlashcards = async (topicName) => {
    if (!topicName.trim()) return showNotification("Please enter a topic!", "error");
    setIsGenerating(true);
    showNotification("Crafting flashcards...", "info");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const result = await model.generateContent(`Create 5 high-yield study flashcards about "${topicName}". Return ONLY a valid JSON array: [{"front": "Question or Concept", "back": "Answer or Detailed Definition"}]`);
      setActiveFlashcards({ topic: topicName, cards: JSON.parse(result.response.text()) });
      setFlashcardIndex(0);
      setIsFlipped(false);
      navigateTo("flashcards_active");
    } catch (error) {
      showNotification("Failed to generate flashcards.", "error");
    }
    setIsGenerating(false);
  };

  const generateStudyPlan = async (subject, grade) => {
    setIsGenerating(true);
    showNotification("Drafting your spatial study plan...", "info");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(`Create a 7-day intensive study plan for a ${grade} student preparing for ${subject}. Format using HTML tags like <b>, <ul>, <li>, <h3>. Make it highly actionable. Keep it concise.`);
      setStudyPlan(result.response.text());
      showNotification("Study plan generated! ✨", "success");
    } catch (error) {
      showNotification("Failed to generate plan.", "error");
    }
    setIsGenerating(false);
  };

  const polishNoteWithAI = async () => {
    if (!newNote.content.trim()) return showNotification("Write some rough notes first!", "error");
    setIsGenerating(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(`Rewrite and structure these notes to be highly professional, well-formatted, and easy to study from:\n"${newNote.content}"`);
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
      const result = await model.generateContent(`Explain the following concepts as if I am 5 years old. Use simple words, fun analogies, and short sentences:\n"${newNote.content}"`);
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

  // ==========================================
  // 🔐 SIGN-IN SCREEN
  // ==========================================

  const renderSignIn = () => (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-600/5 rounded-full blur-[80px]"></div>
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-[0_0_60px_rgba(99,102,241,0.4)] text-4xl">S</div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">StudyHouse</h1>
          <p className="text-indigo-400 font-bold tracking-widest text-xs uppercase">OS v3.0 — Neural Edition</p>
        </div>
        <div className="bg-[#111827] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-black text-white mb-2 text-center">Initialize Connection</h2>
          <p className="text-gray-400 text-center text-sm mb-8">Sign in to sync your data across all sessions</p>
          <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 mb-4 text-base">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <div className="relative flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>
          <button onClick={handleGuestSignIn} className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 font-bold py-4 px-6 rounded-2xl transition-all duration-200 text-base">
            <span>👤</span> Continue as Guest
          </button>
          <p className="text-center text-gray-500 text-xs mt-6 leading-relaxed">Guest data is stored temporarily. Sign in with Google to keep your notes, XP, and settings permanently.</p>
        </div>
        <div className="mt-6 flex justify-center gap-6 flex-wrap">
          {["📚 Academics", "✨ Nova AI", "📓 Notebook", "🎯 Quizzes"].map(f => (
            <span key={f} className="text-xs text-gray-600 font-bold tracking-wide">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderHome = () => (
    <div className="animate-fade-in w-full">
      <div className="text-center relative z-10 mb-12">
        <div className="inline-block p-1 px-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium mb-6 backdrop-blur-md">v3.0 Spatial Interface Online</div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-none drop-shadow-2xl text-white">
          Limitless <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-pulse">Dimensions.</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-400 leading-relaxed font-light max-w-3xl mx-auto px-4">The all-in-one spatial educational universe. Enter the simulator, decode your syllabus, and let Nova AI guide your path.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full pb-20">
        {NAV_SYSTEMS.slice(1, 8).map((system, idx) => (
          <div key={idx} onClick={() => navigateTo(system.id)} className="group relative cursor-pointer flex flex-col h-full min-h-[16rem]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative flex-1 bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 lg:p-8 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-10 text-9xl transition-transform group-hover:scale-110 pointer-events-none select-none">{system.icon}</div>
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 shadow-lg shrink-0">{system.icon}</div>
              <div className="relative z-10 flex-1 flex flex-col">
                <h2 className="text-2xl lg:text-3xl font-bold mb-3 text-white break-words">{system.label}</h2>
                <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed">Enter the {system.label.toLowerCase()} to expand your neural knowledge base.</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAcademics = () => {
    const key = `${academicsParams.board}__${academicsParams.grade}__${academicsParams.subject}`;
    const currentSyllabusPDF = syllabusPDFs[key];
    return (
      <div className="animate-fade-in relative">
        <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-white/10 pb-6 w-full">
          <span className="text-4xl md:text-5xl shrink-0">📚</span>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 break-words">Academics Hub</h1>
            <p className="text-gray-400 text-sm md:text-lg mt-2">Select your parameters to access the mainframe.</p>
          </div>
        </div>

        {studyPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-gray-900 border border-purple-500/50 rounded-3xl p-6 md:p-10 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-[0_0_100px_rgba(168,85,247,0.2)]">
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Strategic Plan Generated</h2>
                <button onClick={() => setStudyPlan(null)} className="text-gray-400 hover:text-white text-3xl">✕</button>
              </div>
              <div className="prose prose-invert prose-base md:prose-lg prose-purple max-w-none text-gray-300 font-light leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: studyPlan }} />
              <div className="mt-8 text-center">
                <button onClick={() => setStudyPlan(null)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/30">Initialize Protocol</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="bg-[#111827] backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-300 flex items-center gap-3"><span className="text-blue-500">01.</span> Select Board</h3>
            <div className="flex flex-wrap gap-3 md:gap-4 items-center">
              {Object.keys(academicTree).map(b => (
                <div key={b} className="relative group">
                  <button onClick={() => setAcademicsParams({ board: b, grade: "", subject: "" })} className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.board === b ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>{b}</button>
                  {isCreatorMode && <button onClick={() => handleDeleteBoard(b)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>}
                </div>
              ))}
              {isCreatorMode && (
                <div className="flex items-center bg-gray-800/50 border border-dashed border-gray-600 rounded-2xl px-4 py-2">
                  <input value={newBoardInput} onChange={e => setNewBoardInput(e.target.value)} placeholder="Add Board..." className="bg-transparent outline-none text-sm text-white w-24 md:w-28 placeholder-gray-500" onKeyDown={e => { if (e.key === 'Enter') handleAddBoard(); }}/>
                  <button onClick={handleAddBoard} className="text-blue-400 hover:text-blue-300 font-bold text-xl ml-2">+</button>
                </div>
              )}
            </div>
          </div>

          {academicsParams.board && (
            <div className="bg-[#111827] backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl animate-fade-in">
              <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-300 flex items-center gap-3"><span className="text-cyan-500">02.</span> Select Grade</h3>
              <div className="flex flex-wrap gap-3 md:gap-4 items-center">
                {Object.keys(academicTree[academicsParams.board] || {}).map(c => (
                  <div key={c} className="relative group">
                    <button onClick={() => setAcademicsParams({ ...academicsParams, grade: c, subject: "" })} className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.grade === c ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>{c}</button>
                    {isCreatorMode && <button onClick={() => handleDeleteGrade(c)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>}
                  </div>
                ))}
                {isCreatorMode && (
                  <div className="flex items-center bg-gray-800/50 border border-dashed border-gray-600 rounded-2xl px-4 py-2">
                    <input value={newGradeInput} onChange={e => setNewGradeInput(e.target.value)} placeholder="Add Grade..." className="bg-transparent outline-none text-sm text-white w-24 md:w-28 placeholder-gray-500" onKeyDown={e => { if (e.key === 'Enter') handleAddGrade(); }}/>
                    <button onClick={handleAddGrade} className="text-cyan-400 hover:text-cyan-300 font-bold text-xl ml-2">+</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {academicsParams.grade && (
            <div className="bg-[#111827] backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl animate-fade-in">
              <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-300 flex items-center gap-3"><span className="text-teal-500">03.</span> Select Subject</h3>
              <div className="flex flex-wrap gap-3 md:gap-4 items-center">
                {(academicTree[academicsParams.board]?.[academicsParams.grade] || []).map(s => (
                  <div key={s} className="relative group">
                    <button onClick={() => setAcademicsParams({ ...academicsParams, subject: s })} className={`px-6 py-3 md:px-8 md:py-4 rounded-2xl font-medium text-sm md:text-base transition-all ${academicsParams.subject === s ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>{s}</button>
                    {isCreatorMode && <button onClick={() => handleDeleteSubject(s)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>}
                  </div>
                ))}
                {isCreatorMode && (
                  <div className="flex items-center bg-gray-800/50 border border-dashed border-gray-600 rounded-2xl px-4 py-2">
                    <input value={newSubjectInput} onChange={e => setNewSubjectInput(e.target.value)} placeholder="Add Subject..." className="bg-transparent outline-none text-sm text-white w-24 md:w-28 placeholder-gray-500" onKeyDown={e => { if (e.key === 'Enter') handleAddSubject(); }}/>
                    <button onClick={handleAddSubject} className="text-teal-400 hover:text-teal-300 font-bold text-xl ml-2">+</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {academicsParams.subject && (
            <div className="pt-6 animate-fade-in w-full">
              <div className="w-full bg-gradient-to-r from-[#111827] to-[#0f1422] border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl">
                <h2 className="text-2xl md:text-4xl font-black mb-8 text-white break-words w-full">{academicsParams.subject} <span className="text-gray-500 text-lg md:text-2xl font-normal ml-2">| {academicsParams.grade}</span></h2>
                <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-10">
                  <div className="w-full min-w-0 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-blue-400"><span>📄</span> Official Syllabus</h4>
                      {isCreatorMode && currentSyllabusPDF && <button onClick={handleRemoveSyllabus} className="text-xs font-bold tracking-widest uppercase bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-colors border border-red-500/30">Remove PDF</button>}
                    </div>
                    {!currentSyllabusPDF ? (
                      <div className="flex-1 border border-dashed border-gray-700 rounded-3xl bg-gray-900/30 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                        <p className="text-gray-400 mb-6 text-sm md:text-base">No syllabus document uploaded for this subject yet.</p>
                        {isCreatorMode && (
                          <label className={`bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isUploading ? '⏳ Uploading...' : '📁 Upload PDF Syllabus'}
                            <input type="file" accept=".pdf" className="hidden" onChange={handleSyllabusUpload} disabled={isUploading}/>
                          </label>
                        )}
                      </div>
                    ) : (
                      <div onClick={() => setActivePdf(currentSyllabusPDF)} className="flex-1 w-full bg-gray-800/80 border border-gray-700 hover:border-blue-500/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-xl cursor-pointer group min-h-[300px]">
                        <div className="text-6xl md:text-8xl mb-6 group-hover:scale-110 transition-transform duration-300 drop-shadow-md">📄</div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Official Syllabus Document</h3>
                        <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-blue-400 bg-blue-900/20 px-4 py-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">Click to Open Viewer</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <h4 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3 text-purple-400"><span>🤖</span> AI Directives</h4>
                    <div className="space-y-4 w-full">
                      <button onClick={() => { setChatInput(`Generate a detailed day-by-step learning roadmap to master ${academicsParams.subject} for ${academicsParams.grade} (${academicsParams.board}).`); navigateTo("ai"); }} className="w-full bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-500/30 text-left px-5 py-5 md:px-8 md:py-6 rounded-2xl transition-all font-bold text-sm md:text-lg flex justify-between items-center group shadow-lg text-white">
                        <span className="truncate pr-4">Request Dedicated Roadmap</span><span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">→</span>
                      </button>
                      <button onClick={() => { setChatInput(`Please provide a comprehensive crash course for ${academicsParams.subject} in ${academicsParams.grade} (${academicsParams.board}).`); navigateTo("ai"); }} className="w-full bg-gradient-to-r from-cyan-900/80 to-blue-900/80 hover:from-cyan-600 hover:to-blue-600 border border-cyan-500/30 text-left px-5 py-5 md:px-8 md:py-6 rounded-2xl transition-all font-bold text-sm md:text-lg flex justify-between items-center group shadow-lg text-white">
                        <span className="truncate pr-4">Initiate AI Crash Course</span><span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">→</span>
                      </button>
                      <button onClick={() => generateAIQuiz(`${academicsParams.subject} class ${academicsParams.grade} ${academicsParams.board}`)} className="w-full bg-gradient-to-r from-teal-900/80 to-emerald-900/80 hover:from-teal-600 hover:to-emerald-600 border border-teal-500/30 text-left px-5 py-5 md:px-8 md:py-6 rounded-2xl transition-all font-bold text-sm md:text-lg flex justify-between items-center group shadow-lg text-white">
                        <span className="truncate pr-4">Enter Mock Simulator</span><span className="text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">→</span>
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
  };

  const renderAI = () => (
    <div className="animate-fade-in flex flex-col h-full min-h-[75vh]">
      <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-white/10 pb-4 shrink-0 w-full">
        <span className="text-4xl md:text-5xl">✨</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 truncate">Nova AI Core</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-1">Your personal neural tutor.</p>
        </div>
      </div>
      <div className="flex-1 bg-[#111827] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-lg relative">
        <div className="bg-gradient-to-b from-gray-800/80 to-transparent p-6 border-b border-white/10 flex flex-col items-center justify-center shrink-0 w-full">
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
            <div key={i} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] md:max-w-[80%] p-4 md:p-6 rounded-3xl shadow-lg ${m.sender === 'user' ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'}`}>
                <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-light break-words">{m.text}</p>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start w-full">
              <div className="bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-3xl rounded-tl-sm flex gap-3 shadow-lg">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#22d3ee]"></div>
                <div className="w-2 h-2 md:w-3 md:h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#22d3ee]" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 md:w-3 md:h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#22d3ee]" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-2 w-full" />
        </div>
        <div className="p-4 md:p-6 bg-gray-900 border-t border-white/10 shrink-0 w-full">
          <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-4 w-full max-w-5xl mx-auto">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Query the Nova system..." className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-sm md:text-lg text-white focus:outline-none focus:border-cyan-500 transition-all shadow-inner" disabled={isGenerating}/>
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
      <div className="flex flex-wrap items-center gap-4 mb-10 border-b border-white/10 pb-6 w-full">
        <span className="text-4xl md:text-5xl shrink-0">🎯</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 break-words">Exam Simulator</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Generate infinite test scenarios and 3D flashcards.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 w-full">
        <div className="group relative flex flex-col w-full">
          <div className="absolute inset-0 bg-green-500 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
          <div className="relative flex-1 bg-[#111827] border border-white/10 p-6 md:p-10 rounded-3xl backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-green-500/50 shadow-2xl flex flex-col justify-between">
            <div className="text-5xl md:text-6xl mb-6 text-center drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">📝</div>
            <div className="w-full">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">Mock Simulator</h3>
              <input id="quiz-topic" placeholder="e.g., Thermodynamics Class 11" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-sm md:text-base text-white mb-6 focus:border-green-500 outline-none shadow-inner transition-colors"/>
            </div>
            <button onClick={() => generateAIQuiz(document.getElementById("quiz-topic").value)} disabled={isGenerating} className="w-full mt-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-4 rounded-2xl text-base md:text-lg transition-all hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] disabled:opacity-50">
              {isGenerating ? "Initializing..." : "Generate Test Sequence"}
            </button>
          </div>
        </div>
        <div className="group relative flex flex-col w-full">
          <div className="absolute inset-0 bg-yellow-500 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
          <div className="relative flex-1 bg-[#111827] border border-white/10 p-6 md:p-10 rounded-3xl backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-2 group-hover:border-yellow-500/50 shadow-2xl flex flex-col justify-between">
            <div className="text-5xl md:text-6xl mb-6 text-center drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">⚡</div>
            <div className="w-full">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">Neural Flashcards</h3>
              <input id="flashcard-topic" placeholder="e.g., Organic Chemistry Reactions" className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-sm md:text-base text-white mb-6 focus:border-yellow-500 outline-none shadow-inner transition-colors"/>
            </div>
            <button onClick={() => generateAIFlashcards(document.getElementById("flashcard-topic").value)} disabled={isGenerating} className="w-full mt-auto bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-4 rounded-2xl text-base md:text-lg transition-all hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] disabled:opacity-50">
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
    const progress = (activeQuiz.currentIndex / activeQuiz.questions.length) * 100;
    return (
      <div className="w-full max-w-4xl mx-auto py-8 md:py-12 animate-fade-in">
        <div className="w-full mb-8 flex flex-wrap gap-4 justify-between items-center text-gray-400 font-bold text-xs md:text-sm uppercase tracking-widest">
          <span>Question {activeQuiz.currentIndex + 1} // {activeQuiz.questions.length}</span>
          <span className="text-green-400 bg-green-900/30 px-4 py-2 rounded-full border border-green-500/30">Score: {activeQuiz.score}</span>
        </div>
        <div className="w-full bg-gray-800 h-2 md:h-3 rounded-full mb-8 overflow-hidden shadow-inner">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(74,222,128,0.8)]" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="w-full bg-[#111827] border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <h2 className="w-full text-xl md:text-3xl font-black mb-8 md:mb-10 leading-snug text-white break-words">{currentQ.question}</h2>
          <div className="w-full grid grid-cols-1 gap-4">
            {currentQ.options.map((opt, i) => (
              <button key={i} onClick={() => handleQuizAnswer(opt)} className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-green-500 p-5 md:p-6 rounded-2xl transition-all font-medium text-base md:text-lg hover:translate-x-1 shadow-lg flex items-start gap-4">
                <span className="text-green-500 font-black shrink-0">{String.fromCharCode(65 + i)}.</span>
                <span className="break-words w-full">{opt}</span>
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
      <div className="w-full max-w-4xl mx-auto py-8 md:py-10 animate-fade-in text-center flex flex-col items-center min-h-[70vh] justify-center">
        <h2 className="w-full text-2xl md:text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 break-words">Neural Deck Online</h2>
        <p className="w-full max-w-2xl text-gray-400 mb-8 md:mb-10 font-medium text-sm md:text-lg bg-gray-900 px-4 py-2 rounded-full border border-gray-800 break-words">{activeFlashcards.topic}</p>
        <div className="w-full min-h-[300px] md:min-h-[350px] mb-10 cursor-pointer group relative" onClick={() => setIsFlipped(!isFlipped)}>
          {!isFlipped ? (
            <div className="w-full h-full min-h-[300px] md:min-h-[350px] bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-yellow-500/50 rounded-3xl p-6 md:p-12 flex flex-col items-center justify-center shadow-2xl animate-fade-in">
              <div className="absolute top-4 left-6 text-gray-500 font-bold tracking-widest text-[10px] md:text-xs uppercase">Card {flashcardIndex + 1}/{activeFlashcards.cards.length}</div>
              <h3 className="w-full break-words text-xl md:text-4xl font-black text-white text-center leading-snug mt-6 mb-8">{currentCard.front}</h3>
              <p className="mt-auto text-yellow-500/70 text-[10px] md:text-xs font-bold tracking-widest uppercase animate-pulse">Click to reveal answer</p>
            </div>
          ) : (
            <div className="w-full h-full min-h-[300px] md:min-h-[350px] bg-gradient-to-br from-yellow-900/40 to-gray-900 border border-yellow-500/30 rounded-3xl p-6 md:p-12 flex flex-col items-center justify-center shadow-2xl animate-fade-in">
              <div className="absolute top-4 left-6 text-yellow-500/50 font-bold tracking-widest text-[10px] md:text-xs uppercase">Answer</div>
              <p className="w-full break-words text-base md:text-2xl font-medium text-gray-200 text-center leading-relaxed mt-6 mb-8">{currentCard.back}</p>
              <p className="mt-auto text-gray-500 text-[10px] md:text-xs font-bold tracking-widest uppercase">Click to view question</p>
            </div>
          )}
        </div>
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-6">
          <button disabled={flashcardIndex === 0} onClick={() => { setFlashcardIndex(prev => prev - 1); setIsFlipped(false); }} className="w-full flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 border border-gray-700 text-white py-4 rounded-xl font-bold text-sm md:text-lg transition-all shadow-lg">← Previous</button>
          {flashcardIndex === activeFlashcards.cards.length - 1 ? (
            <button onClick={() => { addXP(100); showNotification("Deck Finished! +100 XP", "success"); setActivePage("exams"); }} className="w-full flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-gray-900 py-4 rounded-xl font-black text-sm md:text-lg transition-all shadow-lg">COMPLETE DECK 🏆</button>
          ) : (
            <button onClick={() => { setFlashcardIndex(prev => prev + 1); setIsFlipped(false); }} className="w-full flex-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white py-4 rounded-xl font-bold text-sm md:text-lg transition-all shadow-lg">Next →</button>
          )}
        </div>
      </div>
    );
  };

  const renderNotebook = () => (
    <div className="w-full animate-fade-in">
      <div className="w-full flex flex-wrap items-center gap-4 mb-10 border-b border-white/10 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">📓</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 break-words">Neural Notebook</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Document and refine your data with AI.</p>
        </div>
      </div>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="w-full lg:col-span-1 bg-[#111827] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl h-fit lg:sticky top-6 shadow-2xl flex flex-col">
          <h3 className="text-xl md:text-2xl font-bold mb-6 text-white border-b border-white/10 pb-4">New Entry</h3>
          <input placeholder="Topic Header..." value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 md:py-4 mb-4 md:mb-6 text-sm md:text-base text-white focus:border-pink-500 outline-none transition-colors"/>
          <textarea placeholder="Input raw data here..." value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 md:py-4 mb-4 md:mb-6 text-sm md:text-base text-white focus:border-pink-500 outline-none min-h-[150px] md:min-h-[200px] resize-y transition-colors leading-relaxed"/>
          <div className="w-full flex flex-col gap-3 md:gap-4">
            <button onClick={saveNote} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 md:py-4 rounded-xl transition-all shadow-lg text-sm md:text-base">Save to Storage</button>
            <div className="w-full flex gap-3 md:gap-4">
              <button onClick={polishNoteWithAI} disabled={isGenerating} className="w-full flex-1 bg-gray-800 hover:bg-gray-700 border border-pink-500/30 text-white font-bold py-3 md:py-4 rounded-xl transition-all flex justify-center items-center gap-2 group text-xs md:text-sm">
                {isGenerating ? "..." : <><span className="group-hover:animate-spin">✨</span> Polish</>}
              </button>
              <button onClick={simplifyNoteWithAI} disabled={isGenerating} className="w-full flex-1 bg-gray-800 hover:bg-gray-700 border border-teal-500/30 text-white font-bold py-3 md:py-4 rounded-xl transition-all flex justify-center items-center gap-2 group text-xs md:text-sm">
                {isGenerating ? "..." : <><span className="group-hover:animate-bounce">👶</span> ELI5</>}
              </button>
            </div>
          </div>
        </div>
        <div className="w-full lg:col-span-2 space-y-6 md:space-y-8 flex flex-col">
          {personalNotes.length === 0 ? (
            <div className="w-full text-center py-20 bg-[#111827]/50 border border-dashed border-gray-800 rounded-3xl">
              <p className="text-5xl md:text-6xl mb-4 md:mb-6 opacity-50">📂</p>
              <p className="text-base md:text-lg text-gray-500 font-medium">Storage is empty. Input data to begin.</p>
            </div>
          ) : (
            personalNotes.map(note => (
              <div key={note.id} className="w-full bg-[#111827] border border-white/10 p-6 md:p-8 rounded-3xl hover:border-pink-500/40 transition-colors shadow-xl group">
                <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/10 pb-4">
                  <h3 className="w-full break-words text-xl md:text-2xl font-black text-white leading-tight">{note.title}</h3>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] md:text-xs font-bold tracking-widest text-pink-500 bg-pink-900/20 px-3 py-1.5 rounded-full border border-pink-500/20">{note.date}</span>
                    {isCreatorMode && <button onClick={() => deleteNote(note.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 w-8 h-8 rounded-xl text-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">✕</button>}
                  </div>
                </div>
                <div className="w-full break-words text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none text-sm md:text-base" dangerouslySetInnerHTML={{ __html: note.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderVault = () => (
    <div className="w-full animate-fade-in">
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4 min-w-[200px]">
          <span className="text-4xl md:text-5xl">🗄️</span>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 break-words">Document Vault</h1>
            <p className="text-gray-400 text-sm md:text-lg mt-2">Secure access to vital academic resources.</p>
          </div>
        </div>
        {isCreatorMode && (
          <label className={`w-full sm:w-auto bg-gray-800 border border-gray-700 hover:border-blue-500 px-6 py-3 rounded-xl font-bold transition-all shadow-md text-white text-sm md:text-base text-center cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {isUploading ? '⏳ Uploading...' : '📁 Upload PDF'}
            <input type="file" accept=".pdf" className="hidden" onChange={handleVaultUpload} disabled={isUploading}/>
          </label>
        )}
      </div>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {vaultDocs.map((docItem) => (
          <div key={docItem.id} className="w-full group relative flex flex-col min-h-[12rem] md:min-h-[14rem]">
            <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="w-full relative flex-1 bg-[#111827] border border-white/10 group-hover:border-blue-500/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 group-hover:-translate-y-2 shadow-xl backdrop-blur-md cursor-pointer" onClick={() => docItem.url ? setActivePdf(docItem.url) : showNotification("Upload a PDF to view it here", "info")}>
              {isCreatorMode && <button onClick={(e) => { e.stopPropagation(); deleteVaultDoc(docItem.id); }} className="absolute top-4 right-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 w-8 h-8 flex items-center justify-center rounded-xl text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>}
              <div className="text-4xl md:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-md">📄</div>
              <h4 className="w-full break-words font-bold text-gray-200 text-base md:text-lg leading-tight mb-4">{docItem.title}</h4>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-900/20 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">{docItem.url ? 'Open Viewer' : 'No file'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCareers = () => (
    <div className="w-full animate-fade-in">
      <div className="w-full flex flex-wrap items-center gap-4 mb-10 border-b border-white/10 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">🚀</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 break-words">Career Roadmaps</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Unlock skill trees and navigate your future.</p>
        </div>
      </div>
      {Object.entries(careerPaths).map(([pathName, nodes]) => (
        <div key={pathName} className="w-full mb-16">
          <h2 className="w-full text-2xl md:text-3xl font-black mb-8 text-white flex items-center gap-3">
            <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_10px_#eab308] shrink-0"></span>
            <span className="break-words">{pathName} Protocol</span>
          </h2>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {nodes.map(node => {
              const unlocked = userXP >= node.reqXp;
              return (
                <div key={node.id} className={`w-full group relative flex flex-col min-h-[14rem] md:min-h-[16rem] ${!unlocked ? 'opacity-70' : ''}`}>
                  <div className={`w-full relative flex-1 bg-[#111827] border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden transition-all duration-300 flex flex-col ${unlocked ? 'hover:border-yellow-500/50 shadow-xl hover:-translate-y-2' : 'border-gray-800'}`}>
                    {!unlocked && (
                      <div className="w-full h-full absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-3xl md:text-4xl mb-3">🔒</span>
                        <span className="bg-gray-900 border border-gray-700 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-[10px] md:text-xs text-gray-400 tracking-widest uppercase shadow-2xl break-words">Requires {node.reqXp} XP</span>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-6 text-6xl opacity-[0.03] transform rotate-12 select-none pointer-events-none">{node.icon}</div>
                    <div className="text-3xl md:text-4xl mb-4 md:mb-6 bg-gray-800/80 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border border-gray-700 shadow-inner shrink-0">{node.icon}</div>
                    <h3 className="w-full break-words text-lg md:text-xl font-black mb-2 md:mb-3 text-white z-10 relative">{node.title}</h3>
                    <p className="w-full break-words text-gray-400 text-xs md:text-sm leading-relaxed z-10 relative">{node.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderChannels = () => (
    <div className="w-full animate-fade-in">
      <div className="w-full flex flex-wrap items-center gap-4 mb-10 border-b border-white/10 pb-6">
        <span className="text-4xl md:text-5xl shrink-0">📺</span>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 break-words">Creator Grid</h1>
          <p className="text-gray-400 text-sm md:text-lg mt-2">Direct feeds to top educational nodes.</p>
        </div>
      </div>
      {isCreatorMode && (
        <div className="w-full mb-8 bg-[#111827] border border-white/10 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-lg">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0 flex items-center gap-2"><span>🛠️</span> Add Channel</div>
          <input placeholder="Creator Name (e.g., Physics Wallah)" value={quickChannel.name} onChange={e => setQuickChannel({ ...quickChannel, name: e.target.value })} className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none"/>
          <input placeholder="Subject (e.g., Universal)" value={quickChannel.subject} onChange={e => setQuickChannel({ ...quickChannel, subject: e.target.value })} className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none"/>
          <button onClick={handleAddChannel} className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shrink-0">Add to Grid</button>
        </div>
      )}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {channels.map((ch, i) => (
          <div key={i} className="w-full group relative cursor-pointer">
            <div className="w-full bg-[#111827] border border-white/10 rounded-3xl p-5 md:p-8 flex items-center gap-4 md:gap-6 transition-all duration-300 hover:border-red-500/50 hover:-translate-y-1 md:hover:-translate-y-2 shadow-xl backdrop-blur-md" onClick={() => window.open(ch.url)}>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shrink-0 group-hover:scale-110 transition-transform shadow-inner">▶️</div>
              <div className="w-full min-w-0 flex-1">
                <h3 className="w-full truncate text-lg md:text-xl font-bold text-white mb-1">{ch.name}</h3>
                <p className="w-full truncate text-gray-400 font-medium uppercase tracking-wider text-[10px] md:text-xs">{ch.subject}</p>
              </div>
              {isCreatorMode && <button onClick={(e) => { e.stopPropagation(); deleteChannel(i); }} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 w-8 h-8 rounded-xl text-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0">✕</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white mx-auto mb-4 animate-pulse">S</div>
          <p className="text-gray-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Neural Link...</p>
        </div>
      </div>
    );
  }

  if (!user) return renderSignIn();

  // ==========================================
  // MAIN LAYOUT
  // ==========================================

  return (
    <div className="flex h-screen w-full bg-[#0B0F1A] text-white overflow-hidden relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        html, body, #root { width: 100%; height: 100%; margin: 0; overflow-x: hidden; background-color: #0B0F1A; }
        body { font-family: 'Space Grotesk', sans-serif; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0B0F1A; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #374151; }
      `}</style>

      {/* SIDEBAR */}
      {!isSidebarHidden && (
        <aside className="w-64 md:w-72 shrink-0 bg-[#111827] border-r border-white/10 z-[100] flex flex-col h-full absolute lg:relative shadow-2xl">
          <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 w-full">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo("home")}>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl group-hover:rotate-12 transition-transform shadow-lg">S</div>
              <div>
                <span className="text-xl font-black tracking-tighter block leading-none text-white">StudyHouse</span>
                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">OS v3.0</span>
              </div>
            </div>
            <button className="text-gray-400 text-2xl hover:text-white shrink-0 p-2" onClick={() => setIsSidebarHidden(true)}>✕</button>
          </div>
          <div className="p-4 m-4 bg-gray-800/50 rounded-2xl border border-gray-700/50 flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-3 w-full">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-full shrink-0 border-2 border-indigo-500/50"/>
              ) : (
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center shrink-0 text-lg">👤</div>
              )}
              <div className="truncate w-full min-w-0">
                <span className="block text-xs text-gray-400 font-medium truncate">{user.displayName || user.email || "Guest"}</span>
                <span className="text-yellow-400 font-black text-sm">⭐ {userXP} XP</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-900 p-3 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => setIsCreatorMode(!isCreatorMode)}>
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Creator Mode</span>
              <button className={`w-10 h-5 rounded-full relative transition-colors ${isCreatorMode ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${isCreatorMode ? 'translate-x-6' : 'translate-x-1'}`}></div>
              </button>
            </div>
            <button onClick={handleSignOut} className="w-full text-xs font-bold tracking-widest uppercase text-gray-500 hover:text-red-400 transition-colors py-1">⏻ Sign Out</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 w-full">
            {NAV_SYSTEMS.map(sys => (
              <button key={sys.id} onClick={() => navigateTo(sys.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-left text-sm ${activePage === sys.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}>
                <span className="text-xl w-6 text-center shrink-0">{sys.icon}</span>
                <span className="truncate w-full">{sys.label}</span>
              </button>
            ))}
          </div>
        </aside>
      )}

      {isSidebarHidden && (
        <button onClick={() => setIsSidebarHidden(false)} className="absolute top-6 left-6 z-[60] w-12 h-12 bg-[#111827] border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-gray-800 shadow-2xl text-xl">☰</button>
      )}

      <main id="main-scroll-area" className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 w-full h-full scroll-smooth">
        <div className={`w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-32 min-h-full ${isSidebarHidden ? 'pt-24 lg:pt-16' : 'pt-4'}`}>
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
        </div>
      </main>

      {/* PDF VIEWER */}
      {activePdf && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-4 md:p-6 w-full max-w-6xl h-full flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-xl md:text-3xl font-black text-white flex items-center gap-3"><span>📄</span> Document Viewer</h2>
              <button onClick={() => setActivePdf(null)} className="text-gray-400 hover:text-white text-3xl md:text-4xl transition-transform hover:scale-110">✕</button>
            </div>
            <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden relative">
              <iframe src={activePdf} className="absolute inset-0 w-full h-full border-none" title="In-App PDF Viewer"/>
            </div>
          </div>
        </div>
      )}

      {/* FOCUS TIMER */}
      <div className="absolute bottom-6 right-6 z-50">
        {!showTimer ? (
          <button onClick={() => setShowTimer(true)} className="w-14 h-14 bg-[#111827] border border-white/10 rounded-full flex items-center justify-center text-2xl shadow-xl hover:scale-110 backdrop-blur-xl transition-transform">⏱️</button>
        ) : (
          <div className="bg-[#111827] border border-white/10 p-5 md:p-6 rounded-3xl shadow-2xl w-64 md:w-72 flex flex-col items-center">
            <div className="flex justify-between w-full mb-3 items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-800 px-2 py-1 rounded">Focus</span>
              <button onClick={() => setShowTimer(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <h2 className="text-3xl font-black font-mono tracking-wider mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{formatTime(timeLeft)}</h2>
            <div className="flex gap-2 w-full">
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold text-sm">{isTimerRunning ? "Pause" : "Start"}</button>
              <button onClick={() => { setIsTimerRunning(false); setTimeLeft(25 * 60); }} className="bg-gray-800 text-gray-300 px-4 py-2 rounded-xl font-bold text-sm">Reset</button>
            </div>
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[400] w-[90%] max-w-sm animate-fade-in">
          <div className={`w-full px-5 py-3 rounded-xl font-bold shadow-2xl backdrop-blur-xl flex items-center gap-3 text-sm border ${toast.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/30' : toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
            <span className="text-lg shrink-0">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span className="truncate w-full">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}