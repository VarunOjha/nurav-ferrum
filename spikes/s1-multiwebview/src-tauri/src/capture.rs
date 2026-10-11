//! Window pixel sampling for the blank-render and z-order checks (spike only).
//!
//! Uses `PrintWindow(PW_CLIENTONLY | PW_RENDERFULLCONTENT)` into a memory bitmap, so the check works
//! even if another window covers the spike window. Colours are (r, g, b).

use tauri::Window;
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Gdi::{
    CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetPixel, HGDIOBJ, ReleaseDC,
    SelectObject,
};
use windows::Win32::Storage::Xps::{PRINT_WINDOW_FLAGS, PrintWindow};

/// Background colour of the shell strip (must match `index.html`).
pub const SHELL_COLOUR: (u8, u8, u8) = (0x20, 0x30, 0x40);
/// Background colours of tab 1..3 (must match `public/tab.html`).
pub const TAB_COLOURS: [(u8, u8, u8); 3] = [(0xc0, 0x39, 0x2b), (0x27, 0xae, 0x60), (0x29, 0x80, 0xb9)];

pub struct Sample {
    pub shell: (u8, u8, u8),
    pub tab: (u8, u8, u8),
}

pub fn close(a: (u8, u8, u8), b: (u8, u8, u8)) -> bool {
    let d = |x: u8, y: u8| (x as i16 - y as i16).abs() <= 12;
    d(a.0, b.0) && d(a.1, b.1) && d(a.2, b.2)
}

pub fn hex(c: (u8, u8, u8)) -> String {
    format!("#{:02x}{:02x}{:02x}", c.0, c.1, c.2)
}

/// Samples one pixel in the shell strip (right end, away from the buttons) and one in the middle of
/// the tab area (right half, away from the text box).
pub fn sample_window(window: &Window, shell_h_logical: f64) -> Result<Sample, String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let (w, h) = (size.width as i32, size.height as i32);
    let shell_h = (shell_h_logical * scale) as i32;
    let raw = window.hwnd().map_err(|e| e.to_string())?;
    let hwnd = HWND(raw.0);
    // SAFETY: hwnd is the live top-level window of this process (the call runs while the app is
    // running and the window exists); every GDI object created here is selected out and deleted
    // before return, and the screen DC is released.
    unsafe {
        let screen = GetDC(None);
        let mem = CreateCompatibleDC(Some(screen));
        let bmp = CreateCompatibleBitmap(screen, w, h);
        let old = SelectObject(mem, HGDIOBJ(bmp.0));
        // PW_CLIENTONLY = 1, PW_RENDERFULLCONTENT = 2
        let ok = PrintWindow(hwnd, mem, PRINT_WINDOW_FLAGS(3)).as_bool();
        let px = |x: i32, y: i32| {
            let c = GetPixel(mem, x, y).0;
            ((c & 0xff) as u8, ((c >> 8) & 0xff) as u8, ((c >> 16) & 0xff) as u8)
        };
        let shell = px(w - 24, shell_h / 2);
        let tab = px(w * 3 / 4, shell_h + (h - shell_h) / 2);
        SelectObject(mem, old);
        let _ = DeleteObject(HGDIOBJ(bmp.0));
        let _ = DeleteDC(mem);
        ReleaseDC(None, screen);
        if !ok {
            return Err("PrintWindow returned FALSE".into());
        }
        Ok(Sample { shell, tab })
    }
}
