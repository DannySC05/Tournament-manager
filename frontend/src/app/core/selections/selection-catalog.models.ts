export interface SelectionCatalogItem {
  id: number;
  nombre: string;
  codigo_fifa: string;
  confederacion: string;
  escudo_url: string | null;
  bandera_url: string | null;
  ranking_fifa: number | null;
  ranking_puntos: number | null;
  ranking_actualizado_en: string | null;
}

export interface CatalogSyncResult {
  message: string;
  data: { total: number };
}
