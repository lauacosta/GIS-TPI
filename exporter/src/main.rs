use std::{ffi::OsStr, path::Path, process::Command};

fn main() {
    let force_reload = match std::env::args().nth(1).as_deref() {
        Some("reload" | "--reload" | "-r") => {
            println!("🔄 Force reloading...");
            true
        }
        Some("help" | "--help" | "-h") => {
            println!(
                "Usage: exporter [OPTIONS]\n\n\
             Options:\n  \
               reload, --reload, -r    Force reload data\n  \
               help,   --help,   -h    Show this help message\n\n\
             If no option is provided, the program runs normally."
            );
            std::process::exit(0);
        }
        Some(other) => {
            eprintln!(
                "❌ Unknown argument: {other}\n\n\
             Usage: program [reload|--reload|-r|help|--help|-h]"
            );
            std::process::exit(1);
        }
        None => false,
    };

    let target_dir = Path::new("shp_to_sql");
    let tmp_dir = Path::new("shp_to_sql_tmp");

    if !target_dir.exists() || force_reload {
        if tmp_dir.exists() {
            std::fs::remove_dir_all(tmp_dir).unwrap_or_else(|e| {
                eprintln!(
                    "❌ Failed to remove old temporary directory '{:?}': {e}",
                    tmp_dir
                );
                std::process::exit(1);
            });
        }

        std::fs::create_dir_all(tmp_dir).unwrap_or_else(|e| {
            eprintln!(
                "❌ Failed to create temporary directory '{:?}': {e}",
                tmp_dir
            );
            std::process::exit(1);
        });

        let cleanup_guard = CleanupGuard { path: tmp_dir };

        let shp_files: Vec<_> = std::fs::read_dir("./shp_files")
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to read directory './shp_files': {e}");
                eprintln!("❌ Please, create the directory and put all .shp files there");
                std::process::exit(1);
            })
            .filter_map(|entry| entry.ok().map(|e| e.path()))
            .filter(|e| e.extension() == Some(OsStr::new("shp")))
            .collect();

        if shp_files.is_empty() {
            eprintln!("⚠️  No .shp files found in ./shp_files/");
        }

        for entry in shp_files {
            let entry_path = entry.as_path().to_string_lossy();
            let entry_name = entry
                .file_stem()
                .unwrap_or_else(|| {
                    eprintln!("❌ Failed to get file stem for {}", entry.display());
                    std::process::exit(1);
                })
                .to_string_lossy();

            let output_file = tmp_dir.join(format!("{entry_name}.sql"));

            let output = Command::new("shp2pgsql")
                .args(["-D", "-I", "-s", "26918", &entry_path, &entry_name])
                .output()
                .unwrap_or_else(|e| {
                    eprintln!("❌ Failed to execute shp2pgsql on {entry_path}: {e}");
                    std::process::exit(1);
                });

            if !output.status.success() {
                eprintln!(
                    "❌ shp2pgsql failed for {entry_path}\nExit code: {:?}\nStderr:\n{}",
                    output.status.code(),
                    String::from_utf8_lossy(&output.stderr)
                );
                std::process::exit(1);
            }

            std::fs::write(&output_file, &output.stdout).unwrap_or_else(|e| {
                eprintln!(
                    "❌ Failed to write SQL file '{}': {e}",
                    output_file.display()
                );
                std::process::exit(1);
            });

            println!("✅ Wrote {}", output_file.display());
        }

        if target_dir.exists() {
            std::fs::remove_dir_all(target_dir).unwrap_or_else(|e| {
                eprintln!(
                    "❌ Failed to remove old directory '{}': {e}",
                    target_dir.display()
                );
                std::process::exit(1);
            });
        }

        std::fs::rename(tmp_dir, target_dir).unwrap_or_else(|e| {
            eprintln!(
                "❌ Failed to rename '{}' to '{}': {e}",
                tmp_dir.display(),
                target_dir.display()
            );
            std::process::exit(1);
        });

        println!("✅ Successfully built '{}'", target_dir.display());

        std::mem::forget(cleanup_guard);
    }

    let sql_files: Vec<_> = std::fs::read_dir("./shp_to_sql")
        .unwrap_or_else(|e| {
            eprintln!("❌ Failed to read directory './shp_to_sql': {e}");
            std::process::exit(1);
        })
        .filter_map(|entry| match entry {
            Ok(e) => Some(e.path()),
            Err(e) => {
                eprintln!("⚠️  Skipping unreadable entry in ./shp_to_sql: {e}");
                None
            }
        })
        .collect();

    if sql_files.is_empty() {
        eprintln!("⚠️  No .sql files found in ./shp_to_sql/");
    }

    for entry in sql_files {
        let entry_path = entry.as_path().to_string_lossy();

        println!("📥 Inserting {entry_path} into PostGIS...");

        let output = Command::new("psql")
            .env("PGPASSWORD", "postgres")
            .args([
                "-h",
                "localhost",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-f",
                &entry_path,
            ])
            .output()
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to execute psql for {entry_path}: {e}");
                std::process::exit(1);
            });

        if !output.status.success() {
            eprintln!(
                "❌ psql failed for {entry_path}\nExit code: {:?}\nStderr:\n{}",
                output.status.code(),
                String::from_utf8_lossy(&output.stderr)
            );
            std::process::exit(1);
        }

        println!("✅ Imported {entry_path}");
    }
}

struct CleanupGuard<'a> {
    path: &'a std::path::Path,
}

impl<'a> Drop for CleanupGuard<'a> {
    fn drop(&mut self) {
        if self.path.exists() {
            if let Err(e) = std::fs::remove_dir_all(self.path) {
                eprintln!(
                    "⚠️  Failed to clean up temporary directory '{}': {e}",
                    self.path.display()
                );
            } else {
                eprintln!(
                    "🧹 Cleaned up temporary directory '{}'",
                    self.path.display()
                );
            }
        }
    }
}
