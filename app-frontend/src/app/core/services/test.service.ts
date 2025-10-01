import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TestResponse {
  message: string;
  timestamp: string;
  status: string;
  user?: string;
}

export interface HealthResponse {
  status: string;
  backend: string;
  java: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private readonly API_URL = environment.apiUrl + '/api/test';
  private http = inject(HttpClient);

  testHello(): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.API_URL}/hello`);
  }

  testSecure(): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.API_URL}/secure`);
  }

  healthCheck(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.API_URL}/health`);
  }

  echo(data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/echo`, data);
  }
}
