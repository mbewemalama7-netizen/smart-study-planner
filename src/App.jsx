import { useState } from "react";

const COLORS = [
  "bg-blue-100 border-blue-400 text-blue-800",
  "bg-green-100 border-green-400 text-green-800",
  "bg-purple-100 border-purple-400 text-purple-800",
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-pink-100 border-pink-400 text-pink-800",
  "bg-orange-100 border-orange-400 text-orange-800",
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
    for (let i = 0; i < slots; i++) {
      sessions.push(sorted[i % sorted.length]);
    }
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

  const colorFor = (name) => {
    const idx = [...new Set(subjects.map(s => s.name))].indexOf(name);
    return COLORS[idx % COLORS.length];
  };

  const fmt = d => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const isToday = d => d.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📚 Smart Study Planner</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your subjects & exam dates — get a personalized study schedule</p>
        </div>
        {step === "input" && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Your Subjects</h2>
            {subjects.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Subject name (e.g. MAT 1100)"
                  value={s.name}
                  onChange={e => updateSubject(i, "name", e.target.value)}
                />
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={s.examDate}
                  onChange={e => updateSubject(i, "examDate", e.target.value)}
                />
                {subjects.length > 1 && (
                  <button onClick={() => removeSubject(i)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
                )}
              </div>
            ))}
            <button onClick={addSubject} className="text-blue-500 text-sm hover:underline">+ Add subject</button>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Session length</label>
              <div className="flex gap-2">
                {SESSION_LENGTHS.map(l => (
                  <button
                    key={l}
                    onClick={() => setSessionLen(l)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${sessionLen === l ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
                  >
                    {l} min
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
            >
              {loading ? "Generating..." : "Generate My Schedule →"}
            </button>
          </div>
        )}
        {step === "result" && schedule && (
          <div className="space-y-4">
            {aiTips && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-blue-600 mb-1">✨ AI Study Tips</p>
                <p className="text-sm text-blue-800 whitespace-pre-line">{aiTips}</p>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow p-4">
              <p className="text-xs text-gray-500 font-semibold mb-2">SUBJECTS</p>
              <div className="flex flex-wrap gap-2">
                {subjects.filter(s => s.name).map((s, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-full border font-medium ${colorFor(s.name)}`}>
                    {s.name} — {getDaysUntil(s.examDate)} days left
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {schedule.map((day, i) => (
                <div key={i} className={`bg-white rounded-2xl shadow p-4 ${isToday(day.date) ? "ring-2 ring-blue-400" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-700 text-sm">
                      {isToday(day.date) ? "📍 Today — " : ""}{fmt(day.date)}
                    </p>
                    <p className="text-xs text-gray-400">{day.sessions.length} session{day.sessions.length > 1 ? "s" : ""} · {day.sessions.length * sessionLen} min</p>
                  </div>
                  <div className="space-y-1.5">
                    {day.sessions.map((s, j) => (
                      <div key={j} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-sm font-medium ${colorFor(s.name)}`}>
                        <span>{s.name}</span>
                        <span className="text-xs opacity-70">{sessionLen} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setStep("input"); setSchedule(null); setAiTips(""); }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition"
            >
              ← Edit Subjects
            </button>
          </div>
        )}
      </div>
    </div>
  );
              }
