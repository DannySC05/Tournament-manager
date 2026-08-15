import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { CatalogSyncResult, SelectionCatalogItem } from './selection-catalog.models';

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SelectionCatalogService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  list(query = '') {
    return this.http.get<ApiResponse<SelectionCatalogItem[]>>(`${this.apiUrl}/catalogo-selecciones`, { params: query ? { q: query } : {} });
  }

  syncFifaRanking() {
    return this.http.post<CatalogSyncResult>(`${this.apiUrl}/catalogo-selecciones/sincronizar-ranking`, {});
  }
}
