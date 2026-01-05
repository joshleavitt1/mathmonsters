export const STORAGE_KEYS = {
    profile: "mm_profile"
  };
  
  export function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.profile);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
  
      // minimal shape validation
      const required = ["playerName","playerGrade","xp","level","difficulty","heroType","heroName","heroSprite","attackSprite","attack","health"];
      for (const k of required) {
        if (!(k in obj)) return null;
      }
      return obj;
    } catch {
      return null;
    }
  }
  
  export function saveProfile(profile) {
    // minimal guard
    if (!profile || typeof profile !== "object") throw new Error("Invalid profile");
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  }
  
  export function clearProfile() {
    localStorage.removeItem(STORAGE_KEYS.profile);
  }
  