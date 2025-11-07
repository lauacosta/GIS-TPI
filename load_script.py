#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path

def get_shp_files(directory: str = "./shp_files") -> list[Path]:
    """Get all .shp files from the directory."""
    shp_dir = Path(directory)
    
    if not shp_dir.exists():
        print(f"❌ Directory '{directory}' does not exist")
        print("❌ Please create the directory and put all .shp files there")
        sys.exit(1)
    
    shp_files = list(shp_dir.glob("*.shp"))
    return shp_files


def import_shapefile(shp_path: Path, pg_connection: str) -> bool:
    """Import a single shapefile to PostGIS using ogr2ogr."""
    table_name = shp_path.stem
    
    print(f"📥 Processing file: {shp_path} ...")
    
    cmd = [
        "ogr2ogr",
        "-f", "PostgreSQL",
        f"PG:{pg_connection}",
        str(shp_path),
        "-nln", table_name,
        "-t_srs", "EPSG:4326",
        "-nlt", "PROMOTE_TO_MULTI",
        "-lco", "PRECISION=NO",
        "-lco", "LAUNDER=YES",
        "-lco", "SPATIAL_INDEX=GIST",
        "-lco", "GEOMETRY_NAME=geom",
        "-lco", "FID=gid",
        "--config", "PG_USE_COPY", "YES",
        "-overwrite"
    ]
    
    try:
        subprocess.run(  # pyright: ignore[reportUnusedCallResult]
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"   ✅ Table '{table_name}' created/updated in PostGIS\n")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ ogr2ogr failed for {shp_path}")
        print(f"Exit code: {e.returncode}")
        print(f"Stderr:\n{e.stderr}")  # pyright: ignore[reportAny]
        return False
    except FileNotFoundError:
        print("❌ ogr2ogr command not found")
        print("   Make sure GDAL/ogr2ogr is installed and in your PATH")
        sys.exit(1)


def main():
    print("\n***********************************************")
    print("   IMPORTADOR AUTOMÁTICO A POSTGIS (ogr2ogr)")
    print("***********************************************\n")
    
    pg_host = os.getenv("PG_HOST", "localhost")
    pg_port = os.getenv("PG_PORT", "5432")
    pg_user = os.getenv("PG_USER", "postgres")
    pg_password = os.getenv("PG_PASSWORD", "postgres")
    pg_database = os.getenv("PG_DATABASE", "postgres")
    
    print(f"🔌 Connection: {pg_user}@{pg_host}:{pg_port}/{pg_database}\n")
    
    pg_connection = (
        f"host={pg_host} port={pg_port} user={pg_user} "
        f"password={pg_password} dbname={pg_database}"
    )
    
    shp_files = get_shp_files()
    
    if not shp_files:
        print("⚠️  No .shp files found in ./shp_files/")
        sys.exit(0)
    
    print(f"📂 Found {len(shp_files)} .shp file(s)\n")
    
    success_count = 0
    failed_count = 0
    
    for shp_file in shp_files:
        if import_shapefile(shp_file, pg_connection):
            success_count += 1
        else:
            failed_count += 1
    
    print("***********************************************")
    print("   PROCESO COMPLETADO")
    print(f"   ✅ Success: {success_count}")
    if failed_count > 0:
        print(f"   ❌ Failed: {failed_count}")
    print("***********************************************\n")
    
    if failed_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
