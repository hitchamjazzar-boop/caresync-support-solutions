// Sound effects for celebrations
const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

export const playCelebrationSound = () => {
  try {
    const ctx = createAudioContext();
    const duration = 0.5;
    const now = ctx.currentTime;

    // Create oscillator for a cheerful ascending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.linearRampToValueAtTime(1046.50, now + 0.3); // C6
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (error) {
    console.error('Error playing celebration sound:', error);
  }
};

export const playBirthdaySound = () => {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;
    
    // Play "Happy Birthday" melody fragment
    const notes = [
      { freq: 261.63, time: 0 },    // C4
      { freq: 261.63, time: 0.15 },  // C4
      { freq: 293.66, time: 0.3 },   // D4
      { freq: 261.63, time: 0.5 },   // C4
      { freq: 349.23, time: 0.7 },   // F4
      { freq: 329.63, time: 0.9 },   // E4
    ];
    
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);
      
      gain.gain.setValueAtTime(0.2, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.15);
      
      osc.start(now + note.time);
      osc.stop(now + note.time + 0.15);
    });
  } catch (error) {
    console.error('Error playing birthday sound:', error);
  }
};
