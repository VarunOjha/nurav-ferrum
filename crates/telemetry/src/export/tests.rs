//! p5.1 tests (p5.3 added the sample_gap record): every record type round-trips through JSONL and CSV; the writer rotates and finishes files safely;
//! the checker accepts what the writer makes and refuses each corrupted fixture; the JSON Schema matches the types.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

use serde_json::Value;

use super::csv::{TABLE_KINDS, columns, from_csv, to_csv};
use super::validate::{parse_line, validate_bytes, validate_file};
use super::*;

fn meta() -> RunMeta {
    RunMeta {
        schema_version: SCHEMA_VERSION,
        run_id: "test-run_1".into(),
        file_seq: 0,
        started_unix_ms: 1_792_000_000_000,
        ferrum_version: "0.0.0".into(),
        git_sha: "089a43f".into(),
        git_dirty: true,
        os_build: "10.0.26200.1".into(),
        webview2_runtime: "154.0.4258.62".into(),
        config_sha256: format!("sha256:{}", "ab".repeat(32)),
        machine_id: "p1.2-environment".into(),
        sample_interval_ms: Some(1000),
    }
}

/// One record of every type with every optional field present, and one with every optional field absent.
fn samples(t: u64) -> Vec<Record> {
    vec![
        Record::ProcessSample(ProcessSample {
            t_ms: t,
            pid: 4242,
            pid_created_100ns: 133_000_000_000_000_000,
            kind: ProcessKind::Renderer,
            private_commit_bytes: 52_428_800,
            working_set_bytes: 80_000_000,
            private_working_set_bytes: Some(40_000_000),
            page_faults: 12_345,
            cpu_user_100ns: 1_000_000,
            cpu_kernel_100ns: 250_000,
            cycles: Some(9_876_543_210),
        }),
        Record::ProcessSample(ProcessSample {
            t_ms: t,
            pid: 7,
            pid_created_100ns: 1,
            kind: ProcessKind::Host,
            private_commit_bytes: 0,
            working_set_bytes: 0,
            private_working_set_bytes: None,
            page_faults: 0,
            cpu_user_100ns: 0,
            cpu_kernel_100ns: 0,
            cycles: None,
        }),
        Record::TreeSample(TreeSample {
            t_ms: t,
            process_count: 6,
            private_commit_bytes: 300_000_000,
            working_set_bytes: 500_000_000,
            cpu_100ns: 7_000_000,
            cycles: Some(1),
        }),
        Record::TreeSample(TreeSample {
            t_ms: t,
            process_count: 1,
            private_commit_bytes: 1,
            working_set_bytes: 1,
            cpu_100ns: 0,
            cycles: None,
        }),
        Record::SampleGap(SampleGap {
            t_ms: t,
            reason: GapReason::CountersUnreadable,
            missing: Some(2),
        }),
        Record::SampleGap(SampleGap {
            t_ms: t,
            reason: GapReason::SetRefused,
            missing: None,
        }),
        Record::StartupMark(StartupMark {
            t_ms: t,
            mark: StartupMarkKind::TabLargestContentfulPaint,
            tab: Some(1),
        }),
        Record::StartupMark(StartupMark {
            t_ms: t,
            mark: StartupMarkKind::ProcessCreated,
            tab: None,
        }),
        Record::NavTiming(NavTiming {
            t_ms: t,
            tab: 3,
            nav_id: 17,
            start_ms: 1234.5,
            response_ms: Some(20.25),
            dom_content_loaded_ms: Some(80.0),
            load_ms: Some(120.125),
            complete_ms: Some(121.0),
            origin: OriginRelation::CrossOrigin,
            redirect_count: 2,
            outcome: NavOutcome::Completed,
        }),
        Record::NavTiming(NavTiming {
            t_ms: t,
            tab: 3,
            nav_id: 18,
            start_ms: 0.0,
            response_ms: None,
            dom_content_loaded_ms: None,
            load_ms: None,
            complete_ms: None,
            origin: OriginRelation::SameOrigin,
            redirect_count: 0,
            outcome: NavOutcome::Failed,
        }),
    ]
}

