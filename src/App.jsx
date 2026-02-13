import React, { useState } from 'react';

// --- OUR MASSIVE CAREER DATABASE ---
const careerDatabase = [
  // 💻 TECH & ENGINEERING
  {
    id: 1,
    title: 'Software Engineer',
    icon: '💻',
    color: 'border-indigo-500',
    subjects: ['Mathematics', 'Computer Science', 'Physics'],
    youtube: ['CodeWithHarry', 'FreeCodeCamp', 'Harkirat Singh'],
    roadmap:
      'Learn Python/C++ -> Data Structures -> Web/App Dev -> Build Portfolio',
  },
  {
    id: 2,
    title: 'Data Scientist / AI',
    icon: '🤖',
    color: 'border-indigo-500',
    subjects: ['Mathematics (Statistics)', 'Computer Science'],
    youtube: ['Krish Naik', 'StatQuest', 'Corey Schafer'],
    roadmap:
      'Python -> Statistics/Math -> Machine Learning -> Deep Learning (AI)',
  },
  {
    id: 3,
    title: 'Cybersecurity Ethical Hacker',
    icon: '🛡️',
    color: 'border-indigo-500',
    subjects: ['Computer Science', 'Physics', 'Math'],
    youtube: ['NetworkChuck', 'David Bombal', 'HackerSploit'],
    roadmap:
      'Networking Basics -> Linux -> Python -> CEH Certification -> Bug Bounty',
  },

  // ⚕️ MEDICAL & HEALTHCARE
  {
    id: 4,
    title: 'Medical Doctor (MBBS)',
    icon: '⚕️',
    color: 'border-teal-500',
    subjects: ['Biology', 'Chemistry', 'Physics'],
    youtube: ['Physics Wallah', 'Khan Academy Medicine', 'Dr. Najeeb'],
    roadmap:
      'Clear NEET -> MBBS (5.5 yrs) -> Internships -> MD/MS Specialization',
  },
  {
    id: 5,
    title: 'Psychologist / Therapist',
    icon: '🧠',
    color: 'border-teal-500',
    subjects: ['Psychology', 'Biology', 'English'],
    youtube: ['CrashCourse Psychology', 'SciShow Psych'],
    roadmap:
      'BA/BSc Psychology -> MA/MSc Clinical Psychology -> M.Phil / License',
  },
  {
    id: 6,
    title: 'Pharmacist',
    icon: '💊',
    color: 'border-teal-500',
    subjects: ['Chemistry', 'Biology', 'Math (Optional)'],
    youtube: ['Carewell Pharma', 'Speed Pharmacology'],
    roadmap: 'B.Pharm (4 Years) -> GPAT Exam -> M.Pharm or Industry Job',
  },

  // 📊 COMMERCE & BUSINESS
  {
    id: 7,
    title: 'Chartered Accountant (CA)',
    icon: '📊',
    color: 'border-amber-500',
    subjects: ['Accountancy', 'Business Studies', 'Economics'],
    youtube: ['CA Wallah', 'Grooming Education', 'Neeraj Arora'],
    roadmap:
      'Clear CA Foundation -> CA Intermediate -> Articleship (3 Yrs) -> CA Final',
  },
  {
    id: 8,
    title: 'Investment Banker',
    icon: '💰',
    color: 'border-amber-500',
    subjects: ['Economics', 'Math', 'Accountancy'],
    youtube: ['Aswath Damodaran', 'Pranjal Kamra'],
    roadmap:
      'B.Com / BBA -> Top Tier MBA (Finance) or CFA -> Analyst -> Associate',
  },
  {
    id: 9,
    title: 'Digital Marketing Manager',
    icon: '📈',
    color: 'border-amber-500',
    subjects: ['Any Stream', 'Business Studies', 'English'],
    youtube: ['WsCube Tech', 'Neil Patel', 'Umar Tazkeer'],
    roadmap:
      'Learn SEO -> Run Facebook/Google Ads -> Content Marketing -> Freelance/Agency',
  },

  // 🎨 ARTS, DESIGN & HUMANITIES
  {
    id: 10,
    title: 'UI/UX Product Designer',
    icon: '🎨',
    color: 'border-rose-500',
    subjects: ['Any Stream', 'Computer Science (Helpful)'],
    youtube: ['Ansh Mehra', 'DesignCourse', 'Figma'],
    roadmap:
      'Learn Figma -> Color Theory/Typography -> Build Case Studies -> Portfolio',
  },
  {
    id: 11,
    title: 'Corporate Lawyer',
    icon: '⚖️',
    color: 'border-rose-500',
    subjects: ['Political Science', 'History', 'English'],
    youtube: ['LegalEdge', 'Finology Legal'],
    roadmap:
      'Clear CLAT -> BA LLB (5 Years) -> Corporate Internships -> Law Firm',
  },
  {
    id: 12,
    title: 'Architect',
    icon: '🏛️',
    color: 'border-rose-500',
    subjects: ['Mathematics', 'Physics', 'Engineering Drawing'],
    youtube: ['30X40 Design Workshop', 'Balkan Architect'],
    roadmap:
      'Clear NATA / JEE Paper 2 -> B.Arch (5 Years) -> Council Registration',
  },

  // 🇮🇳 DEFENCE & GOVERNMENT
  {
    id: 13,
    title: 'IAS / IPS Officer (UPSC)',
    icon: '🏛️',
    color: 'border-slate-600',
    subjects: ['History', 'Geography', 'Polity', 'Economics'],
    youtube: ['Drishti IAS', 'StudyIQ', 'Vikas Divyakirti'],
    roadmap: 'Graduation (Any) -> UPSC Prelims -> UPSC Mains -> Interview',
  },
  {
    id: 14,
    title: 'Defense Officer (NDA)',
    icon: '⚔️',
    color: 'border-slate-600',
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
    youtube: ['SSB Crack Exams', 'Arpit Choudhary'],
    roadmap:
      'Clear NDA Written Exam -> SSB Interview -> Medical -> Academy Training',
  },
  {
    id: 15,
    title: 'ISRO / Aerospace Scientist',
    icon: '🚀',
    color: 'border-slate-600',
    subjects: ['Physics', 'Mathematics', 'Chemistry'],
    youtube: ['Gareeb Scientist', 'Real Engineering'],
    roadmap:
      'JEE / IAT -> B.Tech (Aerospace/Mech) or IIST -> ICRB Exam -> ISRO',
  },
];

