use std::{ffi::OsStr, process::Command};

fn main() {
    let force_reload = match std::env::args().nth(1).as_deref() {
        Some("reload" | "--reload" | "-r") => {
            println!("Force reloading...");
            true
        }
        Some(other) => {
            println!("Unknown arg: {other}");
            std::process::exit(1)
        }
        None => false,
    };

    if force_reload {
        std::fs::DirBuilder::new()
            .recursive(true)
            .create("shp_to_sql")
            .unwrap();

        let shp_files: Vec<_> = std::fs::read_dir("./shp_files")
            .unwrap()
            .filter_map(std::result::Result::ok)
            .map(|res| res.path())
            .filter(|e| e.extension() == Some(OsStr::new("shp")))
            .collect();

        for entry in shp_files {
            let entry_path = entry.as_path().to_string_lossy();
            let entry_name = entry.file_stem().unwrap().to_string_lossy();
            let output_file = format!("shp_to_sql/{entry_name}.sql");

            let output = Command::new("shp2pgsql")
                .args(["-D", "-I", "-s", "26918", &entry_path, &entry_name])
                .output()
                .expect("failed to execute shp2pgsql");

            std::fs::write(&output_file, output.stdout).expect("failed to write SQL file");

            println!("✅ Wrote {output_file}");
        }
    }

    {
        let sql_files: Vec<_> = std::fs::read_dir("./shp_to_sql")
            .unwrap()
            .filter_map(std::result::Result::ok)
            .map(|res| res.path())
            .collect();

        for entry in sql_files {
            let entry_path = entry.as_path().to_string_lossy();

            println!("Inserting {entry_path} into postgis");
            Command::new("psql")
                .args(["-U", "lautaro", "-d", "gisdb", "-f", &entry_path])
                .output()
                .expect("failed to execute psql");
        }
    }
}
