import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Smile, 
  Send, 
  Sparkles, 
  User,
  Bot,
  RefreshCw,
  Mic,
  MicOff,
  Camera,
  Volume2,
  VolumeX,
  X,
  Users
} from 'lucide-react';
import { Message, Mood, MOODS, Persona, PERSONAS, AVAILABLE_VOICES } from './types';
import { getRiyaResponse, getRiyaVoice, analyzeMoodFromImage, transcribeAudio, analyzeOutfit } from './services/geminiService';

export default function App() {
  const [persona, setPersona] = useState<Persona>('Rohit');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Namaste pyaari saheli! Main hoon Rohit Assistant. Aaj aapka din kaisa raha? Mujhse apni har baat saajha karein, main hamesha aapke saath hoon.',
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState<Mood>('Happy');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'Mood' | 'Outfit'>('Mood');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(PERSONAS['Rohit'].defaultVoice);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const playVoice = async (text: string) => {
    if (!isVoiceEnabled) return;
    const base64Audio = await getRiyaVoice(text, selectedVoice);
    if (base64Audio) {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.play();
    }
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getRiyaResponse([...messages, userMessage], mood, persona);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);
      playVoice(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'model',
        text: persona === 'Rohit' ? 'Namaste! Chaliye naye sire se baat karte hain.' : 'Namaste saheli! Chaliye fir se baatein karte hain.',
        timestamp: Date.now(),
      }
    ]);
  };

  const switchPersona = (newPersona: Persona) => {
    setPersona(newPersona);
    setSelectedVoice(PERSONAS[newPersona].defaultVoice);
    setShowPersonaMenu(false);
    const welcomeMsg = newPersona === 'Rohit' 
      ? 'Namaste pyaari saheli! Main hoon Rohit Assistant. Aaj aapka din kaisa raha?' 
      : 'Namaste pyaari saheli! Main hoon Riya. Aaj aapka din kaisa raha? Mujhse apni har baat saajha karein.';
    
    const botMessage: Message = {
      id: Date.now().toString(),
      role: 'model',
      text: welcomeMsg,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, botMessage]);
    playVoice(welcomeMsg);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsRecording(false);
        
        // Convert to base64 and transcribe
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsLoading(true);
          const text = await transcribeAudio(base64);
          setIsLoading(false);
          if (text) {
            handleSend(text);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  const openCamera = async (mode: 'Mood' | 'Outfit' = 'Mood') => {
    setCameraMode(mode);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setShowCamera(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    
    setIsLoading(true);
    setShowCamera(false);
    
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());

    if (cameraMode === 'Mood') {
      const detectedMood = await analyzeMoodFromImage(base64);
      setMood(detectedMood);
      const botMessage: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: `Maine aapka chehra dekha saheli, aap thodi ${MOODS[detectedMood].label} lag rahi hain. Kya hua? Mujhse baat karein.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);
      playVoice(botMessage.text);
    } else {
      const compliment = await analyzeOutfit(base64);
      const botMessage: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: compliment,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);
      playVoice(botMessage.text);
    }
    
    setIsLoading(false);
  };

  const quickActions = [
    { label: 'Mujhe hasao', icon: '😂', prompt: 'Mujhe ek bahut hi mazedaar chutkula sunao ya kuch aisa kaho jisse main hansne lagoon.' },
    { label: 'Gussa shaant karo', icon: '🧘', prompt: 'Main thodi gusse mein hoon, kripya mujhe shaant karne ke liye kuch pyaari baatein kaho.' },
    { label: 'Kahani sunao', icon: '📖', prompt: 'Mujhe ek pyaari si choti si kahani sunao.' },
    { label: 'Mood fresh karo', icon: '✨', prompt: 'Mera mood thoda off hai, kripya mera mood fresh karne ke liye kuch accha kaho.' },
  ];

  return (
    <div className={`min-h-screen ${persona === 'Rohit' ? 'bg-[#F8FAFC]' : 'bg-[#FFF5F7]'} text-[#334155] font-sans selection:bg-blue-100 transition-colors duration-500`}>
      {/* Header */}
      <header className={`fixed top-0 w-full bg-white/90 backdrop-blur-lg border-b ${persona === 'Rohit' ? 'border-blue-100' : 'border-pink-100'} z-50`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-10 h-10 rounded-full bg-gradient-to-tr ${persona === 'Rohit' ? 'from-blue-500 to-indigo-500 shadow-blue-200' : 'from-pink-400 to-rose-400 shadow-pink-200'} flex items-center justify-center text-white shadow-lg`}
            >
              {persona === 'Rohit' ? <Bot size={20} /> : <Sparkles size={20} />}
            </motion.div>
            <div>
              <h1 className={`font-serif text-xl font-bold ${persona === 'Rohit' ? 'text-blue-600' : 'text-pink-600'}`}>{PERSONAS[persona].name}</h1>
              <p className={`text-[10px] uppercase tracking-widest ${persona === 'Rohit' ? 'text-blue-400' : 'text-pink-400'} font-bold`}>{PERSONAS[persona].description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className={`p-2 rounded-full transition-colors ${persona === 'Rohit' ? 'text-blue-500 bg-blue-50' : 'text-pink-500 bg-pink-50'}`}
              >
                <Users size={20} />
              </button>
              <AnimatePresence>
                {showPersonaMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                  >
                    <div className="p-2 border-b border-gray-50">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold px-3 py-1">Personas</p>
                      {Object.entries(PERSONAS).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => switchPersona(key as Persona)}
                          className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-colors ${persona === key ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                        >
                          {key === 'Rohit' ? <Bot size={16} /> : <Sparkles size={16} />}
                          {config.name}
                        </button>
                      ))}
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold px-3 py-1">Voice Settings</p>
                      <div className="space-y-1">
                        {AVAILABLE_VOICES.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVoice(v.id)}
                            className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors ${selectedVoice === v.id ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
                          >
                            <span>{v.name}</span>
                            {selectedVoice === v.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-full transition-colors ${isVoiceEnabled ? (persona === 'Rohit' ? 'text-blue-500 bg-blue-50' : 'text-pink-500 bg-pink-50') : 'text-gray-400 bg-gray-100'}`}
            >
              {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button 
              onClick={clearChat}
              className={`p-2 rounded-full transition-colors ${persona === 'Rohit' ? 'text-blue-500 bg-blue-50 hover:bg-blue-100' : 'text-pink-500 bg-pink-50 hover:bg-pink-100'}`}
              title="Clear Chat"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={() => openCamera('Mood')}
              className={`p-2 rounded-full transition-colors ${persona === 'Rohit' ? 'text-blue-500 bg-blue-50 hover:bg-blue-100' : 'text-pink-500 bg-pink-50 hover:bg-pink-100'}`}
            >
              <Camera size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-48">
        {/* Mood Indicator */}
        <div className="flex justify-center gap-2 mb-4 overflow-x-auto py-2 no-scrollbar">
          {Object.entries(MOODS).map(([m, config]) => (
            <button
              key={m}
              onClick={() => setMood(m as Mood)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl flex items-center gap-2 transition-all ${
                mood === m 
                  ? `bg-white shadow-md ring-2 ${persona === 'Rohit' ? 'ring-blue-200' : 'ring-pink-200'} scale-105` 
                  : 'bg-white/50 opacity-60 hover:opacity-100'
              }`}
            >
              <span className="text-xl">{config.emoji}</span>
              <span className="text-xs font-bold">{config.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-8 overflow-x-auto py-2 no-scrollbar">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(action.prompt)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl bg-white border ${persona === 'Rohit' ? 'border-blue-50 hover:bg-blue-50' : 'border-pink-50 hover:bg-pink-50'} text-xs font-medium flex items-center gap-2 transition-colors shadow-sm`}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === 'user' ? 'bg-white text-blue-400' : (persona === 'Rohit' ? 'bg-blue-400 text-white' : 'bg-pink-400 text-white')
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : (persona === 'Rohit' ? <Bot size={16} /> : <Sparkles size={16} />)}
                  </div>
                  <div className={`p-4 rounded-3xl shadow-sm ${
                    msg.role === 'user' 
                      ? `bg-gradient-to-br ${persona === 'Rohit' ? 'from-blue-500 to-indigo-500' : 'from-pink-500 to-rose-500'} text-white rounded-tr-none` 
                      : `bg-white border ${persona === 'Rohit' ? 'border-blue-50' : 'border-pink-50'} rounded-tl-none text-gray-700`
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className={`bg-white border ${persona === 'Rohit' ? 'border-blue-50' : 'border-pink-50'} p-4 rounded-3xl rounded-tl-none flex gap-2 items-center shadow-sm`}>
                <div className="flex gap-1">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className={`w-1.5 h-1.5 ${persona === 'Rohit' ? 'bg-blue-300' : 'bg-pink-300'} rounded-full`} />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className={`w-1.5 h-1.5 ${persona === 'Rohit' ? 'bg-blue-300' : 'bg-pink-300'} rounded-full`} />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className={`w-1.5 h-1.5 ${persona === 'Rohit' ? 'bg-blue-300' : 'bg-pink-300'} rounded-full`} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <button 
              onClick={() => setShowCamera(false)}
              className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full"
            >
              <X size={24} />
            </button>
            <div className="relative w-full max-w-md aspect-video bg-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Beauty Filter Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-tr ${persona === 'Rohit' ? 'from-blue-400/10 to-transparent' : 'from-pink-400/10 to-transparent'} mix-blend-overlay pointer-events-none`} />
              <div className={`absolute inset-0 border-2 ${persona === 'Rohit' ? 'border-blue-400/30' : 'border-pink-400/30'} pointer-events-none`} />
            </div>
            
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setCameraMode('Mood')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${cameraMode === 'Mood' ? (persona === 'Rohit' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white') : 'bg-white/10 text-white/60'}`}
              >
                Mood Detection
              </button>
              <button 
                onClick={() => setCameraMode('Outfit')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${cameraMode === 'Outfit' ? (persona === 'Rohit' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white') : 'bg-white/10 text-white/60'}`}
              >
                Outfit Check
              </button>
            </div>

            <p className="text-white/70 text-sm mt-6 mb-8 text-center">
              {cameraMode === 'Mood' 
                ? `${persona === 'Rohit' ? 'Rohit' : 'Riya'} aapka mood pehchanne ki koshish karega...` 
                : `${persona === 'Rohit' ? 'Rohit' : 'Riya'} aapka outfit dekhkar compliment dega!`}
            </p>
            
            <button 
              onClick={captureImage}
              className={`w-20 h-20 rounded-full ${persona === 'Rohit' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-pink-500 shadow-pink-500/20'} text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform`}
            >
              <Camera size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Input */}
      <footer className={`fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t ${persona === 'Rohit' ? 'border-blue-100' : 'border-pink-100'} p-4 pb-8`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : (persona === 'Rohit' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500')
              }`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex-1 flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`${persona === 'Rohit' ? 'Rohit' : 'Riya'} se baat karein...`}
                className={`flex-1 bg-gray-50 border-none rounded-2xl px-6 py-3 text-sm focus:ring-2 ${persona === 'Rohit' ? 'focus:ring-blue-200' : 'focus:ring-pink-200'} outline-none transition-all`}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`w-12 h-12 rounded-2xl ${persona === 'Rohit' ? 'bg-blue-500 shadow-blue-200 hover:bg-blue-600' : 'bg-pink-500 shadow-pink-200 hover:bg-pink-600'} text-white flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all`}
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
}
