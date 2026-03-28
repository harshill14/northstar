export interface DemoScenario {
  id: string;
  emoji: string;
  title: string;
  agentResponse: string;
  objects: string[];
  priority: 'normal' | 'safety' | 'escalation';
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'keys',
    emoji: '🔑',
    title: 'Lost Keys',
    agentResponse:
      "I can see your keys! They're on the kitchen counter, right next to the blue coffee mug. They've been there for about ten minutes.",
    objects: ['keys', 'counter', 'kitchen'],
    priority: 'normal',
  },
  {
    id: 'glasses',
    emoji: '👓',
    title: 'Lost Glasses',
    agentResponse:
      "Your glasses are on the side table next to your favorite chair in the living room. I spotted them there just a few minutes ago.",
    objects: ['glasses', 'side table', 'living room'],
    priority: 'normal',
  },
  {
    id: 'medication',
    emoji: '💊',
    title: 'Medication Check',
    agentResponse:
      "I can see your pill organizer, but I want to keep you safe — please wait for your caregiver to confirm your afternoon medication. I'm letting them know right now.",
    objects: ['pills', 'pill organizer', 'medication'],
    priority: 'normal',
  },
  {
    id: 'stove',
    emoji: '🔥',
    title: 'Stove Left On',
    agentResponse:
      "I noticed the stove burner appears to be on. Please step away from the stove — I'm alerting your caregiver right now. You're safe.",
    objects: ['stove', 'burner', 'kitchen'],
    priority: 'safety',
  },
  {
    id: 'door',
    emoji: '🚪',
    title: 'Door Left Open',
    agentResponse:
      "The front door has been open for about ten minutes. Would you like to close it? I can guide you there — it's right at the front of the house.",
    objects: ['door', 'entrance', 'front door'],
    priority: 'safety',
  },
  {
    id: 'visitor',
    emoji: '👤',
    title: 'Who Is This?',
    agentResponse:
      "That's your daughter Sarah! She visits you every Tuesday and she loves spending time with you. She looks very happy to be here today.",
    objects: ['person', 'visitor', 'family'],
    priority: 'normal',
  },
  {
    id: 'calm',
    emoji: '🎵',
    title: 'Calm / Anxiety Mode',
    agentResponse:
      "It sounds like you might be feeling a little worried right now. That's okay. Let's take a slow breath together. Shall I play some of your favourite music?",
    objects: [],
    priority: 'normal',
  },
  {
    id: 'caregiver',
    emoji: '📞',
    title: 'Call Caregiver',
    agentResponse:
      "I'm connecting you with your caregiver right now. Please hold on — someone who cares about you will be with you very shortly.",
    objects: [],
    priority: 'escalation',
  },
];
