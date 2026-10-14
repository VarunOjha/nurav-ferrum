//! Download names (p4.6; threat T10 in `wiki/quality/qual-security-testing-plan.md` §7).
//!
//! A site names the file it sends. [`clean_file_name`] turns that name into one that is safe to save on Windows: only
//! the last path part is kept (no `..\..\` tricks), control and direction-changing characters are removed (a right-to-
//! left mark can make `photo\u{202E}gpj.exe` look like `photoexe.jpg`), characters Windows forbids become `_`, trailing
//! dots and spaces go, device names such as `CON` or `NUL` get a `_` in front, and very long names are shortened
//! keeping the extension. [`is_program`] says whether the cleaned name is a type that runs code when opened, so the
//! shell can warn. Pure, never panics; the app saves files and never opens them (no auto-open).

/// File types that run code (or install, or mount a disk image whose files then run) when opened. Ferrum's own list,
/// lower case, without the dot. A download of one of these types gets a warning.
pub const PROGRAM_EXTENSIONS: &[&str] = &[
    "exe",
    "com",
    "scr",
    "pif",
    "msi",
    "msp",
    "msix",
    "msixbundle",
    "appx",
    "appxbundle",
    "appinstaller",
    "bat",
    "cmd",
    "ps1",
    "psm1",
    "psd1",
    "vbs",
    "vbe",
    "js",
    "jse",
    "wsf",
    "wsh",
    "hta",
    "cpl",
    "msc",
    "jar",
    "lnk",
    "url",
    "reg",
    "dll",
    "sys",
    "iso",
    "img",
    "vhd",
    "vhdx",
    "application",
    "appref-ms",
    "settingcontent-ms",
    "library-ms",
    "search-ms",
    "chm",
    "inf",
    "scf",
];

/// Longest cleaned name, in characters (Windows allows 255 per path part; this leaves room for ` (12)` and more).
pub const MAX_NAME_CHARS: usize = 200;

/// Windows device names: a file whose name before the first dot is one of these cannot be used normally.
const DEVICE_NAMES: &[&str] = &[
    "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8",
    "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
];

/// Characters that change the reading direction or are invisible; removed from names.
fn hidden_char(c: char) -> bool {
    matches!(c, '\u{200B}'..='\u{200F}' | '\u{202A}'..='\u{202E}' | '\u{2066}'..='\u{2069}' | '\u{FEFF}')
}

/// A file name that is safe to save on Windows (see the module documentation); `download` when nothing usable is left.
pub fn clean_file_name(suggested: &str) -> String {
    let last = suggested.rsplit(['/', '\\']).next().unwrap_or_default();
    let mut name: String = last
        .chars()
        .filter(|c| !c.is_control() && !hidden_char(*c))
        .map(|c| if "<>:\"|?*".contains(c) { '_' } else { c })
        .collect();
    name = name.trim_end_matches(['.', ' ']).trim_start().to_string();
    if name.chars().all(|c| c == '.') {
        return "download".to_string();
    }
    let stem = name
        .split('.')
        .next()
        .unwrap_or_default()
        .trim_end()
        .to_ascii_lowercase();
    if DEVICE_NAMES.contains(&stem.as_str()) {
        name.insert(0, '_');
    }
    if name.chars().count() > MAX_NAME_CHARS {
        let ext = name
            .rsplit_once('.')
            .map(|(_, e)| e)
            .filter(|e| e.chars().count() <= 20)
            .map(|e| format!(".{e}"))
            .unwrap_or_default();
        let keep = MAX_NAME_CHARS - ext.chars().count();
        name = name.chars().take(keep).collect::<String>() + &ext;
    }
    name
}

/// Whether `name` (a cleaned name) is a type that runs code when opened ([`PROGRAM_EXTENSIONS`]).
pub fn is_program(name: &str) -> bool {
    name.rsplit_once('.')
        .is_some_and(|(_, ext)| PROGRAM_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_cleaned() {
        let cases = [
            ("report.pdf", "report.pdf"),
            ("..\\..\\Windows\\System32\\evil.exe", "evil.exe"),
            ("../../etc/passwd", "passwd"),
            ("C:\\Users\\x\\Downloads\\a.txt", "a.txt"),
            ("photo\u{202E}gpj.exe", "photogpj.exe"),
            ("in\u{0}voice\u{7}.pdf", "invoice.pdf"),
            ("a<b>c:d\"e|f?g*h.txt", "a_b_c_d_e_f_g_h.txt"),
            ("notes.txt. . .", "notes.txt"),
            ("  spaced.txt", "spaced.txt"),
            ("CON", "_CON"),
            ("nul.txt", "_nul.txt"),
            ("Com1 .log", "_Com1 .log"),
            ("console.txt", "console.txt"),
            ("", "download"),
            ("..", "download"),
            ("dir/", "download"),
            ("\u{200B}\u{FEFF}", "download"),
        ];
        let got: Vec<_> = cases.iter().map(|(i, _)| clean_file_name(i)).collect();
        let want: Vec<_> = cases.iter().map(|(_, w)| w.to_string()).collect();
        assert_eq!(got, want);
    }

    #[test]
    fn long_names_keep_their_extension() {
        let long = format!("{}.pdf", "a".repeat(400));
        let c = clean_file_name(&long);
        assert_eq!(c.chars().count(), MAX_NAME_CHARS);
        assert!(c.ends_with(".pdf"));
        // An "extension" longer than 20 characters is not kept separately.
        let odd = format!("x.{}", "b".repeat(300));
        assert_eq!(clean_file_name(&odd).chars().count(), MAX_NAME_CHARS);
        let none = "c".repeat(300);
        assert_eq!(clean_file_name(&none), "c".repeat(MAX_NAME_CHARS));
    }

    #[test]
    fn program_types_are_recognised() {
        let flagged: Vec<_> = [
            "setup.exe",
            "SETUP.EXE",
            "x.msi",
            "run.ps1",
            "a.b.lnk",
            "disk.iso",
            "photogpj.exe",
        ]
        .iter()
        .map(|n| is_program(n))
        .collect();
        assert_eq!(flagged, vec![true; 7]);
        let plain: Vec<_> = [
            "report.pdf",
            "photo.jpg",
            "exe",
            "archive.zip",
            "notes.txt",
            "noext",
        ]
        .iter()
        .map(|n| is_program(n))
        .collect();
        assert_eq!(plain, vec![false; 6]);
    }
}
