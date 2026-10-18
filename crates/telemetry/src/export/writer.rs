//! The JSONL writer (p5.1): one run, one or more files, rotated by size.
//!
//! A file is written as `<run_id>.<seq>.jsonl.part` and renamed to `<run_id>.<seq>.jsonl` only after its last line is
//! flushed and synced to disk. So a finished name always holds a complete file; a crash leaves a `.part` file that the
//! checker refuses. Every file starts with the run line (with its own `file_seq`), so each one can be read alone.

use std::fs::{File, OpenOptions};
use std::io::{self, BufWriter, Write};
use std::path::{Path, PathBuf};

use super::records::{Record, RunMeta};
use super::validate::{file_name, validate_record, validate_run};

fn invalid(msg: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, msg.into())
}

struct OpenFile {
    out: BufWriter<File>,
    part: PathBuf,
    done: PathBuf,
    bytes: u64,
    records: u64,
}

/// Writes the records of one run to `dir`, starting a new file when the current one would pass `max_bytes`.
pub struct ExportWriter {
    dir: PathBuf,
    meta: RunMeta,
    max_bytes: u64,
    current: Option<OpenFile>,
    last_t: u64,
    finished: Vec<PathBuf>,
}

impl ExportWriter {
    /// Starts a run: checks the run label and opens the first file. `meta.file_seq` is ignored (the writer numbers
    /// the files). Fails if a file of this run already exists, so two runs never share an id.
    pub fn create(dir: &Path, meta: RunMeta, max_bytes: u64) -> io::Result<Self> {
        validate_run(&meta).map_err(invalid)?;
        if max_bytes == 0 {
            return Err(invalid("max_bytes is 0"));
        }
        std::fs::create_dir_all(dir)?;
        let mut w = ExportWriter {
            dir: dir.to_path_buf(),
            meta,
            max_bytes,
            current: None,
            last_t: 0,
            finished: Vec::new(),
        };
        w.open(0)?;
        Ok(w)
    }

    fn open(&mut self, seq: u32) -> io::Result<()> {
        let done = self.dir.join(file_name(&self.meta.run_id, seq));
        let part = self
            .dir
            .join(format!("{}.part", file_name(&self.meta.run_id, seq)));
        if done.exists() {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("{} already exists", done.display()),
            ));
        }
        let file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&part)?;
        let mut header = self.meta.clone();
        header.file_seq = seq;
        let line = line_of(&Record::Run(header))?;
        let mut out = BufWriter::new(file);
        out.write_all(&line)?;
        self.current = Some(OpenFile {
            out,
            part,
            done,
            bytes: line.len() as u64,
            records: 0,
        });
        self.meta.file_seq = seq;
        Ok(())
    }

    /// Appends one record. Refuses a run line, a record with invalid values, or a `t_ms` earlier than the last one
    /// written; nothing is written then.
    pub fn write(&mut self, record: &Record) -> io::Result<()> {
        if matches!(record, Record::Run(_)) {
            return Err(invalid("the run line is written by the writer itself"));
        }
        validate_record(record).map_err(invalid)?;
        let t = record.t_ms().unwrap_or(self.last_t);
        if t < self.last_t {
            return Err(invalid(format!(
                "t_ms {t} is earlier than the last record ({})",
                self.last_t
            )));
        }
        let line = line_of(record)?;
        let full = self
            .current
            .as_ref()
            .is_some_and(|f| f.records > 0 && f.bytes + line.len() as u64 > self.max_bytes);
        if full {
            self.rotate()?;
        }
        let f = self
            .current
            .as_mut()
            .ok_or_else(|| io::Error::other("writer is closed"))?;
        f.out.write_all(&line)?;
        f.bytes += line.len() as u64;
        f.records += 1;
        self.last_t = t;
        Ok(())
    }

    /// Finishes the current file and opens the next one.
    pub fn rotate(&mut self) -> io::Result<()> {
        let next = self.meta.file_seq + 1;
        self.close_current()?;
        self.open(next)
    }

    fn close_current(&mut self) -> io::Result<()> {
        if let Some(f) = self.current.take() {
            let file = f.out.into_inner().map_err(|e| e.into_error())?;
            file.sync_all()?;
            drop(file); // closed before the rename: Windows cannot rename an open file reliably
            std::fs::rename(&f.part, &f.done)?;
            self.finished.push(f.done);
        }
        Ok(())
    }

    /// Finishes the last file and returns every finished file of the run, in order.
    pub fn finish(mut self) -> io::Result<Vec<PathBuf>> {
        self.close_current()?;
        Ok(std::mem::take(&mut self.finished))
    }
}

fn line_of(record: &Record) -> io::Result<Vec<u8>> {
    let mut line = serde_json::to_vec(record).map_err(io::Error::other)?;
    line.push(b'\n');
    Ok(line)
}
