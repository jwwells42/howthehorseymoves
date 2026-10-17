// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** The opening trainer's mode; none = its lobby (see OpeningTrainer) */
			openingPhase?: 'flow' | 'learn' | 'review' | 'explore';
		}
		// interface Platform {}
	}
}

export {};
