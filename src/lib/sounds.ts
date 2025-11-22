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

export const playNotificationSound = () => {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;
    
    // Simple two-tone notification sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1000, now + 0.1);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export const playAnnouncementSound = () => {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;
    
    // Uplifting announcement sound
    const notes = [
      { freq: 523.25, time: 0 },     // C5
      { freq: 659.25, time: 0.08 },  // E5
      { freq: 783.99, time: 0.16 },  // G5
    ];
    
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);
      
      gain.gain.setValueAtTime(0.15, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.15);
      
      osc.start(now + note.time);
      osc.stop(now + note.time + 0.15);
    });
  } catch (error) {
    console.error('Error playing announcement sound:', error);
  }
};

export const playMemoSound = () => {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;
    
    // Alert-style memo sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.05);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (error) {
    console.error('Error playing memo sound:', error);
  }
};

export const playAchievementSound = () => {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;
    
    // Victory fanfare for achievements
    const notes = [
      { freq: 659.25, time: 0 },     // E5
      { freq: 783.99, time: 0.1 },   // G5
      { freq: 1046.50, time: 0.2 },  // C6
      { freq: 1318.51, time: 0.3 },  // E6
    ];
    
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.time);
      
      gain.gain.setValueAtTime(0.2, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.15);
      
      osc.start(now + note.time);
      osc.stop(now + note.time + 0.15);
    });
  } catch (error) {
    console.error('Error playing achievement sound:', error);
  }
};
