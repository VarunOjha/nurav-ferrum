/**
 * Theme storage key and the inline pre-paint script (ip-routes-and-views §4). Kept out of the
 * "use client" module so the server layout can inline the script text.
 */
export const THEME_KEY = "ferrum-plan-theme";

/** Runs in <head> before first paint; never throws (storage may be unavailable). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
