//! CSV export (p5.1): one table per record type, for spreadsheets and the Python analysis. The JSONL files stay the
//! source of truth; a table carries the `run_id` in its first column so it can be joined with its run line.
//!
//! Values are numbers, `true`/`false` and the snake_case names of the record enums, so no value needs quoting; an
//! empty cell means "not available". The run line has no table: it is the label, read from the JSONL.

use serde_json::{Map, Value};

use super::records::Record;
use super::validate::{is_valid_run_id, validate_record};

/// The column order of each table (after `run_id`). A test checks these lists against the record types.
pub fn columns(kind: &str) -> Option<&'static [&'static str]> {
    Some(match kind {
        "process_sample" => &[
            "t_ms",
            "pid",
            "pid_created_100ns",
            "kind",
            "private_commit_bytes",
            "working_set_bytes",
            "private_working_set_bytes",
            "page_faults",
            "cpu_user_100ns",
            "cpu_kernel_100ns",
            "cycles",
        ],
        "tree_sample" => &[
            "t_ms",
            "process_count",
            "private_commit_bytes",
            "working_set_bytes",
            "cpu_100ns",
            "cycles",
        ],
        "startup_mark" => &["t_ms", "mark", "tab"],
        "nav_timing" => &[
            "t_ms",
            "tab",
            "nav_id",
            "start_ms",
            "response_ms",
            "dom_content_loaded_ms",
            "load_ms",
            "complete_ms",
            "origin",
            "redirect_count",
            "outcome",
        ],
        _ => return None,
    })
}

/// The record types that have a table.
pub const TABLE_KINDS: [&str; 4] = [
    "process_sample",
    "tree_sample",
    "startup_mark",
    "nav_timing",
];

fn cell(v: &Value) -> Result<String, String> {
    match v {
        Value::Null => Ok(String::new()),
        Value::Bool(b) => Ok(b.to_string()),
        Value::Number(n) => Ok(n.to_string()),
        Value::String(s)
            if !s.is_empty()
                && s.bytes().all(|b| b.is_ascii_lowercase() || b == b'_')
                && s.parse::<f64>().is_err() =>
        {
            Ok(s.clone())
        }
        other => Err(format!("value {other} cannot be a CSV cell")),
    }
}

/// Writes the records of one kind as a CSV table with a header line. Every record must be of that kind.
pub fn to_csv(run_id: &str, kind: &str, records: &[Record]) -> Result<String, String> {
    let cols = columns(kind).ok_or_else(|| format!("no table for record type {kind:?}"))?;
    if !is_valid_run_id(run_id) {
        return Err(format!("run_id {run_id:?} is not valid"));
    }
    let mut out = String::from("run_id");
    for c in cols {
        out.push(',');
        out.push_str(c);
    }
    out.push('\n');
    for r in records {
        if r.kind() != kind {
            return Err(format!("a {} record in the {kind} table", r.kind()));
        }
        let Value::Object(obj) = serde_json::to_value(r).map_err(|e| e.to_string())? else {
            return Err("a record is not an object".into());
        };
        if obj.len() != cols.len() + 1 {
            return Err(format!(
                "a {kind} record has {} fields, the table {}",
                obj.len() - 1,
                cols.len()
            ));
        }
        out.push_str(run_id);
        for c in cols {
            let v = obj.get(*c).ok_or_else(|| format!("field {c} missing"))?;
            out.push(',');
            out.push_str(&cell(v)?);
        }
        out.push('\n');
    }
    Ok(out)
}

fn value_of(text: &str) -> Value {
    if text.is_empty() {
        return Value::Null;
    }
    match text {
        "true" => return Value::Bool(true),
        "false" => return Value::Bool(false),
        _ => {}
    }
    if let Ok(v) = serde_json::from_str::<serde_json::Number>(text) {
        return Value::Number(v);
    }
    Value::String(text.to_string())
}

/// Reads a table written by [`to_csv`] back into its run id (`None` for a table without rows) and records; refuses a
/// wrong header, a wrong number of cells, mixed runs and any value the record types refuse.
pub fn from_csv(kind: &str, text: &str) -> Result<(Option<String>, Vec<Record>), String> {
    let cols = columns(kind).ok_or_else(|| format!("no table for record type {kind:?}"))?;
    let mut lines = text.lines();
    let header = lines.next().ok_or("the table is empty")?;
    let expected: Vec<&str> = std::iter::once("run_id")
        .chain(cols.iter().copied())
        .collect();
    if header.split(',').collect::<Vec<_>>() != expected {
        return Err(format!("header {header:?} is not {:?}", expected.join(",")));
    }
    let mut run: Option<String> = None;
    let mut out = Vec::new();
    for (i, line) in lines.enumerate() {
        let n = i + 2;
        let cells: Vec<&str> = line.split(',').collect();
        if cells.len() != expected.len() {
            return Err(format!(
                "line {n}: {} cells, expected {}",
                cells.len(),
                expected.len()
            ));
        }
        match &run {
            None => run = Some(cells[0].to_string()),
            Some(r) if r != cells[0] => {
                return Err(format!("line {n}: run_id {} differs from {r}", cells[0]));
            }
            Some(_) => {}
        }
        let mut obj = Map::new();
        obj.insert("type".into(), Value::String(kind.into()));
        for (c, v) in cols.iter().zip(&cells[1..]) {
            obj.insert((*c).into(), value_of(v));
        }
        let record: Record =
            serde_json::from_value(Value::Object(obj)).map_err(|e| format!("line {n}: {e}"))?;
        validate_record(&record).map_err(|e| format!("line {n}: {e}"))?;
        out.push(record);
    }
    Ok((run, out))
}
