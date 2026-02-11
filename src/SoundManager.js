export default class SoundManager {
    constructor(scene) {
        this.scene = scene;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.5;
        this.muted = false;

        // Engine sound node
        this.engineOsc = null;
        this.engineGain = null;
    }

    playCoin() {
        if (this.muted) return;
        this.playTone(880, 'sine', 0.1);
        setTimeout(() => this.playTone(1760, 'sine', 0.2), 50);
    }

    playFuel() {
        if (this.muted) return;
        this.playTone(440, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(550, 'square', 0.2, 0.1), 100);
    }

    playCrash() {
        if (this.muted) return;
        // White noise burst
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 sec
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    startEngine() {
        if (this.muted) return;
        if (this.engineOsc) return;

        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 50; // Idle RPM

        this.engineGain.gain.value = 0.1;

        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
    }

    updateEngine(speed) {
        if (!this.engineOsc || this.muted) return;
        // Map speed (0-20ish) to frequency (50-200Hz)
        const targetFreq = 50 + (Math.abs(speed) * 10);
        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }

    stopEngine() {
        if (this.engineOsc) {
            this.engineOsc.stop();
            this.engineOsc.disconnect();
            this.engineOsc = null;
        }
    }

    playTone(freq, type, duration, vol = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopEngine();
            if (this.ctx.state === 'running') this.ctx.suspend();
        } else {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            this.startEngine();
        }
        return this.muted;
    }
}
