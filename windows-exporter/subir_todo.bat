@ECHO OFF
ECHO.
ECHO  ***********************************************
ECHO      IMPORTADOR AUTOMATICO A POSTGIS (ogr2ogr)
ECHO  ***********************************************
ECHO.

:: Configura la conexion a tu base de datos Docker
SET PG_CON="host=localhost port=5433 user=postgres password=postgres dbname=postgres"

:: Recorre cada archivo .shp en la carpeta actual
FOR %%f IN (*.shp) DO (
    ECHO.
    ECHO  Procesando archivo: %%f ...
    
    :: Esta es la linea magica
    ogr2ogr -f "PostgreSQL" PG:%PG_CON% "%%f" ^
            -nln "%%~nf" ^
            -t_srs "EPSG:4326" ^
	    -nlt PROMOTE_TO_MULTI ^
	    -lco "PRECISION=NO" ^
            -lco "LAUNDER=YES" ^
            -lco "SPATIAL_INDEX=GIST" ^
            -lco "GEOMETRY_NAME=geom" ^
            -lco "FID=gid" ^
            --config PG_USE_COPY YES ^
            -overwrite

    ECHO  -> Tabla '%%~nf' creada/actualizada en PostGIS.
)

ECHO.
ECHO  ***********************************************
ECHO      PROCESO COMPLETADO
ECHO  ***********************************************
PAUSE