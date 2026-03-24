export type Mood = 'Happy' | 'Sad' | 'Angry' | 'Stressed' | 'Bored' | 'Anxious';
export type Persona = 'Rohit' | 'Riya';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface MoodConfig {
  emoji: string;
  color: string;
  label: string;
}

export interface PersonaConfig {
  name: string;
  defaultVoice: string;
  description: string;
  icon: string;
}

export const PERSONAS: Record<Persona, PersonaConfig> = {
  Rohit: {
    name: 'Rohit Assistant',
    defaultVoice: 'Zephyr',
    description: 'Samajhdaar aur shaant sahayak',
    icon: 'Bot'
  },
  Riya: {
    name: 'Riya Bestie',
    defaultVoice: 'Kore',
    description: 'Pyaari aur chanchal saheli',
    icon: 'Sparkles'
  }
};

export const AVAILABLE_VOICES = [
  { id: 'Zephyr', name: 'Male (Rohit)', gender: 'male' },
  { id: 'Kore', name: 'Female (Riya)', gender: 'female' },
  { id: 'Puck', name: 'Cute Female', gender: 'female' },
  { id: 'Fenrir', name: 'Deep Male', gender: 'male' },
];

export const MOODS: Record<Mood, MoodConfig> = {
  Happy: { emoji: '😊', color: 'bg-yellow-100 text-yellow-800', label: 'Happy' },
  Sad: { emoji: '😢', color: 'bg-blue-100 text-blue-800', label: 'Sad' },
  Angry: { emoji: '😤', color: 'bg-red-100 text-red-800', label: 'Angry' },
  Stressed: { emoji: '😫', color: 'bg-purple-100 text-purple-800', label: 'Stressed' },
  Bored: { emoji: '😐', color: 'bg-gray-100 text-gray-800', label: 'Bored' },
  Anxious: { emoji: '😰', color: 'bg-orange-100 text-orange-800', label: 'Anxious' },
};
