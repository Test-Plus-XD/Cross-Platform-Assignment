// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyCsVCZW7tF7ScW4e2SBdYtSQrl_GrK4zBk",
    authDomain: "cross-platform-assignmen-b97cc.firebaseapp.com",
    projectId: "cross-platform-assignmen-b97cc",
    storageBucket: "cross-platform-assignmen-b97cc.firebasestorage.app",
    messagingSenderId: "937491674619",
    appId: "1:937491674619:web:81eb1b44453eacdf3a475e",
    measurementId: "G-FQEV6WSNPC"
  },
  algoliaAppId: 'V9HMGL1VIZ',
  algoliaSearchKey: '563754aa2e02b4838af055fbf37f09b5',
  apiUrl: 'https://vercel-express-api-alpha.vercel.app',
  placeholderImageUrl: 'https://firebasestorage.googleapis.com/v0/b/cross-platform-assignmen-b97cc.firebasestorage.app/o/Placeholder.jpg?alt=media&token=068887ee-1ac3-4107-a15a-210b268b5183',
  //apiUrl: 'http://localhost:3000',
  socketUrl: 'https://railway-socket-production.up.railway.app/'
};