// --- CLASS 10-12 DATABASE ---
const gradeDatabase = {
  'Class 10': [
    {
      subject: 'Mathematics',
      icon: '📐',
      advice:
        "Focus heavily on NCERT examples. Practice Trigonometry and Triangles daily for 45 mins. Don't memorize, understand the steps.",
      channels: ['Vedantu Class 9 & 10', 'Physics Wallah Foundation'],
    },
    {
      subject: 'Science',
      icon: '🔬',
      advice:
        'Break it down: Physics (Numericals), Chemistry (Reactions), Biology (Diagrams). Master Light and Carbon chapters first.',
      channels: ['Bhai Ki Padhai', 'Prashant Kirad'],
    },
    {
      subject: 'Social Studies',
      icon: '🌍',
      advice:
        'Treat history like a movie story. Use timelines. Practice map work every Sunday to secure easy marks.',
      channels: ['Digraj Singh Rajput', 'Magnet Brains'],
    },
  ],
  'Class 11 (Science)': [
    {
      subject: 'Physics',
      icon: '⚡',
      advice:
        'Class 11 Physics is a massive jump. Master Vectors and Calculus first. Practice derivations by writing them 3 times without looking.',
      channels: ['Physics Wallah', 'Radhika Classes'],
    },
    {
      subject: 'Mathematics',
      icon: '📊',
      advice:
        'Functions and Calculus base starts here. Visualize graphs. Solve RD Sharma for weak topics.',
      channels: ['Neha Agrawal Mathematically Inclined', 'Mohit Tyagi'],
    },
    {
      subject: 'Chemistry',
      icon: '🧪',
      advice:
        'Organic chemistry starts now. Do not skip GOC (General Organic Chemistry) or you will struggle in Class 12.',
      channels: ['Bharat Panchal', 'Monica Bedi'],
    },
  ],
  'Class 12 (Science)': [
    {
      subject: 'Physics',
      icon: '🧲',
      advice:
        'Electrostatics & Optics carry heavy weightage. Do 5 years of PYQs (Previous Year Questions) religiously.',
      channels: ['Arvind Academy', 'Sachin Sir Physics'],
    },
    {
      subject: 'Biology',
      icon: '🧬',
      advice:
        'NCERT is your Bible for NEET/Boards. Highlight key terms and memorize the exact NCERT diagrams.',
      channels: ['Garima Goel', 'Seep Pahuja'],
    },
    {
      subject: 'Computer Science',
      icon: '💻',
      advice:
        'Python & SQL are high scoring. Just understand the syntax and practice writing code on paper for boards.',
      channels: ['Swati Chawla', 'CodeItUp'],
    },
  ],
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedGrade, setSelectedGrade] = useState('Class 10');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-200">
      {/* 🚀 PREMIUM NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentPage('home')}
        >
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-bold text-lg shadow-lg">
            SH
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            StudyHouse.
          </h1>
        </div>

        <div className="hidden md:flex gap-8 font-bold text-sm text-slate-500 uppercase tracking-wider">
          <button
            onClick={() => setCurrentPage('home')}
            className={`hover:text-indigo-600 transition ${
              currentPage === 'home' ? 'text-indigo-600' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`hover:text-indigo-600 transition ${
              currentPage === 'dashboard' ? 'text-indigo-600' : ''
            }`}
          >
            Class 10-12 Hub
          </button>
          <button
            onClick={() => setCurrentPage('career')}
            className={`hover:text-indigo-600 transition ${
              currentPage === 'career' ? 'text-indigo-600' : ''
            }`}
          >
            Career Paths
          </button>
        </div>

        <button
          onClick={() => setCurrentPage('career')}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-600 transition-all shadow-lg"
        >
          Start Exploring ➔
        </button>
      </nav>

      <div className="pb-20">
        {/* ================= HOME PAGE ================= */}
        {currentPage === 'home' && (
          <div className="animate-fade-in-up">
            <div className="m-4 md:m-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 rounded-[2.5rem] p-10 md:p-20 text-center shadow-2xl relative overflow-hidden">
              <span className="inline-block py-1 px-3 rounded-full bg-white/10 text-indigo-200 text-sm font-bold tracking-widest uppercase mb-6 border border-white/20">
                100% Free For All Students
              </span>
              <h2 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight relative z-10">
                Stop Guessing. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                  Start Learning.
                </span>
              </h2>
              <p className="text-lg md:text-xl text-indigo-100/80 max-w-2xl mx-auto mb-10 relative z-10 font-medium">
                The ultimate roadmap platform. Discover 50+ global career paths,
                crush your weak subjects in Class 10-12, and find the exact
                YouTube channels you need. Zero distractions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <button
                  onClick={() => setCurrentPage('career')}
                  className="bg-white text-indigo-950 px-8 py-4 rounded-full text-lg font-black hover:bg-indigo-50 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
                >
                  Explore Careers
                </button>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full text-lg font-bold hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Class 10-12 Hub
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= DASHBOARD: CLASS 10-12 HUB ================= */}
        {currentPage === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-6 mt-12">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-slate-900 mb-4">
                Class 10-12 Study Hub 📚
              </h2>
              <p className="text-lg text-slate-500 font-medium">
                Select your grade below. Get exactly what you need to score 95%+
                without wasting time.
              </p>
            </div>

            {/* Grade Selector Tabs */}
            <div className="flex justify-center gap-4 mb-12 flex-wrap">
              {Object.keys(gradeDatabase).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-8 py-3 rounded-full text-lg font-bold transition-all ${
                    selectedGrade === grade
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>

            {/* Subject Cards for Selected Grade */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {gradeDatabase[selectedGrade].map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300"
                >
                  {/* Subject Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                      {item.icon}
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">
                      {item.subject}
                    </h3>
                  </div>

                  {/* Weak Subject Strategy */}
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🧠 How to master it
                    </h4>
                    <p className="text-slate-600 font-medium text-sm leading-relaxed bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                      {item.advice}
                    </p>
                  </div>

                  {/* Best YouTube Channels */}
                  <div className="mb-8">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      ▶️ Watch These Tutors
                    </h4>
                    <ul className="space-y-2">
                      {item.channels.map((channel, i) => (
                        <li
                          key={i}
                          className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-700 flex items-center gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          {channel}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Get Notes Button (UI Only) */}
                  <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors">
                    Access Premium Notes ➔
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= CAREER PATHS PAGE (Kept same as previous) ================= */}
        {currentPage === 'career' && (
          <div className="max-w-7xl mx-auto px-6 mt-12">
            <h2 className="text-4xl font-black text-slate-900 mb-2">
              World Career Directory 🌍
            </h2>
            <p className="text-lg text-slate-500 mb-8 font-medium">
              Discover your path. See required subjects and top video resources.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {careerDatabase.map((career) => (
                <div
                  key={career.id}
                  className={`bg-white p-8 rounded-3xl shadow-lg border-t-4 ${career.color} hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}
                >
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-6">
                    <span className="text-3xl">{career.icon}</span>{' '}
                    {career.title}
                  </h3>
                  <div className="mb-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      📚 Key Subjects
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {career.subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded-md"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      ▶️ Best Video Channels
                    </p>
                    <ul className="space-y-1">
                      {career.youtube.map((channel, index) => (
                        <li
                          key={index}
                          className="text-indigo-600 font-bold text-sm flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>{' '}
                          {channel}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      🗺️ The Roadmap
                    </p>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {career.roadmap}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
