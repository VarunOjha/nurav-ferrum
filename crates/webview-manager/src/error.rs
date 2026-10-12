//! The crate's error type (explicit errors, task p2.14): callers can tell a failed WebView2 call from a missing
//! controller, and every error prints as one plain line for the log.

use std::fmt;

/// Something the WebView2 layer could not do.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// A WebView2 COM call failed with this HRESULT.
    Com {
        /// The HRESULT as an unsigned number (printed in hex).
        code: u32,
        /// The system's message for it.
        message: String,
    },
    /// WebView2 reported success but returned no controller.
    NoController,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Com { code, message } => {
                write!(f, "WebView2 call failed: 0x{code:08X} {message}")
            }
            Error::NoController => f.write_str("WebView2 returned no controller"),
        }
    }
}

impl std::error::Error for Error {}

#[cfg(test)]
mod tests {
    use super::Error;

    #[test]
    fn errors_print_as_one_line() {
        let e = Error::Com {
            code: 0x8007_0057,
            message: "The parameter is incorrect.".into(),
        };
        assert_eq!(
            e.to_string(),
            "WebView2 call failed: 0x80070057 The parameter is incorrect."
        );
        assert!(!Error::NoController.to_string().contains('\n'));
    }
}
