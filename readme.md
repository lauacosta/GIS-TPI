# Puesta en marcha del proyecto

Videito que le hice al Gonza explicandole que hice, por si les interesa:

[Inciar el proyecto](https://www.canva.com/design/DAG31Ri3CXU/oiO9PCj5crc95ckQvGcolw/edit?continue_in_browser=true)

## Correr el contenedor docker

En la carpeta infra esta el contenedor, correlo:

docker compose up -d

En esa misma carpeta vas a ver un zip que tiene dos carpetas mas **geoserver_data y geoserver_logs.** En la primera ya esta cargada la información de **GEOSERVER.**. Una vez lo descomprimir poné ambas carpetas en el mismo directorio que el docker-compose. La imagen que corre de geoserver va a estar leyendo esas carpetas para recuperar los datos.

## Cargar capas a QGIS

Si sos Linux-boy entra a la carpeta **exporter,** si sos windows-girl entra a **windows-exporter** ahí están las indicaciones de como cargar las capas a QGIS.