/// A fresh empty folder under the target directory (cleaned at the start of each test run, never outside the repo's
/// build output).
fn temp_dir(name: &str) -> PathBuf {
    static N: AtomicU32 = AtomicU32::new(0);
    let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../target/test-tmp/telemetry-export")
        .join(format!(
            "{name}-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/export-v1")
        .join(name)
}

#[test]
fn every_record_type_round_trips_through_json() {
    let mut all = vec![Record::Run(meta())];
    all.extend(samples(5));
    for r in &all {
        let line = serde_json::to_string(r).unwrap();
        assert!(!line.contains('\n'));
        assert_eq!(&parse_line(&line).unwrap(), r, "{line}");
    }
    let kinds: std::collections::BTreeSet<_> = all.iter().map(Record::kind).collect();
    assert_eq!(kinds.len(), 6, "a sample of every record type");
}

#[test]
fn every_table_round_trips_through_csv() {
    for kind in TABLE_KINDS {
        let rows: Vec<Record> = samples(9)
            .into_iter()
            .filter(|r| r.kind() == kind)
            .collect();
        assert_eq!(rows.len(), 2, "{kind}");
        let text = to_csv("test-run_1", kind, &rows).unwrap();
        let (run, back) = from_csv(kind, &text).unwrap();
        assert_eq!(run.as_deref(), Some("test-run_1"));
        assert_eq!(back, rows, "{kind}:\n{text}");
    }
    assert_eq!(
        from_csv("tree_sample", &to_csv("r", "tree_sample", &[]).unwrap()).unwrap(),
        (None, vec![])
    );
}

#[test]
fn csv_columns_match_the_record_fields() {
    for r in samples(1) {
        let Value::Object(obj) = serde_json::to_value(&r).unwrap() else {
            panic!()
        };
        let mut fields: Vec<&str> = obj
            .keys()
            .map(String::as_str)
            .filter(|k| *k != "type")
            .collect();
        let mut cols = columns(r.kind()).unwrap().to_vec();
        fields.sort_unstable();
        cols.sort_unstable();
        assert_eq!(fields, cols, "{}", r.kind());
    }
    assert!(columns("run").is_none(), "the run line has no table");
}

#[test]
fn csv_refuses_bad_tables() {
    let rows: Vec<Record> = samples(1)
        .into_iter()
        .filter(|r| r.kind() == "tree_sample")
        .collect();
    let good = to_csv("r1", "tree_sample", &rows).unwrap();
    assert!(
        from_csv("tree_sample", &good.replacen("cpu_100ns", "cpu", 1)).is_err(),
        "header"
    );
    assert!(
        from_csv("tree_sample", &good.replacen("\nr1,1,6,", "\nr1,1,", 1)).is_err(),
        "cell count"
    );
    assert!(
        from_csv("tree_sample", &good.replacen("\nr1,", "\nr2,", 1)).is_err(),
        "mixed runs"
    );
    assert!(
        from_csv("tree_sample", &good.replacen(",6,", ",-6,", 1)).is_err(),
        "negative count"
    );
    assert!(
        from_csv("tree_sample", &good.replacen(",6,", ",0,", 1)).is_err(),
        "zero processes"
    );
    assert!(
        to_csv("r1", "nav_timing", &rows).is_err(),
        "wrong kind in table"
    );
    assert!(to_csv("bad id", "tree_sample", &rows).is_err(), "run id");
}

#[test]
fn writer_output_is_accepted_and_rotates_by_size() {
    let dir = temp_dir("rotate");
    let mut w = ExportWriter::create(&dir, meta(), 1500).unwrap();
    let mut written = Vec::new();
    for t in 0..10u64 {
        for r in samples(t * 100) {
            w.write(&r).unwrap();
            written.push(r);
        }
    }
    let files = w.finish().unwrap();
    assert!(
        files.len() >= 3,
        "small size limit gives several files, got {}",
        files.len()
    );
    let mut read = Vec::new();
    for (seq, f) in files.iter().enumerate() {
        assert!(
            std::fs::metadata(f).unwrap().len() <= 1500 + 400,
            "{} far over the limit",
            f.display()
        );
        let s = validate_file(f).unwrap_or_else(|e| panic!("{}: {e}", f.display()));
        assert_eq!(s.run.file_seq as usize, seq);
        assert_eq!(
            s.run,
            RunMeta {
                file_seq: seq as u32,
                ..meta()
            }
        );
        assert!(!s.records.is_empty(), "no file holds only the run line");
        read.extend(s.records);
    }
    assert_eq!(read, written, "every record once, in order");
    let parts: Vec<_> = std::fs::read_dir(&dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().ends_with(".part"))
        .collect();
    assert!(parts.is_empty(), "no unfinished file left");
}

#[test]
fn an_unfinished_file_stays_part_and_is_refused() {
    let dir = temp_dir("crash");
    let mut w = ExportWriter::create(&dir, meta(), 1 << 20).unwrap();
    w.write(&samples(1)[0]).unwrap();
    drop(w); // a crash: finish() never runs
    let names: Vec<String> = std::fs::read_dir(&dir)
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(names, vec!["test-run_1.0000.jsonl.part".to_string()]);
    let e = validate_file(&dir.join(&names[0])).unwrap_err();
    assert!(e.reason.contains(".part"), "{e}");
}

#[test]
fn writer_refuses_bad_input_and_reused_run_ids() {
    let dir = temp_dir("refuse");
    let bad = RunMeta {
        git_sha: "not-hex".into(),
        ..meta()
    };
    assert!(ExportWriter::create(&dir, bad, 100).is_err());
    assert!(ExportWriter::create(&dir, meta(), 0).is_err());
    let mut w = ExportWriter::create(&dir, meta(), 1 << 20).unwrap();
    assert!(
        w.write(&Record::Run(meta())).is_err(),
        "run line is the writer's"
    );
    w.write(&samples(50)[0]).unwrap();
    assert!(w.write(&samples(49)[0]).is_err(), "clock going backwards");
    let mut nan = samples(60)
        .into_iter()
        .find(|r| r.kind() == "nav_timing")
        .unwrap();
    if let Record::NavTiming(n) = &mut nan {
        n.load_ms = Some(f64::NAN);
    }
    assert!(w.write(&nan).is_err(), "NaN offset");
    let files = w.finish().unwrap();
    assert_eq!(
        validate_file(&files[0]).unwrap().records.len(),
        1,
        "refused records left no trace"
    );
    assert!(
        ExportWriter::create(&dir, meta(), 100).is_err(),
        "same run id twice"
    );
}

#[test]
fn the_good_fixture_is_accepted() {
    let s = validate_file(&fixture("fixture-good.0000.jsonl")).unwrap();
    assert_eq!(s.run.run_id, "fixture-good");
    assert_eq!(s.records.len(), 5);
}

#[test]
fn every_corrupted_fixture_is_refused() {
    // file name -> words the refusal must contain
    let cases = [
        ("corrupt-truncated.jsonl", "line break"),
        ("corrupt-unknown-field.jsonl", "unknown field"),
        (
            "corrupt-no-run-line.jsonl",
            "first line must be the run line",
        ),
        ("corrupt-second-run-line.jsonl", "second run line"),
        (
            "corrupt-time-backwards.jsonl",
            "earlier than the line before",
        ),
        ("corrupt-schema-version.jsonl", "schema_version"),
        ("corrupt-unknown-type.jsonl", "unknown variant"),
        ("corrupt-bad-config-hash.jsonl", "config_sha256"),
        ("corrupt-wrong-type.jsonl", "invalid type"),
        ("corrupt-empty-line.jsonl", "empty line"),
        ("corrupt-not-json.jsonl", "line 3"),
        ("corrupt-gap-missing.jsonl", "missing must be null"),
    ];
    let mut seen = 0;
    for entry in std::fs::read_dir(fixture("")).unwrap() {
        let name = entry.unwrap().file_name().to_string_lossy().into_owned();
        if name.starts_with("corrupt-") {
            seen += 1;
            assert!(
                cases.iter().any(|(n, _)| *n == name),
                "{name} has no test case"
            );
        }
    }
    assert_eq!(seen, cases.len());
    for (name, words) in cases {
        let bytes = std::fs::read(fixture(name)).unwrap();
        let e = validate_bytes(&bytes).expect_err(name);
        assert!(e.to_string().contains(words), "{name}: {e}");
    }
    let renamed = temp_dir("renamed").join("other-name.0000.jsonl");
    std::fs::copy(fixture("fixture-good.0000.jsonl"), &renamed).unwrap();
    assert!(
        validate_file(&renamed)
            .unwrap_err()
            .reason
            .contains("its run line says")
    );
}

/// The committed JSON Schema lists, for every record type, exactly the fields the Rust types write, with the right
/// required set and the right enum values.
#[test]
fn json_schema_matches_the_types() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("schema/v1/record.schema.json");
    let schema: Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    let defs = schema["$defs"].as_object().unwrap();
    let mut all = vec![Record::Run(meta())];
    all.extend(samples(1));
    let mut checked = std::collections::BTreeSet::new();
    for r in &all {
        let Value::Object(obj) = serde_json::to_value(r).unwrap() else {
            panic!()
        };
        let def = &defs[r.kind()];
        assert_eq!(
            def["additionalProperties"],
            Value::Bool(false),
            "{}",
            r.kind()
        );
        assert_eq!(
            def["properties"]["type"]["const"],
            Value::String(r.kind().into())
        );
        let props: std::collections::BTreeSet<&str> = def["properties"]
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        let fields: std::collections::BTreeSet<&str> = obj.keys().map(String::as_str).collect();
        assert_eq!(props, fields, "{}: schema properties vs fields", r.kind());
        let required: std::collections::BTreeSet<&str> = def["required"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap())
            .collect();
        assert_eq!(
            required,
            fields,
            "{}: every field is written, null when absent",
            r.kind()
        );
        // a field that may be null in the schema must be one the type allows to be absent, and the reverse
        for (k, v) in &obj {
            let ty = &def["properties"][k]["type"];
            let nullable = ty
                .as_array()
                .is_some_and(|a| a.contains(&Value::from("null")));
            if v.is_null() {
                assert!(
                    nullable,
                    "{}.{k} is null but the schema does not allow null",
                    r.kind()
                );
            }
        }
        checked.insert(r.kind());
    }
    assert_eq!(
        checked.len(),
        defs.len(),
        "a schema definition for every record type and no more"
    );
    let one_of = schema["oneOf"].as_array().unwrap();
    assert_eq!(one_of.len(), defs.len());
    let enum_of = |name: &str| -> Vec<String> {
        schema["$defs"]
            .as_object()
            .unwrap()
            .values()
            .find_map(|d| d["properties"].get(name).and_then(|p| p.get("enum")))
            .unwrap_or_else(|| panic!("no enum {name}"))
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect()
    };
    let names = |vals: Vec<Value>| -> Vec<String> {
        vals.into_iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect()
    };
    use ProcessKind as P;
    use StartupMarkKind as S;
    let all_kinds = [
        P::Host,
        P::Browser,
        P::Renderer,
        P::Gpu,
        P::Utility,
        P::Other,
    ];
    assert_eq!(
        enum_of("kind"),
        names(
            all_kinds
                .iter()
                .map(|k| serde_json::to_value(k).unwrap())
                .collect()
        )
    );
    let marks = [
        S::ProcessCreated,
        S::WindowVisible,
        S::ShellFirstPaint,
        S::TabFirstContentfulPaint,
        S::TabLargestContentfulPaint,
    ];
    assert_eq!(
        enum_of("mark"),
        names(
            marks
                .iter()
                .map(|k| serde_json::to_value(k).unwrap())
                .collect()
        )
    );
    let origins = [OriginRelation::SameOrigin, OriginRelation::CrossOrigin];
    assert_eq!(
        enum_of("origin"),
        names(
            origins
                .iter()
                .map(|k| serde_json::to_value(k).unwrap())
                .collect()
        )
    );
    let reasons = [GapReason::SetRefused, GapReason::CountersUnreadable];
    assert_eq!(
        enum_of("reason"),
        names(
            reasons
                .iter()
                .map(|k| serde_json::to_value(k).unwrap())
                .collect()
        )
    );
    let outcomes = [
        NavOutcome::Completed,
        NavOutcome::Failed,
        NavOutcome::Cancelled,
    ];
    assert_eq!(
        enum_of("outcome"),
        names(
            outcomes
                .iter()
                .map(|k| serde_json::to_value(k).unwrap())
                .collect()
        )
    );
}
