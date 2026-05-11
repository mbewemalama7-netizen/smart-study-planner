import { useState } from "react";

const COLORS = [
  { bg: "from-violet-500 to-purple-600", light: "bg-violet-50 text-violet-700 border-violet-200" },
  { bg: "from-blue-500 to-cyan-600", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { bg: "from-orange-500 to-amber-600", light: "bg-orange-50 text-orange-700 border-orange-200" },
  { bg: "from-pink-500 to-rose-600", light: "bg-pink-50 text-pink-700 border-pink-200" },
  { bg: "from-indigo-500 to-blue-600", light: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

const SESSION_LENGTHS = [30, 45, 60, 90];

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(dateStr);
  exam.setHours(0, 0, 0, 0);
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
}

function generateSchedule(subjects, sessionLen) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const valid = subjects
    .filter(s => s.name && s.examDate && getDaysUntil(s.examDate) > 0)
    .map(s => ({ ...s, daysLeft: getDaysUntil(s.examDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (!valid.length) return [];
  const maxDays = valid[valid.length - 1].daysLeft;
  const schedule = [];
  for (let d = 0; d < maxDays; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const active = valid.filter(s => getDaysUntil(s.examDate) > d);
    if (!active.length) continue;
    const slots = Math.min(active.length, 3);
    const sorted = [...active].sort((a, b) => a.daysLeft - b.daysLeft);
    const sessions = [];
    for (let i = 0; i < slots; i++) sessions.push(sorted[i % sorted.length]);
    schedule.push({ date, sessions: sessions.slice(0, slots) });
  }
  return schedule;
}

export default function App() {
  const [subjects, setSubjects] = useState([{ name: "", examDate: "" }]);
  const [sessionLen, setSessionLen] = useState(60);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiTips, setAiTips] = useState("");
  const [step, setStep] = useState("input");

  const addSubject = () => setSubjects([...subjects, { name: "", examDate: "" }]);
  const removeSubject = i => setSubjects(subjects.filter((_, idx) => idx !== i));
  const updateSubject = (i, field, val) => {
    const updated = [...subjects];
    updated[i][field] = val;
    setSubjects(updated);
  };

  const handleGenerate = async () => {
    const valid = subjects.filter(s => s.name && s.examDate);
    if (!valid.length) return alert("Add at least one subject with an exam date.");
    setLoading(true);
    const gen = generateSchedule(valid, sessionLen);
    setSchedule(gen);
    try {
      const prompt = `I have these exams coming up: ${valid.map(s => `${s.name} in ${getDaysUntil(s.examDate)} days`).join(", ")}. My study sessions are ${sessionLen} minutes each. Give me 3 short, practical study tips tailored to this schedule. Be concise and encouraging.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      setAiTips(data.content?.[0]?.text || "");
    } catch {
      setAiTips("Focus on weak areas first, take short breaks, and review notes before bed.");
    }
    setLoading(false);
    setStep("result");
  };

  const colorFor = i => COLORS[i % COLORS.length];
  const subjectIndex = name => [...new Set(subjects.map(s => s.name))].indexOf(name);
  const fmt = d => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const isToday = d => d.toDateString() === new Date().toDateString();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white bg-opacity-10 backdrop-blur-sm border-b border-white border-opacity-10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg">📚</div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Smart Study Planner</h1>
            <p className="text-purple-300 text-xs mt-0.5">AI-powered exam preparation</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {step === "input" && (
          <div className="space-y-4">
            {/* Hero */}
            <div className="text-center py-4">
              <h2 className="text-white text-2xl font-bold">Plan Your Success 🎯</h2>
              <p className="text-purple-300 text-sm mt-1">Add your subjects and get a smart study schedule</p>
            </div>

            {/* Subjects Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl border border-white border-opacity-10 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-violet-500 flex items-center justify-center text-xs">1</span>
                Your Subjects
              </h3>
              <div className="space-y-3">
                {subjects.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${colorFor(i).bg} flex-shrink-0`} />
                    <input
                      className="flex-1 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-xl px-3 py-2 text-sm text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:bg-opacity-20"
                      placeholder="Subject (e.g. MAT 1100)"
                      value={s.name}
                      onChange={e => updateSubject(i, "name", e.target.value)}
                    />
                    <input
                      type="date"
                      className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                      value={s.examDate}
                      onChange={e => updateSubject(i, "examDate", e.target.value)}
                    />
                    {subjects.length > 1 && (
                      <button onClick={() => removeSubject(i)} className="text-red-400 hover:text-red-300 text-xl font-bold flex-shrink-0">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addSubject} className="mt-3 text-purple-300 text-sm hover:text-white transition flex items-center gap-1">
                <span className="text-lg">+</span> Add another subject
              </button>
            </div>

            {/* Session Length Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl border border-white border-opacity-10 p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-xs">2</span>
                Session Length ⏱️
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {SESSION_LENGTHS.map(l => (
                  <button
                    key={l}
                    onClick={() => setSessionLen(l)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                      sessionLen === l
                        ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"
                        : "bg-white bg-opacity-10 text-purple-300 border border-white border-opacity-10 hover:bg-opacity-20"
                    }`}
                  >
                    {l}m
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-xl shadow-purple-900 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating your plan...
                </>
              ) : (
                <>✨ Generate My Schedule</>
              )}
            </button>
          </div>
        )}

        {step === "result" && schedule && (
          <div className="space-y-4">
            {/* AI Tips */}
            {aiTips && (
              <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">✨</span>
                  <p className="text-white font-bold">AI Study Tips</p>
                </div>
                <p className="text-purple-100 text-sm leading-relaxed whitespace-pre-line">{aiTips}</p>
              </div>
            )}

            {/* Subject Pills */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl border border-white border-opacity-10 p-4">
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">Your Exams</p>
              <div className="flex flex-wrap gap-2">
                {subjects.filter(s => s.name && s.examDate).map((s, i) => (
                  <span key={i} className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${colorFor(subjectIndex(s.name)).light}`}>
                    {s.name} · {getDaysUntil(s.examDate)}d left
                  </span>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-3">
              {schedule.map((day, i) => (
                <div key={i} className={`rounded-2xl border p-4 ${
                  isToday(day.date)
                    ? "bg-white bg-opacity-15 border-purple-400 shadow-lg shadow-purple-900"
                    : "bg-white bg-opacity-5 border-white border-opacity-10"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isToday(day.date) && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                      <p className="text-white font-semibold text-sm">
                        {isToday(day.date) ? "Today" : fmt(day.date)}
                      </p>
                    </div>
                    <p className="text-purple-300 text-xs">{day.sessions.length * sessionLen} min total</p>
                  </div>
                  <div className="space-y-2">
                    {day.sessions.map((s, j) => {
                      const c = colorFor(subjectIndex(s.name));
                      return (
                        <div key={j} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-semibold ${c.light}`}>
                          <span>{s.name}</span>
                          <span className="text-xs opacity-70 font-normal">{sessionLen} min</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setStep("input"); setSchedule(null); setAiTips(""); }}
              className="w-full py-3 rounded-2xl font-semibold text-purple-300 border border-white border-opacity-10 bg-white bg-opacity-5 hover:bg-opacity-10 transition"
            >
              ← Edit Subjects
            </button>
          </div>
        )}
      </div>
    </div>
  );
              }
