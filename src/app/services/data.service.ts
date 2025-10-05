import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  // Return observable array of documents from a collection
  collection$<T = any>(name: string): Observable<T[]> {
    // IMPLEMENT: read from Firestore collection `name` and map to array
    // Example (modular SDK): collection(getFirestore(), name) + getDocs + map
    return of([]); // placeholder
  }
}