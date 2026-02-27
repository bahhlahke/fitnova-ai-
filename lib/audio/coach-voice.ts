// Utilizes the browser's native Web Speech API

export class CoachVoiceEngine {
    private active: boolean = false;
    private voice: SpeechSynthesisVoice | null = null;
    private pitch: number = 0.8; // slightly deeper
    private rate: number = 1.1;  // slightly faster, intense pacing
    private onSpeakingChange?: (isSpeaking: boolean) => void;

    constructor() {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            // Load voices immediately if available, or listen for them
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                // Try to find a commanding English voice (Google UK Male/US Male or any strong variant)
                const preferred = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Daniel") || v.lang === "en-US");
                if (preferred) this.voice = preferred;
            };

            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }

    public setOnSpeakingChange(cb: (isSpeaking: boolean) => void) {
        this.onSpeakingChange = cb;
    }

    public toggle(active: boolean) {
        this.active = active;
        if (!active && typeof window !== "undefined") {
            window.speechSynthesis.cancel();
        }
    }

    public isActive() {
        return this.active;
    }

    public speak(text: string) {
        if (!this.active || typeof window === "undefined" || !("speechSynthesis" in window)) return;

        // Cancel any current utterance
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) {
            utterance.voice = this.voice;
        }
        utterance.pitch = this.pitch;
        utterance.rate = this.rate;

        utterance.onstart = () => {
            this.onSpeakingChange?.(true);
        };

        utterance.onend = () => {
            this.onSpeakingChange?.(false);
        };

        utterance.onerror = () => {
            this.onSpeakingChange?.(false);
        };

        window.speechSynthesis.speak(utterance);
    }
}

// Export a singleton instance
export const coachVoice = new CoachVoiceEngine();
