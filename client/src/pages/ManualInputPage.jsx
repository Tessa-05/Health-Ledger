import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { symptomChat } from '../services/api';

export default function ManualInputPage() {
  const { user } = useAuth();
  const uid = user?.id || user?._id;
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Hello, I\'m your Health Ledger clinical assistant. Describe how you\'re feeling, and I\'ll walk you through a targeted assessment.' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [session, setSession] = useState({ symptomKeys: [], askedQuestions: [], answers: [], phase: null, pendingQuestions: [] });
  const [vitals, setVitals] = useState({ heartRate: '', spo2: '', temperature: '' });
  const [includeVitals, setIncludeVitals] = useState(false);
  const [finished, setFinished] = useState(false);
  const [listening, setListening] = useState(false);
  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  // Add message helper
  const addMsg = (role, text, extra) => setMessages((m) => [...m, { role, text, ...extra }]);

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // ─── HANDLE USER SUBMIT ───
  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const userText = input.trim();
    setInput('');

    addMsg('user', userText);
    setTyping(true);
    await delay(800 + Math.random() * 700);

    // If we have pending questions, this is an answer
    if (session.pendingQuestions.length > 0) {
      const answeredQ = session.pendingQuestions[0];
      const newAnswers = [...session.answers, { key: answeredQ.key, answer: userText }];
      const remainingQs = session.pendingQuestions.slice(1);

      if (remainingQs.length > 0) {
        // Still have questions to ask
        setSession((s) => ({ ...s, answers: newAnswers, pendingQuestions: remainingQs }));
        addMsg('system', remainingQs[0].q);
        setTyping(false);
        return;
      }

      // All questions answered — get final or more follow-ups
      try {
        const vitData = includeVitals && vitals.heartRate ? {
          heartRate: Number(vitals.heartRate), spo2: Number(vitals.spo2), temperature: Number(vitals.temperature),
        } : null;

        const res = await symptomChat({
          phase: 'followup',
          symptomKeys: session.symptomKeys,
          askedQuestions: session.askedQuestions,
          answers: newAnswers,
          vitals: vitData,
        });

        setSession((s) => ({ ...s, answers: newAnswers }));

        if (res.type === 'followup') {
          setSession((s) => ({
            ...s,
            askedQuestions: res.askedQuestions,
            pendingQuestions: res.questions,
          }));
          addMsg('system', res.message);
          await delay(500);
          addMsg('system', res.questions[0].q);
        } else if (res.type === 'final') {
          displayFinalAssessment(res);
        }
      } catch {
        addMsg('system', 'I encountered an issue processing your response. Could you try again?');
      }
      setTyping(false);
      return;
    }

    // Initial input
    try {
      const vitData = includeVitals && vitals.heartRate ? {
        heartRate: Number(vitals.heartRate), spo2: Number(vitals.spo2), temperature: Number(vitals.temperature),
      } : null;

      const res = await symptomChat({ phase: 'initial', text: userText, vitals: vitData });

      if (res.type === 'clarify') {
        addMsg('system', res.message);
        setTyping(false);
        return;
      }

      if (res.type === 'followup') {
        setSession({
          symptomKeys: res.symptomKeys,
          askedQuestions: res.askedQuestions || [],
          answers: [],
          phase: 'followup',
          pendingQuestions: res.questions || [],
        });

        addMsg('system', res.message);
        if (res.questions?.length > 0) {
          await delay(600);
          addMsg('system', res.questions[0].q);
        }
      }
    } catch {
      addMsg('system', 'I wasn\'t able to process that. Please describe your symptoms again.');
    }
    setTyping(false);
  };

  // ─── DISPLAY FINAL ASSESSMENT ───
  const displayFinalAssessment = (res) => {
    const condText = res.conditions.length > 0
      ? `**Detected conditions:** ${res.conditions.join(', ')}`
      : 'No specific conditions definitively identified.';

    const confText = `**Confidence:** ${res.confidence}${res.vitalCorrelated ? ' (vital-data correlated)' : ''}`;

    addMsg('system', condText, { type: 'assessment' });
    addMsg('system', res.clinicalInsight, { type: 'insight' });
    addMsg('system', confText, { type: 'confidence', severity: res.severity });

    if (res.recommendations?.length > 0) {
      addMsg('system', '**Recommendations:**\n' + res.recommendations.map((r) => `• ${r}`).join('\n'), { type: 'recommendations' });
    }

    setFinished(true);
  };

  // ─── ASK MORE QUESTIONS ───
  const handleAskMore = async () => {
    setFinished(false);
    setTyping(true);
    addMsg('user', 'I\'d like a more detailed analysis.');
    await delay(800);

    try {
      const vitData = includeVitals && vitals.heartRate ? {
        heartRate: Number(vitals.heartRate), spo2: Number(vitals.spo2), temperature: Number(vitals.temperature),
      } : null;

      const res = await symptomChat({
        phase: 'more',
        symptomKeys: session.symptomKeys,
        askedQuestions: session.askedQuestions,
        answers: session.answers,
        vitals: vitData,
      });

      if (res.type === 'followup') {
        setSession((s) => ({
          ...s,
          askedQuestions: res.askedQuestions,
          pendingQuestions: res.questions,
        }));
        addMsg('system', res.message);
        await delay(500);
        addMsg('system', res.questions[0].q);
      } else if (res.type === 'final') {
        displayFinalAssessment(res);
      }
    } catch {
      addMsg('system', 'I couldn\'t generate additional questions at this time.');
      setFinished(true);
    }
    setTyping(false);
  };

  // ─── NEW CONVERSATION ───
  const handleReset = () => {
    setMessages([{ role: 'system', text: 'Starting a new assessment. How are you feeling?' }]);
    setSession({ symptomKeys: [], askedQuestions: [], answers: [], phase: null, pendingQuestions: [] });
    setFinished(false);
  };

  // ─── VOICE INPUT ───
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // ─── RENDER HELPERS ───
  const renderText = (text) => {
    // Simple bold markdown
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part.includes('\n')
          ? part.split('\n').map((line, j) => <span key={`${i}-${j}`}>{line}<br /></span>)
          : <span key={i}>{part}</span>
    );
  };

  const sevColor = (sev) => sev === 'critical' ? '#d32f2f' : sev === 'warning' ? '#f57c00' : '#388e3c';

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div>
            <h2>Clinical Assessment</h2>
            <p>Interactive symptom analysis powered by AI</p>
          </div>
          <div className="chat-header-right">
            <label className="check-row-sm">
              <input type="checkbox" checked={includeVitals} onChange={(e) => setIncludeVitals(e.target.checked)} />
              Include vitals
            </label>
            {finished && (
              <>
                <button className="btn-sm btn-outline" onClick={handleAskMore}>Ask More</button>
                <button className="btn-sm btn-outline" onClick={handleReset}>New</button>
              </>
            )}
          </div>
        </div>

        {/* Vitals mini-panel */}
        {includeVitals && (
          <div className="chat-vitals">
            <input type="number" placeholder="HR" value={vitals.heartRate} onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })} />
            <input type="number" placeholder="SpO2" value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} />
            <input type="number" step="0.1" placeholder="Temp" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} />
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages" ref={chatRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}${msg.type ? ' bubble-' + msg.type : ''}`}
                 style={msg.severity ? { borderLeftColor: sevColor(msg.severity) } : undefined}>
              {renderText(msg.text)}
            </div>
          ))}
          {typing && (
            <div className="chat-bubble system typing-bubble">
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <button className={'voice-btn' + (listening ? ' active' : '')} onClick={toggleVoice} title="Voice input">
            🎤
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={session.pendingQuestions.length > 0 ? 'Type your answer...' : 'Describe how you\'re feeling...'}
            disabled={typing}
          />
          <button className="send-btn" onClick={handleSend} disabled={typing || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
