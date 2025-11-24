import { generatePdf } from "../../utils/pdfExporter";

export function createExportTool(map, wfsLayers, layersData) {
  function startProgress() {
    const bar = document.querySelector("#pdf-progress");

    if (!bar) return () => {};

    bar.classList.remove("hidden");
    bar.style.width = "30%";

    let w = 30;

    const timer = setInterval(() => {
      w = Math.min(95, w + 5);
      bar.style.width = w + "%";
    }, 300);

    return () => {
      clearInterval(timer);
      bar.style.width = "100%";
      setTimeout(() => bar.classList.add("hidden"), 500);
    };
  }

  return {
    export: async (format = "a4") => {
      const btn = document.querySelector("#export-pdf");

      if (btn) btn.disabled = true;
      document.body.style.cursor = "progress";

      const stopProgress = startProgress();

      try {
        console.log(`Iniciando exportación a PDF (${format})...`);

        await generatePdf(map, format, wfsLayers, layersData);

        console.log("Exportación finalizada con éxito.");
      } catch (error) {
        console.error("Error en exportTool:", error);
        alert(
          "Ocurrió un error al generar el mapa. Revisa la consola para más detalles."
        );
      } finally {
        stopProgress();
        if (btn) btn.disabled = false;
        document.body.style.cursor = "auto";
      }
    },
  };
}
