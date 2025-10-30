build: windows linux

linux:
    cd exporter/ && cargo build --release && cp target/release/exporter ../exporter_linux

windows:
    cd exporter/ && cargo build --release --target=x86_64-pc-windows-gnu && cp target/x86_64-pc-windows-gnu/release/exporter.exe ../exporter_windows.exe

