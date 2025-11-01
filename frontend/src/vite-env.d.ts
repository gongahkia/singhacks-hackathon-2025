/// <reference types="vite/client" />

// Explicitly declare ImportMeta augmentation so TS recognizes import.meta.env
interface ImportMetaEnv {
	readonly VITE_API_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
