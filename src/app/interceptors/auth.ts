import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authReq = req.clone({
      setHeaders: { Authorization: 'Bearer token' }
    });
    return next.handle(authReq);
  }
}
// export class AuthInterceptor  implements HttpInterceptor {
//   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     const clonedReq = req.clone({
//       setHeaders: {
//         Authorization: "Bearer Laxman"
//       }
//     })
     
//     return next.handle(clonedReq).pipe(
//       catchError((error: HttpErrorResponse) => {
//         console.error('HTTP error caught in interceptor:', error);

//         if (error.status === 401) {
//           // handle unauthorized errors (e.g., redirect to login)
//           console.warn('Unauthorized! Redirecting to login...');
//           // redirect logic here
//         }
//         return throwError(() => error)
//       })
//     )
//   }
// }
