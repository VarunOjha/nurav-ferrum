//! Export schema v1 (p5.1): the record types, the JSONL writer with size rotation, the CSV tables and the checker.
//! The JSON Schema of the same format, for readers outside Rust, is `crates/telemetry/schema/v1/record.schema.json`.

pub mod csv;
pub mod records;
pub mod validate;
pub mod writer;

pub use records::{
    NavOutcome, NavTiming, OriginRelation, ProcessKind, ProcessSample, Record, RunMeta,
    SCHEMA_VERSION, StartupMark, StartupMarkKind, TreeSample,
};
pub use validate::{FileSummary, ValidationError, validate_bytes, validate_file};
pub use writer::ExportWriter;

#[cfg(test)]
mod tests;
